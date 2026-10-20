import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, ActivityIndicator } from "react-native";
import { formatMoney } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { saveBackup, pickBackup, restoreBackup, lastBackup } from "../lib/backup";
import { sendOtp, signInWithOtp, getSession, logout, getBaseUrl, setBaseUrl, health } from "../lib/api";
import { syncNow } from "../lib/sync";

export default function Settings({ online, setOnline, pending, refresh, lifetime, rules = [], onSaveRules, onShowIntro, onReset }) {
  const { mode, toggle } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("idle"); // idle | otp-sent
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [lastSync, setLastSync] = useState(0);
  const [serverUrl, setServerUrl] = useState("");
  const [urlStatus, setUrlStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);
  const [pct, setPct] = useState({});
  const [rulesMsg, setRulesMsg] = useState("");
  const [backupMsg, setBackupMsg] = useState("");
  const [lastSaved, setLastSaved] = useState("");
  const [restore, setRestore] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => { getBaseUrl().then(setServerUrl); }, []);
  useEffect(() => { lastBackup().then(setLastSaved); }, []);

  // Take the stored percentages into the boxes; a refresh after saving re-syncs them.
  useEffect(() => {
    const next = {};
    for (const r of rules) if (r.kind !== "living") next[r.id] = String(r.percent);
    setPct(next);
  }, [rules]);

  const fixed = rules.filter((r) => r.kind !== "living");
  const pctOf = (kind) => rules.find((r) => r.kind === kind)?.percent ?? 0;
  const asInt = (v) => Math.round(Number(String(v ?? "").replace(/[^0-9]/g, ""))) || 0;
  const deducted = fixed.reduce((a, r) => a + asInt(pct[r.id]), 0);
  const spendablePct = 100 - deducted;
  const pctValid = deducted <= 100;

  const setPctValue = (id, v) =>
    setPct((p) => ({ ...p, [id]: v.replace(/[^0-9]/g, "").slice(0, 3) }));

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <View>
      <Text style={s.h}>Settings</Text>

      <View style={s.card}>
        <Text style={s.t}>Saved on this phone</Text>
        <Text style={s.m}>
          Your budget lives on this device and works with no internet. Nothing leaves the phone unless
          you turn on Cloud Sync below.
        </Text>
        {pending > 0 && (
          <Text style={s.m}>
            {pending} change{pending === 1 ? "" : "s"} waiting to reach your PC.
          </Text>
        )}
      </View>

      <View style={s.card}>
        <Text style={s.t}>Backup</Text>
        <Text style={s.m}>
          One file with everything — income, expenses, giving, your categories. Mail it to yourself, save
          it to Drive, or copy it to a computer. Keep it somewhere that is not this phone.
        </Text>

        <Pressable
          style={[s.btn, busy && s.off]}
          disabled={busy}
          onPress={() => run(async () => {
            const res = await saveBackup();
            setBackupMsg(res.shareable
              ? `${res.name} is ready — choose where to send it.`
              : `Saved to ${res.name} on this phone.`);
            setLastSaved(await lastBackup());
          })}
        >
          <Text style={s.bt}>Back up now</Text>
        </Pressable>

        <Pressable
          style={[s.btnGhost, busy && s.off]}
          disabled={busy}
          onPress={() => run(async () => {
            const picked = await pickBackup();
            if (picked) { setRestore(picked); setBackupMsg(""); }
          })}
        >
          <Text style={s.btGhost}>Restore from a backup</Text>
        </Pressable>

        {!!lastSaved && <Text style={s.m}>Last backup: {lastSaved}</Text>}
        {!!backupMsg && <Text style={s.m}>{backupMsg}</Text>}
      </View>

      {!!restore && (
        <View style={s.card}>
          <Text style={s.t}>Replace this phone's records?</Text>
          <Text style={s.m}>{restore.name} — {restore.entries} entries, written {restore.when}.</Text>
          <Text style={s.m}>
            Everything on this phone is replaced by the file. This cannot be undone.
          </Text>
          <Pressable
            style={[s.btnDanger, busy && s.off]}
            disabled={busy}
            onPress={() => run(async () => {
              const name = restore.name;
              const res = await restoreBackup(restore.data);
              setRestore(null);
              setLastSaved(await lastBackup());
              setBackupMsg(`Restored ${res.rows} rows from ${name}.`);
              await refresh();
            })}
          >
            <Text style={s.bt}>Replace everything</Text>
          </Pressable>
          <Pressable style={s.btnGhost} disabled={busy} onPress={() => setRestore(null)}>
            <Text style={s.btGhost}>Keep what I have</Text>
          </Pressable>
        </View>
      )}

      <View style={s.card}>
        <Text style={s.t}>Appearance</Text>
        <View style={s.kv}>
          <Text style={s.k}>Dark theme</Text>
          <Pressable
            style={[s.switch, mode === "dark" && s.switchOn]}
            onPress={toggle}
            accessibilityRole="switch"
            accessibilityState={{ checked: mode === "dark" }}
          >
            <View style={[s.knob, mode === "dark" && s.knobOn]} />
          </Pressable>
        </View>
        <Text style={s.m}>
          {mode === "dark"
            ? "Dark is on — easier on the eye at night."
            : "Light is on. Switch to dark for evening use."}
        </Text>
      </View>

      {lifetime && (
        <View style={s.card}>
          <Text style={s.t}>All time</Text>
          <KV k="Total income" v={formatMoney(lifetime.incomeMinor)} />
          <KV k="Total spent" v={formatMoney(lifetime.spentMinor)} />
          <KV k="Available for expenditure (all time)" v={formatMoney(lifetime.spendableLeft)} />
          <KV k={`Tithes given (${pctOf("tithe")}%)`} v={formatMoney(lifetime.tithePaid)} />
          <KV k={`Savings given (${pctOf("saving")}%)`} v={formatMoney(lifetime.savingsGiven)} />
          <KV k={`Emergency fund (${pctOf("emergency")}%)`} v={formatMoney(lifetime.emergencyGiven)} />
          <KV k={`Community given (${pctOf("community")}%)`} v={formatMoney(lifetime.communityGiven)} />
          <KV k="Community remaining" v={formatMoney(lifetime.communityRemaining)} />
          <KV k="Community — Ceremonies" v={formatMoney(lifetime.communityByCategory?.ceremonies ?? 0)} />
          <KV k="Community — Society" v={formatMoney(lifetime.communityByCategory?.society ?? 0)} />
        </View>
      )}

      <View style={s.card}>
        <Text style={s.t}>Deduction percentages</Text>
        <Text style={s.m}>
          Taken off every new income, whatever the source. Existing entries keep the split they were
          given, so changing this never rewrites the past.
        </Text>

        {fixed.map((r) => (
          <View key={r.id} style={s.pctRow}>
            <Text style={s.pctName}>{r.name}</Text>
            <TextInput
              style={s.pctIn}
              keyboardType="numeric"
              maxLength={3}
              value={pct[r.id] ?? ""}
              onChangeText={(v) => setPctValue(r.id, v)}
            />
            <Text style={s.pctSign}>%</Text>
          </View>
        ))}

        <View style={s.hr} />
        <View style={s.kv}>
          <Text style={s.k}>Spendable (Living)</Text>
          <Text style={[s.v, !pctValid && s.bad]}>{spendablePct}%</Text>
        </View>
        <Text style={s.m}>
          {pctValid
            ? `The remaining ${spendablePct}% is the money you manage each month.`
            : `That is ${deducted}% — the deductions must leave something to spend.`}
        </Text>

        <Pressable
          style={[s.btn, (busy || !pctValid) && s.off]}
          disabled={busy || !pctValid}
          onPress={() => run(async () => {
            const res = await onSaveRules?.(pct);
            if (!res) return; // the red banner names the problem
            setRulesMsg(`Saved — new income keeps ${res.spendable}% to spend.`);
          })}
        >
          <Text style={s.bt}>Save percentages</Text>
        </Pressable>
        <Pressable
          style={s.linkRow}
          disabled={busy}
          onPress={() => setPct(Object.fromEntries(
            fixed.map((r) => [r.id, String({ tithe: 10, saving: 15, emergency: 5, community: 5 }[r.kind] ?? 0)])
          ))}
        >
          <Text style={s.linkT}>Reset to 10 / 15 / 5 / 5</Text>
        </Pressable>
        {!!rulesMsg && <Text style={s.m}>{rulesMsg}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.t}>Cloud Sync — {online ? "On" : "Off"}</Text>
        <Text style={s.m}>
          Optional. A second copy in your own database on your PC, over your WiFi. Everything works the
          same without it — this is for keeping two devices in step, not for keeping a backup.
        </Text>

        <Pressable style={s.linkRow} onPress={() => setShowAdvanced((v) => !v)}>
          <Text style={s.linkT}>
            {showAdvanced ? "Hide connection details" : "Connection details"}
          </Text>
        </Pressable>

        {showAdvanced && (
          <>
            <Text style={s.m}>
              Your PC's address on this WiFi. Only change it if the address moved — no rebuild needed.
              The current one is {serverUrl || "not set"}.
            </Text>
            <TextInput
              style={s.in}
              autoCapitalize="none"
              keyboardType="url"
              placeholder="http://192.168.10.163:3000"
              value={serverUrl}
              onChangeText={setServerUrl}
            />
            <Pressable
              style={[s.btnGhost, busy && s.off]}
              disabled={busy}
              onPress={() => run(async () => {
                const clean = await setBaseUrl(serverUrl);
                setServerUrl(clean);
                const r = await health(clean);
                setUrlStatus(r.ok ? "Your PC answered." : "No answer from that address.");
              })}
            >
              <Text style={s.btGhost}>Save & test</Text>
            </Pressable>
            {!!urlStatus && <Text style={s.m}>{urlStatus}</Text>}
          </>
        )}

        {!online && stage === "idle" && (
          <>
            <TextInput
              style={s.in}
              placeholder="you@example.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
            <Pressable
              style={[s.btn, busy && s.off]}
              disabled={busy || !email.includes("@")}
              onPress={() => run(async () => {
                const r = await sendOtp(email.trim());
                if (r.ok) {
                  setStage("otp-sent");
                  setStatus("Code created. Because the server is yours, the code appears in its window on the PC.");
                } else setStatus("Could not reach your PC. Check that it is on and on the same WiFi.");
              })}
            >
              <Text style={s.bt}>Send sign-in code</Text>
            </Pressable>
          </>
        )}

        {!online && stage === "otp-sent" && (
          <>
            <TextInput style={s.in} placeholder="6-digit code" keyboardType="number-pad" value={otp} onChangeText={setOtp} />
            <Pressable
              style={[s.btn, busy && s.off]}
              disabled={busy || otp.length < 4}
              onPress={() => run(async () => {
                const r = await signInWithOtp(email.trim(), otp.trim(), email.split("@")[0]);
                if (r.ok) {
                  const s2 = await getSession();
                  const who = s2.data?.user?.email ?? email;
                  setOnline(true);
                  setStatus(`Signed in as ${who}. Local rows will sync.`);
                  const res = await syncNow(lastSync);
                  setLastSync(res.at ?? lastSync);
                  await refresh();
                } else setStatus("That code did not work. Ask for a new one.");
              })}
            >
              <Text style={s.bt}>Sign in</Text>
            </Pressable>
          </>
        )}

        {online && (
          <>
            <Pressable style={[s.btn, busy && s.off]} disabled={busy} onPress={() => run(async () => {
              const res = await syncNow(lastSync);
              if (res.state === "synced") {
                setLastSync(res.at ?? lastSync);
                const parts = [`${res.applied} sent`, `${res.pulled} received`];
                if (res.conflicts) parts.push(`${res.conflicts} kept from the PC`);
                setStatus(`Synced — ${parts.join(", ")}.`);
              } else if (res.state === "offline") {
                setStatus("Your PC did not answer. Nothing was lost — the changes wait here.");
              } else setStatus(`Sync did not finish (${res.state}).`);
              await refresh();
            })}>
              <Text style={s.bt}>Sync now</Text>
            </Pressable>
            <Pressable style={[s.btnGhost]} disabled={busy} onPress={() => run(async () => {
              await logout();
              setOnline(false); setStage("idle"); setOtp("");
              setStatus("Signed out — local data kept.");
              await refresh();
            })}>
              <Text style={s.btGhost}>Sign out</Text>
            </Pressable>
          </>
        )}

        {busy && <ActivityIndicator style={{ marginTop: 8 }} />}
        {!!status && <Text style={s.m}>{status}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.t}>How the app works</Text>
        <Text style={s.m}>The three-screen explanation of how income is divided, shown once on first launch.</Text>
        <Pressable style={s.btnGhost} disabled={busy} onPress={() => onShowIntro?.()}>
          <Text style={s.btGhost}>Show the intro again</Text>
        </Pressable>
      </View>

      <View style={s.card}>
        <Text style={s.t}>Reset local data</Text>
        <Text style={s.m}>Deletes everything on this device and re-seeds the default bills and categories.</Text>
        <Pressable
          style={[s.btnDanger, busy && s.off]}
          disabled={busy}
          onPress={() => {
            if (!confirmReset) { setConfirmReset(true); setStatus("Tap again to confirm the reset."); return; }
            run(async () => {
              await onReset?.();
              setConfirmReset(false);
              setStatus("Local data reset.");
            });
          }}
        >
          <Text style={s.bt}>{confirmReset ? "Tap again to confirm" : "Reset local data"}</Text>
        </Pressable>
      </View>

      {!!lastSync && <Text style={s.m}>Last sync: {new Date(lastSync).toLocaleTimeString()}</Text>}
    </View>
  );
}

function KV({ k, v }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.kv}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  h: { fontSize: 20, fontWeight: "600" },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" },
  m: { color: c.text2, marginTop: 2 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  k: { color: c.text2, flexShrink: 1, paddingRight: 8 },
  v: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  in: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: c.surface },
  btn: { backgroundColor: c.primary, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  btnDanger: { backgroundColor: c.danger, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btGhost: { color: c.text, fontWeight: "600" },
  pctRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  pctName: { flex: 1, color: c.text },
  pctIn: { width: 64, height: 44, borderWidth: 1, borderColor: c.border, borderRadius: 10, paddingHorizontal: 10, textAlign: "right", backgroundColor: c.surface2, fontVariant: ["tabular-nums"], fontWeight: "700" },
  pctSign: { width: 22, textAlign: "right", color: c.text2 },
  hr: { height: 1, backgroundColor: c.border, marginTop: 10 },
  bad: { color: c.danger },
  linkRow: { alignItems: "center", marginTop: 10 },
  linkT: { color: c.info, fontWeight: "600" },
  switch: { width: 52, height: 30, borderRadius: 999, backgroundColor: c.surface2, borderWidth: 1, borderColor: c.border, padding: 3 },
  switchOn: { backgroundColor: c.primary, borderColor: c.primary },
  knob: { width: 22, height: 22, borderRadius: 999, backgroundColor: c.text3 },
  knobOn: { backgroundColor: "#fff", alignSelf: "flex-end" },
});
