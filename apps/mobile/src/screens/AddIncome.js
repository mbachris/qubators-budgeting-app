import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light, formatMoney, categoryColor } from "../theme/tokens";
import { allocateIncome } from "../domain/allocate";
import { currentPeriod, periodLabel, shiftPeriod } from "../lib/period";

export default function AddIncome({
  rules = [], initialPeriod, period, incomes = [], sources = [], sourceTotals = [],
  sourceLifetime = [], onSaveIncome, onAddSource, go,
}) {
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  const [sourceId, setSourceId] = useState(null);
  const [newSource, setNewSource] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [busy, setBusy] = useState(false);
  // Income is recorded into the month you are looking at, not blindly into today.
  const [incomePeriod, setIncomePeriod] = useState(initialPeriod ?? currentPeriod());

  const major = Number(val.replace(/[^0-9.]/g, "")) || 0;
  const minor = Math.round(major * 100);

  let split = [];
  try { split = rules.length ? allocateIncome(minor, rules) : []; } catch { split = []; }
  const label = (p) => (p.kind === "living" ? "Spendable (Living)" : p.name);
  const isCurrent = incomePeriod === currentPeriod();

  const chosen = sources.find((s) => s.id === sourceId) ?? null;
  const sum = (rows, key) => rows.reduce((a, r) => a + (r[key] ?? 0), 0);
  const monthTotal = sum(sourceTotals, "totalMinor");

  return (
    <View>
      <Text style={s.h}>Add income</Text>
      <Text style={s.m}>
        Deductions are taken straight away, from every source: tithes 10%, savings 15%, emergency 5%,
        community 5%. The remaining 65% is the money you manage that month.
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
              <View style={[s.dot, { backgroundColor: categoryColor(p.kind) }]} />
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

      <Pressable
        disabled={busy || minor <= 0}
        style={[s.btn, (busy || minor <= 0) && s.off]}
        onPress={async () => {
          if (minor <= 0) return;
          setBusy(true);
          try {
            await onSaveIncome({
              amountMinor: minor,
              period: incomePeriod,
              sourceId,
              note: note.trim() || null,
            });
            setVal("");
            setNote("");
          } finally { setBusy(false); }
        }}
      >
        <Text style={s.bt}>{busy ? "Saving…" : `Save income to ${periodLabel(incomePeriod)}`}</Text>
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
          <View style={s.row}>
            <Text style={s.rName}>Set aside — tithes 10%</Text>
            <Text style={s.rVal}>{formatMoney(sum(sourceTotals, "titheMinor"))}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rName}>Set aside — savings 15%</Text>
            <Text style={s.rVal}>{formatMoney(sum(sourceTotals, "savingsMinor"))}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rName}>Set aside — emergency 5%</Text>
            <Text style={s.rVal}>{formatMoney(sum(sourceTotals, "emergencyMinor"))}</Text>
          </View>
          <View style={s.row}>
            <Text style={s.rName}>Set aside — community 5%</Text>
            <Text style={s.rVal}>{formatMoney(sum(sourceTotals, "communityMinor"))}</Text>
          </View>
          <View style={s.row}>
            <Text style={[s.rName, s.strong]}>Spendable</Text>
            <Text style={[s.rVal, s.strong]}>{formatMoney(sum(sourceTotals, "spendableMinor"))}</Text>
          </View>
        </View>
      )}

      {incomes.length > 0 && (
        <>
          <Text style={s.section}>Entries in {periodLabel(period)}</Text>
          {incomes.map((e) => (
            <View key={e.id} style={s.line}>
              <View style={{ flex: 1, paddingRight: 8 }}>
                <Text style={s.lineT}>{e.sourceName}</Text>
                <Text style={s.due}>
                  {new Date(e.occurredAt).toLocaleDateString()}
                  {e.note ? ` • ${e.note}` : ""}
                </Text>
              </View>
              <Text style={s.moneyBig2}>+{formatMoney(e.amountMinor)}</Text>
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

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  m: { color: light.text2, marginTop: 4 },
  section: { fontSize: 16, fontWeight: "700", marginTop: 26 },
  label: { color: light.text2, marginTop: 14 },
  due: { color: light.text2, fontSize: 12 },
  in: { height: 52, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 20, marginTop: 6, fontVariant: ["tabular-nums"], backgroundColor: light.surface },
  inSmall: { height: 46, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 6, backgroundColor: light.surface },
  inPay: { flex: 1, marginTop: 0 },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: { borderWidth: 1, borderColor: light.border, borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9, marginRight: 6, marginBottom: 6, backgroundColor: light.surface },
  chipOn: { backgroundColor: light.primary, borderColor: light.primary },
  chipT: { color: light.text, fontSize: 13 },
  chipTOn: { color: "#fff", fontWeight: "700" },
  payRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  btnSmall: { backgroundColor: light.primary, borderRadius: 12, height: 46, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  nav: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: light.border, alignItems: "center", justifyContent: "center", backgroundColor: light.surface },
  navT: { fontSize: 22, color: light.text },
  month: { fontSize: 18, fontWeight: "700" },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 12 },
  t: { fontWeight: "600", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  rName: { flex: 1, color: light.text2 },
  rVal: { fontVariant: ["tabular-nums"], color: light.text2 },
  strong: { color: light.text, fontWeight: "700" },
  hr: { height: 1, backgroundColor: light.border, marginVertical: 4 },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 16 },
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 24, backgroundColor: light.surface },
  btGhost: { color: light.text, fontWeight: "700" },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: light.border },
  lineT: { fontWeight: "600" },
  moneyBig2: { fontVariant: ["tabular-nums"], fontWeight: "700", color: light.primary },
});
