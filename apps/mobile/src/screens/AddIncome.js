import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light, formatMoney, categoryColor } from "../theme/tokens";
import { allocateIncome } from "../domain/allocate";
import { currentPeriod, periodLabel, shiftPeriod } from "../lib/period";

export default function AddIncome({ rules = [], initialPeriod, onSaveIncome, go }) {
  const [val, setVal] = useState("");
  const [busy, setBusy] = useState(false);
  // Income is recorded into the month you are looking at, not blindly into today.
  const [incomePeriod, setIncomePeriod] = useState(initialPeriod ?? currentPeriod());

  const major = Number(val.replace(/[^0-9.]/g, "")) || 0;
  const minor = Math.round(major * 100);

  let split = [];
  try { split = rules.length ? allocateIncome(minor, rules) : []; } catch { split = []; }
  const label = (p) => (p.kind === "living" ? "Spendable (Living)" : p.name);
  const isCurrent = incomePeriod === currentPeriod();

  return (
    <View>
      <Text style={s.h}>Add income</Text>
      <Text style={s.m}>
        Deductions are taken straight away. The remainder is the money you manage that month.
      </Text>

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

      {minor > 0 && (
        <View style={s.card}>
          <Text style={s.t}>Immediate split</Text>
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
        </View>
      )}

      <Pressable
        disabled={busy || minor <= 0}
        style={[s.btn, (busy || minor <= 0) && s.off]}
        onPress={async () => {
          if (minor <= 0) return;
          setBusy(true);
          try {
            await onSaveIncome({ amountMinor: minor, period: incomePeriod });
            setVal("");
            go("dash");
          } finally { setBusy(false); }
        }}
      >
        <Text style={s.bt}>{busy ? "Saving…" : `Save income to ${periodLabel(incomePeriod)}`}</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  m: { color: light.text2, marginTop: 4 },
  label: { color: light.text2, marginTop: 14 },
  in: { height: 52, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 20, marginTop: 6, fontVariant: ["tabular-nums"], backgroundColor: light.surface },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 6 },
  nav: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: light.border, alignItems: "center", justifyContent: "center", backgroundColor: light.surface },
  navT: { fontSize: 22, color: light.text },
  month: { fontSize: 18, fontWeight: "700" },
  due: { color: light.text2, fontSize: 12 },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 12 },
  t: { fontWeight: "600", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", paddingVertical: 6 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 8 },
  rName: { flex: 1, color: light.text2 },
  rVal: { fontVariant: ["tabular-nums"], color: light.text2 },
  strong: { color: light.text, fontWeight: "700" },
  hr: { height: 1, backgroundColor: light.border, marginVertical: 4 },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 52, alignItems: "center", justifyContent: "center", marginTop: 16 },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
});
