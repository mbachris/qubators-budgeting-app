import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light, formatMoney } from "../theme/tokens";
import { periodLabel } from "../lib/period";
import { COMMUNITY_CATEGORIES } from "../db/schema";

export default function Community({ period, summary, lifetime, payouts = [], onGive, go }) {
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  const minor = Math.round((Number(amount.replace(/[^0-9.]/g, "")) || 0) * 100);
  const givenThisMonth = (id) =>
    payouts
      .filter((p) => p.period === period && (p.category ?? "society") === id)
      .reduce((a, p) => a + p.amountMinor, 0);

  return (
    <View>
      <Text style={s.h}>Community giving</Text>

      <View style={s.card}>
        <Text style={s.t}>Community Impact bucket (5%)</Text>
        <Text style={s.m}>
          Deducted from income in {periodLabel(period)}: {formatMoney(summary?.communityMinor ?? 0)}
        </Text>
        <Text style={s.m}>Remaining to give (all time): {formatMoney(lifetime?.communityRemaining ?? 0)}</Text>
        <Text style={s.m}>Given (all time): {formatMoney(lifetime?.communityGiven ?? 0)}</Text>
      </View>

      <Text style={s.section}>Amount to give (BIF)</Text>
      <TextInput style={s.in} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="5000" />
      {(lifetime?.communityRemaining ?? 0) > 0 && (
        <Pressable onPress={() => setAmount(String(lifetime.communityRemaining / 100))}>
          <Text style={s.link}>Use all remaining ({formatMoney(lifetime.communityRemaining)})</Text>
        </Pressable>
      )}

      {COMMUNITY_CATEGORIES.map((c) => (
        <View key={c.id} style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.t}>{c.name}</Text>
            <Text style={s.moneySmall}>this month {formatMoney(givenThisMonth(c.id))}</Text>
          </View>
          <Text style={s.m}>{c.hint}</Text>
          <Pressable
            style={[s.btn, (busy || minor <= 0) && s.off]}
            disabled={busy || minor <= 0}
            onPress={async () => {
              setBusy(true);
              try {
                await onGive({ category: c.id, projectId: null, amountMinor: minor, period });
                setMsg(`Recorded ${formatMoney(minor)} for ${c.name}.`);
                setAmount("");
              } finally { setBusy(false); }
            }}
          >
            <Text style={s.bt}>Give to {c.name}</Text>
          </Pressable>
        </View>
      ))}

      {!!msg && <Text style={s.sub}>{msg}</Text>}

      <Text style={s.section}>Recent gifts</Text>
      {payouts.length === 0 && <Text style={s.sub}>No gifts recorded yet.</Text>}
      {payouts.slice(0, 20).map((p) => (
        <View key={p.id} style={s.line}>
          <Text style={s.lineT}>
            {COMMUNITY_CATEGORIES.find((c) => c.id === (p.category ?? "society"))?.name ?? "Community"}
          </Text>
          <Text style={s.moneySmall}>{formatMoney(p.amountMinor)}</Text>
        </View>
      ))}

      <Pressable style={s.btnGhost} onPress={() => go("dash")}>
        <Text style={s.btGhost}>Back to my month</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", marginTop: 22 },
  m: { color: light.text2, marginTop: 2 },
  sub: { color: light.text2, marginTop: 8 },
  link: { color: light.info, marginTop: 8, fontWeight: "600" },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  t: { fontWeight: "600" },
  moneySmall: { fontVariant: ["tabular-nums"], fontWeight: "600", fontSize: 13 },
  in: { height: 48, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 6, backgroundColor: light.surface, fontVariant: ["tabular-nums"] },
  btn: { alignSelf: "flex-start", backgroundColor: light.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10 },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 20, backgroundColor: light.surface },
  btGhost: { color: light.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: light.border },
  lineT: { color: light.text2 },
});
