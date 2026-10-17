import { View, Text, StyleSheet } from "react-native";
import { light, categoryColor } from "../theme/tokens";

export default function Dashboard({ incomes, categories, pending = 0, online }) {
  const total = incomes.reduce((a, i) => a + i.amountMinor, 0);
  const rules = categories.length ? categories : [];
  const rows = rules.map((r) => ({
    ...r,
    amountMinor: Math.floor((total * r.percent) / 100),
  }));
  const month = new Date().toLocaleString("en", { month: "long" });
  const badge = !online ? "Local Vault • On this device" : pending > 0 ? `Cloud Sync • Pending ${pending}` : "Cloud Sync • Synced";
  return (
    <View>
      <Text style={s.badge}>{badge}</Text>
      <Text style={s.h}>{month}</Text>
      <Text style={s.money}>{(total / 100).toLocaleString()} BIF</Text>
      {rows.map((r) => (
        <View key={r.id} style={s.card}>
          <Text style={s.t}>{r.name}</Text>
          <Text style={s.m}>{(r.amountMinor / 100).toLocaleString()} BIF • {r.percent}%</Text>
          <View style={s.bar}>
            <View style={[s.fill, { width: `${Math.min(r.percent, 100)}%`, backgroundColor: categoryColor(r.kind) }]} />
          </View>
        </View>
      ))}
      {total === 0 && <Text style={s.sub}>Add income to see the 10 / 15 / 5 / 70 split.</Text>}
      {incomes.length > 0 && <Text style={s.sub}>{incomes.length} income entr{incomes.length === 1 ? "y" : "ies"} stored on this device.</Text>}
    </View>
  );
}
const s = StyleSheet.create({
  badge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: "700" },
  h: { fontSize: 20, fontWeight: "600", marginTop: 12 },
  money: { fontSize: 28, fontWeight: "700", fontVariant: ["tabular-nums"], marginVertical: 8 },
  card: { backgroundColor: light.surface, borderColor: light.border, borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" }, m: { fontVariant: ["tabular-nums"], color: light.text2 },
  bar: { height: 8, backgroundColor: light.surface2, borderRadius: 999, marginTop: 8 },
  fill: { height: 8, borderRadius: 999 },
  sub: { color: light.text2, marginTop: 12 },
});
