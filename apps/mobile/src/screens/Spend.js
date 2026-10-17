import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light, formatMoney } from "../theme/tokens";
import { periodLabel } from "../lib/period";

export default function Spend({
  period, bills = [], categories = [], expenses = [], onSaveExpense, onAddCategory,
  onPayBill, onDeleteExpense,
}) {
  const daily = categories.filter((c) => c.kind === "daily");
  const [amounts, setAmounts] = useState({});
  const [categoryId, setCategoryId] = useState(daily[0]?.id ?? "food");
  const [val, setVal] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("daily");

  // Bills are pre-filled with last month's amount, so paying is one tap.
  useEffect(() => {
    const next = {};
    for (const b of bills) next[b.id] = String((b.lastMinor || b.defaultAmountMinor || 0) / 100);
    setAmounts(next);
  }, [bills]);

  const minorOf = (text) => Math.round((Number(String(text).replace(/[^0-9.]/g, "")) || 0) * 100);
  const minor = minorOf(val);

  return (
    <View>
      <Text style={s.h}>Spend — {periodLabel(period)}</Text>

      <Text style={s.section}>Bills (fixed every month)</Text>
      <Text style={s.m}>Set the amount once; it is remembered and pre-filled next month.</Text>
      {bills.length === 0 && <Text style={s.sub}>No bill categories yet. Add one below.</Text>}
      {bills.map((b) => (
        <View key={b.id} style={s.card}>
          <View style={s.rowBetween}>
            <Text style={s.t}>{b.name}</Text>
            <Text style={s.due}>{b.paidMinor > 0 ? `paid ${formatMoney(b.paidMinor)}` : b.dueDay ? `due ${b.dueDay}` : "monthly"}</Text>
          </View>
          <View style={s.payRow}>
            <TextInput
              style={[s.in, s.inPay]}
              keyboardType="numeric"
              value={amounts[b.id] ?? ""}
              onChangeText={(v) => setAmounts((a) => ({ ...a, [b.id]: v }))}
              placeholder="0"
            />
            <Pressable
              style={[s.btn, s.btnPay, busy && s.off]}
              disabled={busy || minorOf(amounts[b.id]) <= 0}
              onPress={async () => {
                const amt = minorOf(amounts[b.id]);
                if (amt <= 0) return;
                setBusy(true);
                try {
                  await onPayBill(b, amt, period);
                  setMsg(`${b.name} paid: ${formatMoney(amt)}`);
                } finally { setBusy(false); }
              }}
            >
              <Text style={s.bt}>Pay</Text>
            </Pressable>
          </View>
        </View>
      ))}

      <Text style={s.section}>Everyday spending</Text>
      <View style={s.chips}>
        {daily.map((c) => (
          <Pressable
            key={c.id}
            style={[s.chip, categoryId === c.id && s.chipOn]}
            onPress={() => setCategoryId(c.id)}
          >
            <Text style={[s.chipT, categoryId === c.id && s.chipTOn]}>{c.name}</Text>
          </Pressable>
        ))}
      </View>

      <Text style={s.label}>What was it for?</Text>
      <TextInput
        style={s.in}
        value={note}
        onChangeText={setNote}
        placeholder={categoryId === "other" ? "Name it — e.g. Baby milk, school shoes" : "Optional note"}
      />
      {categoryId === "other" && !note.trim() && (
        <Text style={s.warn}>Add a name so "Other" still tells you what the money was for.</Text>
      )}

      <View style={s.payRow}>
        <TextInput
          style={[s.in, s.inPay]}
          keyboardType="numeric"
          value={val}
          onChangeText={setVal}
          placeholder="Amount (BIF)"
        />
        <Pressable
          style={[s.btn, s.btnPay, (busy || minor <= 0) && s.off]}
          disabled={busy || minor <= 0}
          onPress={async () => {
            if (minor <= 0) return;
            setBusy(true);
            try {
              await onSaveExpense({ categoryId, amountMinor: minor, note: note.trim() || null });
              setVal("");
              setNote("");
              setMsg(`Logged ${formatMoney(minor)}.`);
            } finally { setBusy(false); }
          }}
        >
          <Text style={s.bt}>Save</Text>
        </Pressable>
      </View>
      {!!msg && <Text style={s.sub}>{msg}</Text>}

      <Text style={s.section}>New category</Text>
      <TextInput
        style={s.in}
        placeholder="e.g. Baby needs"
        value={newName}
        onChangeText={setNewName}
      />
      <View style={s.chips}>
        {[["daily", "Everyday"], ["bill", "Bill (monthly)"]].map(([k, label]) => (
          <Pressable key={k} style={[s.chip, newKind === k && s.chipOn]} onPress={() => setNewKind(k)}>
            <Text style={[s.chipT, newKind === k && s.chipTOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <Pressable
        style={[s.btnGhost, (busy || !newName.trim()) && s.off]}
        disabled={busy || !newName.trim()}
        onPress={async () => {
          setBusy(true);
          try {
            await onAddCategory({ name: newName.trim(), kind: newKind });
            setNewName("");
            setMsg(`Category "${newName.trim()}" added.`);
          } finally { setBusy(false); }
        }}
      >
        <Text style={s.btGhost}>Add category</Text>
      </Pressable>

      <Text style={s.section}>Logged in {periodLabel(period)}</Text>
      {expenses.length === 0 && <Text style={s.sub}>Nothing logged yet.</Text>}
      {expenses.map((e) => (
        <View key={e.id} style={s.line}>
          <View style={{ flex: 1, paddingRight: 8 }}>
            <Text style={s.lineT}>{e.categoryName ?? e.categoryId}</Text>
            <Text style={s.due}>
              {e.note ? `${e.note} • ` : ""}{e.categoryKind === "bill" ? "Bill" : "Everyday"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <Text style={s.money}>−{formatMoney(e.amountMinor)}</Text>
            <Pressable hitSlop={8} onPress={() => onDeleteExpense(e.id)} style={s.del}>
              <Text style={s.delT}>✕</Text>
            </Pressable>
          </View>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  h: { fontSize: 20, fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", marginTop: 22 },
  m: { color: light.text2, fontSize: 12, marginTop: 2 },
  sub: { color: light.text2, marginTop: 8 },
  label: { fontSize: 13, fontWeight: "700", marginTop: 16, color: light.text2 },
  warn: { color: light.accent, fontSize: 12, marginTop: 6, fontWeight: "600" },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  t: { fontWeight: "600" },
  due: { color: light.text2, fontSize: 12 },
  payRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  in: { height: 48, borderWidth: 1, borderColor: light.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 8, backgroundColor: light.surface },
  inPay: { flex: 1, marginTop: 0, fontVariant: ["tabular-nums"] },
  chips: { flexDirection: "row", flexWrap: "wrap", marginTop: 8 },
  chip: { borderWidth: 1, borderColor: light.border, borderRadius: 999, paddingHorizontal: 12, paddingVertical: 8, marginRight: 6, marginBottom: 6, backgroundColor: light.surface },
  chipOn: { backgroundColor: light.primary, borderColor: light.primary },
  chipT: { color: light.text, fontSize: 13 },
  chipTOn: { color: "#fff", fontWeight: "700" },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  btnPay: { width: 84, marginLeft: 8 },
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 8, backgroundColor: light.surface },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btGhost: { color: light.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: light.border },
  lineT: { fontWeight: "600" },
  money: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  del: { marginLeft: 10, paddingHorizontal: 4 },
  delT: { color: light.text3, fontSize: 16 },
});
