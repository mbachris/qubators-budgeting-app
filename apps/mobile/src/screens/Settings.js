import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { light, formatMoney } from "../theme/tokens";
import { exportAll } from "../db/repo";
import { sendOtp, signInWithOtp, getSession, logout, getBaseUrl, setBaseUrl, health } from "../lib/api";
import { syncNow } from "../lib/sync";

export default function Settings({ online, setOnline, pending, refresh, lifetime, rules = [], onReset }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [stage, setStage] = useState("idle"); // idle | otp-sent
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [lastSync, setLastSync] = useState(0);
  const [serverUrl, setServerUrl] = useState("");
  const [urlStatus, setUrlStatus] = useState("");
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => { getBaseUrl().then(setServerUrl); }, []);

  const run = async (fn) => {
    setBusy(true);
    try { await fn(); } finally { setBusy(false); }
  };

  return (
    <View>
      <Text style={s.h}>Settings</Text>

      <View style={s.card}>
        <Text style={s.t}>Local Vault — Always on</Text>
        <Text style={s.m}>On-device SQLite. Budgeting works offline, always.</Text>
        <Text style={s.m}>Pending uploads: {pending}</Text>
      </View>

      {lifetime && (
        <View style={s.card}>
          <Text style={s.t}>All time</Text>
          <KV k="Total income" v={formatMoney(lifetime.incomeMinor)} />
          <KV k="Total spent" v={formatMoney(lifetime.spentMinor)} />
          <KV k="Available for expenditure (all time)" v={formatMoney(lifetime.spendableLeft)} />
          <KV k="Tithes given (10%)" v={formatMoney(lifetime.tithePaid)} />
          <KV k="Savings given (15%)" v={formatMoney(lifetime.savingsGiven)} />
          <KV k="Emergency fund (5%)" v={formatMoney(lifetime.emergencyGiven)} />
          <KV k="Community given (5%)" v={formatMoney(lifetime.communityGiven)} />
          <KV k="Community remaining" v={formatMoney(lifetime.communityRemaining)} />
          <KV k="Community — Ceremonies" v={formatMoney(lifetime.communityByCategory?.ceremonies ?? 0)} />
          <KV k="Community — Society" v={formatMoney(lifetime.communityByCategory?.society ?? 0)} />
        </View>
      )}

      <View style={s.card}>
        <Text style={s.t}>Allocation rules</Text>
        {rules.map((r) => (
          <KV key={r.id} k={r.kind === "living" ? "Spendable (Living)" : r.name} v={`${r.percent}%`} />
        ))}
        <Text style={s.m}>Editing these comes with the customisation slice.</Text>
      </View>

      <View style={s.card}>
        <Text style={s.t}>Server URL</Text>
        <Text style={s.m}>Your PC's address on this WiFi. Change it when the IP changes — no rebuild needed.</Text>
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
            setUrlStatus(r.ok ? `Reachable — ${r.data?.service ?? "ok"}` : `Not reachable (${r.status || "network error"})`);
          })}
        >
          <Text style={s.btGhost}>Save & test</Text>
        </Pressable>
        {!!urlStatus && <Text style={s.m}>{urlStatus}</Text>}
      </View>

      <View style={s.card}>
        <Text style={s.t}>Cloud Sync — {online ? "On" : "Off"}</Text>
        <Text style={s.m}>{serverUrl || "…"}</Text>

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
                if (r.ok) { setStage("otp-sent"); setStatus("Code sent — check the server console for the OTP."); }
                else setStatus(`Failed (${r.status}). Is the server running?`);
              })}
            >
              <Text style={s.bt}>Send code</Text>
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
                } else setStatus(`Verify failed (${r.status}).`);
              })}
            >
              <Text style={s.bt}>Verify & sync</Text>
            </Pressable>
          </>
        )}

        {online && (
          <>
            <Pressable style={[s.btn, busy && s.off]} disabled={busy} onPress={() => run(async () => {
              const res = await syncNow(lastSync);
              if (res.state === "synced") {
                setLastSync(res.at ?? lastSync);
                setStatus(`Synced — pushed ${res.applied}, pulled ${res.pulled}, conflicts ${res.conflicts}.`);
              } else setStatus(`Sync state: ${res.state}`);
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

      <Pressable
        style={s.card}
        onPress={() => run(async () => {
          const data = await exportAll();
          setStatus(`Export built: ${data.income.length} income rows, ${data.expenses.length} expenses, ${data.payouts.length} payouts.`);
        })}
      >
        <Text style={s.t}>Backup / Export</Text>
        <Text style={s.m}>JSON snapshot of local data (R2 upload comes with the backup slice).</Text>
      </Pressable>

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
  return (
    <View style={s.kv}>
      <Text style={s.k}>{k}</Text>
      <Text style={s.v}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" },
  m: { color: light.text2, marginTop: 2 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 4 },
  k: { color: light.text2, flexShrink: 1, paddingRight: 8 },
  v: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  in: { height: 48, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: light.surface },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  btnDanger: { backgroundColor: light.danger, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 10 },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 44, alignItems: "center", justifyContent: "center", marginTop: 8 },
  btGhost: { color: light.text, fontWeight: "600" },
});
