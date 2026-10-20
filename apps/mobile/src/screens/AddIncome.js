import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { formatMoney, categoryColor } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { allocateIncome } from "../domain/allocate";
import { currentPeriod, periodLabel, shiftPeriod } from "../lib/period";

export default function AddIncome({
  rules = [], initialPeriod, period, incomes = [], sources = [], sourceTotals = [],
  sourceLifetime = [], onSaveIncome, onAddSource, onDeleteIncome, scrollToTop, go,
}) {
  const { mode } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  const [sourceId, setSourceId] = useState(null);
  const [newSource, setNewSource] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmId, setConfirmId] = useState(null);
  // Set while correcting a mistyped entry: saving replaces it instead of adding.
  const [editingId, setEditingId] = useState(null);
  // Income is recorded into the month you are looking at, not blindly into today.
  const [incomePeriod, setIncomePeriod] = useState(initialPeriod ?? currentPeriod());

  const major = Number(val.replace(/[^0-9.]/g, "")) || 0;
  const minor = Math.round(major * 100);

  let split = [];
  try { split = rules.length ? allocateIncome(minor, rules) : []; } catch { split = []; }
  const label = (p) => (p.kind === "living" ? "Spendable (Living)" : p.name);
  const isCurrent = incomePeriod === currentPeriod();
  const deductions = rules.filter((r) => r.kind !== "living");
  const livingPct = rules.find((r) => r.kind === "living")?.percent ?? 0;

  const chosen = sources.find((s) => s.id === sourceId) ?? null;
  const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] ?? 0), 0);
  const monthTotal = sum(sourceTotals, "totalMinor");

  // Load a past entry back into the form so a typo is two taps to fix.
  const refill = (e) => {
    setVal(String((e.amountMinor ?? 0) / 100));
    setNote(e.note ?? "");
    setSourceId(e.sourceId ?? null);
    setIncomePeriod(e.period);
    setEditingId(e.id);
    setConfirmId(null);
    scrollToTop?.();
  };

  const save = async () => {
    if (minor <= 0 || busy) return;
    setBusy(true);
    try {
      // Add the corrected entry first: if this fails, the original is still there.
      await onSaveIncome({
        amountMinor: minor,
        period: incomePeriod,
        sourceId,
        note: note.trim() || null,
      });
      if (editingId) await onDeleteIncome(editingId);
      setVal("");
      setNote("");
      setEditingId(null);
    } finally { setBusy(false); }
  };

  return (
    <View>
      <Text style={s.h}>Add income</Text>
      <Text style={s.m}>
        Deductions are taken straight away, from every source:{" "}
        {deductions.map((r) => `${r.name} ${r.percent}%`).join(" · ")}. The remaining {livingPct}% is the
        money you manage that month.
      </Text>

      <Text style={s.label}>Where did it come from?</Text>
      <View style={s.chips}>
        {sources.filter((src) => src.id !== "other").map((src) => (
          <Pressable
            key={src.id}
            style={[s.chip, sourceId === src.id && s.chipOn]}
            onPress={() => setSourceId(sourceId === src.id ? null : src.id)}
          >
            <Text style={[s.chipT, sourceId === src.id && s.chipTOn]}>{src.name}</Text>
          </Pressable>
        ))}
        <Pressable
          style={[s.chip, showNew && s.chipOn]}
          onPress={() => setShowNew((v) => !v)}
        >
          <Text style={[s.chipT, showNew && s.chipTOn]}>＋ New source</Text>
        </Pressable>
      </View>
      {!sourceId && !showNew && (
        <Text style={s.due}>Not chosen yet — it will be recorded as “Other”.</Text>
      )}
      {showNew && (
        <View style={s.payRow}>
          <TextInput
            style={[s.in, s.inPay]}
            placeholder="e.g. Farming, Rent, Boda"
            value={newSource}
            onChangeText={setNewSource}
          />
          <Pressable
            style={[s.btnSmall, (!newSource.trim() || busy) && s.off]}
            disabled={!newSource.trim() || busy}
            onPress={async () => {
              setBusy(true);
              try {
                await onAddSource({ name: newSource.trim() });
                setNewSource("");
                setShowNew(false);
              } finally { setBusy(false); }
            }}
          >
            <Text style={s.bt}>Add</Text>
          </Pressable>
        </View>
      )}

      <Text style={s.label}>Income for</Text>
      <View style={s.monthRow}>
        <Pressable style={s.nav} onPress={() => setIncomePeriod(shiftPeriod(incomePeriod, -1))}>
          <Text style={s.navT}>‹</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={s.month}>{periodLabel(incomePeriod)}</Text>
          <Text style={s.due}>{isCurrent ? "This month" : "Past month"}</Text>
        </View>
        <Pressable
          style={[s.nav, isCurrent && s.off]}
          disabled={isCurrent}
          onPress={() => setIncomePeriod(shiftPeriod(incomePeriod, 1))}
        >
          <Text style={s.navT}>›</Text>
        </Pressable>
      </View>

      <Text style={s.label}>Amount received (BIF)</Text>
      <TextInput
        style={s.in}
        value={val}
        onChangeText={setVal}
        keyboardType="numeric"
        placeholder="100000"
      />

      <Text style={s.label}>What for? (optional)</Text>
      <TextInput
        style={s.inSmall}
        value={note}
        onChangeText={setNote}
        placeholder={chosen ? `e.g. ${chosen.name} — October` : "e.g. from my brother"}
      />

      {minor > 0 && (
        <View style={s.card}>
          <Text style={s.t}>Set aside now ─ {chosen ? chosen.name : "Other"}</Text>
          {split.map((p) => (
            <View key={p.id} style={s.row}>
              <View style={[s.dot, { backgroundColor: categoryColor(p.kind, mode) }]} />
              <Text style={[s.rName, p.kind === "living" && s.strong]}>{label(p)}</Text>
              <Text style={[s.rVal, p.kind === "living" && s.strong]}>
                {p.kind === "living" ? "" : "−"}{formatMoney(p.amountMinor)}
              </Text>
            </View>
          ))}
          <View style={s.hr} />
          <View style={s.row}>
            <Text style={[s.rName, s.strong]}>Total received</Text>
            <Text style={[s.rVal, s.strong]}>{formatMoney(minor)}</Text>
          </View>
          <Text style={s.due}>
            Each source is split the same way, so the essentials are always put aside — whoever paid.
          </Text>
        </View>
      )}

      {editingId && (
        <View style={s.fixBar}>
          <Text style={s.fixBarT}>
            Fixing an entry in {periodLabel(incomePeriod)} — saving replaces it, so the old one is removed
            and nothing is counted twice.
          </Text>
          <Pressable onPress={() => setEditingId(null)} hitSlop={8}>
            <Text style={s.fixBarX}>Cancel fix</Text>
          </Pressable>
        </View>
      )}

      <Pressable
        disabled={busy || minor <= 0}
        style={[s.btn, (busy || minor <= 0) && s.off]}
        onPress={save}
      >
        <Text style={s.bt}>
          {busy
            ? "Saving…"
            : editingId
              ? `Save correction to ${periodLabel(incomePeriod)}`
              : `Save income to ${periodLabel(incomePeriod)}`}
        </Text>
      </Pressable>

      {/* -------------------------------------------------- the record */}
      <Text style={s.section}>Where {periodLabel(period)} came from</Text>
      {sourceTotals.length === 0 && (
        <Text style={s.m}>No income recorded in {periodLabel(period)} yet.</Text>
      )}
      {sourceTotals.length > 0 && (
        <View style={s.card}>
          {sourceTotals.map((r) => (
            <View key={r.sourceId} style={s.row}>
              <Text style={s.rName}>
                {r.sourceName}{" "}
                <Text style={s.due}>({r.count} {r.count === 1 ? "entry" : "entries"})</Text>
              </Text>
              <Text style={s.rVal}>{formatMoney(r.totalMinor)}</Text>
            </View>
          ))}
          <View style={s.hr} />
          <View style={s.row}>
            <Text style={[s.rName, s.strong]}>Total in</Text>
            <Text style={[s.rVal, s.strong]}>{formatMoney(monthTotal)}</Text>
          </View>
          {deductions.map((r) => (
            <View key={r.id} style={s.row}>
              <Text style={s.rName}>Set aside — {r.name} ({r.percent}%)</Text>
              <Text style={s.rVal}>
                {formatMoney(sum(sourceTotals, {
                  tithe: "titheMinor", saving: "savingsMinor",
                  emergency: "emergencyMinor", community: "communityMinor",
                }[r.kind]))}
              </Text>
            </View>
          ))}
          <View style={s.row}>
            <Text style={[s.rName, s.strong]}>Spendable</Text>
            <Text style={[s.rVal, s.strong]}>{formatMoney(sum(sourceTotals, "spendableMinor"))}</Text>
          </View>
        </View>
      )}

      {incomes.length > 0 && (
        <>
          <Text style={s.section}>Entries in {periodLabel(period)}</Text>
          <Text style={s.due}>Tap an entry to fix it. ✕ removes it.</Text>
          {incomes.map((e) => (
            <View key={e.id} style={[s.entry, editingId === e.id && s.entryOn]}>
              <View style={s.entryRow}>
                <Pressable style={s.entryTap} onPress={() => refill(e)}>
                  <Text style={s.lineT}>
                    {e.sourceName}
                    {editingId === e.id ? "  (fixing)" : ""}
                  </Text>
                  <Text style={s.due}>
                    {new Date(e.occurredAt).toLocaleDateString()}
                    {e.note ? ` • ${e.note}` : ""}
                  </Text>
                </Pressable>
                {confirmId === e.id ? (
                  <View style={s.entryActs}>
                    <Pressable hitSlop={8} onPress={() => setConfirmId(null)}>
                      <Text style={s.cancelT}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={async () => {
                        await onDeleteIncome(e.id);
                        setConfirmId(null);
                      }}
                    >
                      <Text style={s.removeT}>Remove</Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={s.entryActs}>
                    <Pressable hitSlop={8} onPress={() => refill(e)}>
                      <Text style={s.fixT}>Fix</Text>
                    </Pressable>
                    <Pressable hitSlop={8} onPress={() => setConfirmId(e.id)}>
                      <Text style={s.delT}>✕</Text>
                    </Pressable>
                  </View>
                )}
                <Text style={s.moneyBig2}>+{formatMoney(e.amountMinor)}</Text>
              </View>
              {confirmId === e.id && (
                <Text style={s.warnT}>
                  Removes {formatMoney(e.amountMinor)} and un-sets{" "}
                  {formatMoney(e.titheMinor)} tithes · {formatMoney(e.savingsMinor)} savings ·{" "}
                  {formatMoney(e.emergencyMinor)} emergency · {formatMoney(e.communityMinor)} community.
                  {" "}Available for expenditure drops by {formatMoney(e.spendableMinor)}.
                </Text>
              )}
            </View>
          ))}
        </>
      )}

      {sourceLifetime.length > 0 && (
        <>
          <Text style={s.section}>All time by source</Text>
          <View style={s.card}>
            {sourceLifetime.map((r) => (
              <View key={r.sourceId} style={s.row}>
                <Text style={s.rName}>
                  {r.sourceName}{" "}
                  <Text style={s.due}>({r.count})</Text>
                </Text>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={s.rVal}>{formatMoney(r.totalMinor)}</Text>
                  <Text style={s.due}>tithes {formatMoney(r.titheMinor)}</Text>
                </View>
              </View>
            ))}
          </View>
        </>
      )}

      <Pressable style={s.btnGhost} onPress={() => go("dash")}>
        <Text style={s.btGhost}>Back to my month</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c) => ({
  h: { fontSize: 20, fontWeight: "600" },
  m: { color: c.text2, marginTop: 4 },
  section: { fontSize: 16, fontWeight: "700", marginTop: 26 },
  label: { color: c.text2, marginTop: 14 },
  due: { color: c.text2, fontSize: 12 },
  in: { height: 52, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 20, marginTop: 6, fontVariant: ["tabular-nums"], backgroundColor: c.surface },
  inSmall: { height: 46, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 6, backgroundColor: c.surface },
  inPay: { flex: 1, marginTop: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: { borderWidth: 1, borderColor: c.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginRight: 6, marginBottom: 6, backgroundColor: c.surface },
  chipOn: { backgroundColor: c.primary, borderColor: c.primary },
  chipT: { color: c.text, fontSize: 13 },
  chipTOn: { color: "#fff", fontWeight: "700" },
  payRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  btnSmall: { backgroundColor: c.primary, borderRadius: 12, height: 46, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  nav: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
  navT: { fontSize: 22, color: c.text },
  month: { fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 12 },
  t: { fontWeight: "600", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  rName: { flex: 1, color: c.text2 },
  rVal: { fontVariant: ["tabular-nums"], color: c.text2 },
  strong: { color: c.text, fontWeight: "700" },
  hr: { height: 1, backgroundColor: c.border, marginVertical: 4 },
  btn: { backgroundColor: c.primary, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 16 },
  btnGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 24, backgroundColor: c.surface },
  btGhost: { color: c.text, fontWeight: "700" },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border },
  lineT: { fontWeight: "600" },
  moneyBig2: { fontVariant: ["tabular-nums"], fontWeight: "700", color: c.primary },
  entry: { borderBottomWidth: 1, borderColor: c.border, paddingVertical: 8 },
  entryOn: { backgroundColor: c.surface, borderRadius: 12, paddingHorizontal: 8 },
  entryRow: { flexDirection: "row", alignItems: "center" },
  entryTap: { flex: 1, paddingVertical: 4, paddingRight: 8 },
  entryActs: { flexDirection: "row", alignItems: "center", marginRight: 10 },
  fixT: { color: c.info, fontWeight: "700", fontSize: 13, marginRight: 14 },
  delT: { color: c.danger, fontWeight: "700", fontSize: 15 },
  cancelT: { color: c.text2, fontWeight: "700", fontSize: 13, marginRight: 14 },
  removeT: { color: c.danger, fontWeight: "700", fontSize: 13 },
  warnT: { color: c.danger, fontSize: 12, marginTop: 6, lineHeight: 17 },
  fixBar: { flexDirection: "row", alignItems: "center", backgroundColor: "#EFF6FF", borderWidth: 1, borderColor: "#BFDBFE", borderRadius: 12, padding: 10, marginTop: 14 },
  fixBarT: { flex: 1, color: c.text, fontSize: 12, lineHeight: 17 },
  fixBarX: { color: c.info, fontWeight: "700", fontSize: 12, paddingLeft: 10 },
});
