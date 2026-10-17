import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light } from "../theme/tokens";
import { allocateIncome } from "../domain/allocate";

export default function AddIncome({ categories, onSaveIncome, go }) {
  const [val, setVal] = useState("100000");
  const [busy, setBusy] = useState(false);
  const major = Number(val.replace(/[^0-9.]/g, "")) || 0;
  const rules = categories.length ? categories : [];
  let rows = [];
  try { rows = rules.length ? allocateIncome(Math.round(major * 100), rules) : []; } catch { rows = []; }
  return (
    <View>
      <Text style={s.h}>Add income</Text>
      <TextInput style={s.in} value={val} onChangeText={setVal} keyboardType="numeric" placeholder="100000" />
      {rows.map((r) => (
        <Text key={r.id} style={s.r}>{r.name}: {(r.amountMinor / 100).toLocaleString()} BIF</Text>
      ))}
      <Pressable
        disabled={busy || major <= 0}
        style={[s.btn, (busy || major <= 0) && s.btnOff]}
        onPress={async () => {
          if (major <= 0) return;
          setBusy(true);
          try { await onSaveIncome(Math.round(major * 100)); go("dash"); }
          finally { setBusy(false); }
        }}
      >
        <Text style={s.bt}>{busy ? "Saving…" : "Save income"}</Text>
      </Pressable>
    </View>
  );
}
const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  in: { height: 52, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, fontSize: 20, marginTop: 12, fontVariant: ["tabular-nums"] },
  r: { marginTop: 6, fontVariant: ["tabular-nums"] },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 16 },
  btnOff: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
});
