import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light } from "../theme/tokens";
import { addContribution } from "../db/repo";

export default function Community({ projects, refresh }) {
  const [amount, setAmount] = useState("1000");
  const [msg, setMsg] = useState("");
  const give = async (projectId) => {
    const minor = Math.round((Number(amount.replace(/[^0-9.]/g, "")) || 0) * 100);
    if (minor <= 0) return;
    await addContribution({ projectId, amountMinor: minor });
    await refresh();
    setMsg("Gift recorded locally. Syncs when Cloud Sync is on.");
  };
  return (
    <View>
      <Text style={s.h}>Community</Text>
      <Text style={s.label}>Amount to give (BIF)</Text>
      <TextInput style={s.in} value={amount} onChangeText={setAmount} keyboardType="numeric" />
      {projects.map((p) => {
        const pct = Math.min(100, Math.round((p.raisedMinor / p.goalMinor) * 100));
        return (
          <View key={p.id} style={s.card}>
            <Text style={s.t}>{p.name}</Text>
            <Text style={s.m}>
              goal {(p.goalMinor / 100).toLocaleString()} • raised {(p.raisedMinor / 100).toLocaleString()} ({pct}%)
            </Text>
            <View style={s.bar}><View style={[s.fill, { width: `${pct}%` }]} /></View>
            <Pressable style={s.btn} onPress={() => give(p.id)}>
              <Text style={s.bt}>Give</Text>
            </Pressable>
          </View>
        );
      })}
      {!!msg && <Text style={s.sub}>{msg}</Text>}
      <Text style={s.sub}>Local stub — verified community totals arrive with Cloud Sync.</Text>
    </View>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  label: { color: light.text2, marginTop: 12 },
  in: { height: 48, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 6 },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" }, m: { color: light.text2 },
  bar: { height: 8, backgroundColor: light.surface2, borderRadius: 999, marginTop: 8 },
  fill: { height: 8, backgroundColor: light.accent, borderRadius: 999 },
  btn: { alignSelf: "flex-start", backgroundColor: light.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10 },
  bt: { color: "#fff", fontWeight: "700" },
  sub: { color: light.text2, marginTop: 12 },
});
