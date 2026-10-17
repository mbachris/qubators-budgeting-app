import { useEffect, useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet } from "react-native";
import { light, formatMoney } from "../theme/tokens";
import { periodLabel } from "../lib/period";

const KIND_LABEL = { bill: "Bill", goal: "Planned", daily: "Everyday" };
const minorOf = (text) => Math.round((Number(String(text).replace(/[^0-9.]/g, "")) || 0) * 100);

export default function Spend({
  period, bills = [], goals = [], categories = [], expenses = [],
  onSaveExpense, onAddCategory, onPayBill, onAddToGoal, onDeleteExpense, onSetTarget,
  onDeleteCategory,
}) {
  const daily = categories.filter((c) => c.kind === "daily");
  const [amounts, setAmounts] = useState({});
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState(daily[0]?.id ?? "food");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [newName, setNewName] = useState("");
  const [newKind, setNewKind] = useState("daily");
  const [newTarget, setNewTarget] = useState("");
  // Editing a plan's target, and confirming its removal, keyed by plan id.
  const [targetEdit, setTargetEdit] = useState(null);
  const [targetConfirm, setTargetConfirm] = useState(null);
  // Confirming the removal of a whole plan (the category itself).
  const [planConfirm, setPlanConfirm] = useState(null);

  // Bills and planned purchases are pre-filled, so logging is one tap.
  useEffect(() => {
    const next = {};
    for (const b of bills) next[b.id] = String((b.lastMinor || b.defaultAmountMinor || 0) / 100);
    for (const g of goals) {
      const remaining = Math.max(0, (g.targetMinor ?? 0) - g.spentMinor);
      next[g.id] = String((remaining || g.lastMinor || 0) / 100);
    }
    setAmounts(next);
  }, [bills, goals]);

  const minor = minorOf(amount);

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

      <Text style={s.section}>Planned purchases</Text>
      <Text style={s.m}>
        A car, a trip, a big repair. Each keeps its own name, its own target and its own running
        total — it is not an everyday expense and not a monthly bill.
      </Text>
      {goals.length === 0 && (
        <Text style={s.sub}>
          Nothing planned yet. Add one below and choose “Planned purchase”.
        </Text>
      )}
      {goals.map((g) => {
        const target = g.targetMinor ?? 0;
        const pct = target > 0 ? Math.min(100, Math.round((g.spentMinor / target) * 100)) : 0;
        const remaining = Math.max(0, target - g.spentMinor);
        const done = target > 0 && g.spentMinor >= target;
        return (
          <View key={g.id} style={s.card}>
            <View style={s.rowBetween}>
              <Text style={s.t}>{g.name}</Text>
              <Text style={[s.due, done && { color: light.primary, fontWeight: "700" }]}>
                {done ? "target reached ✓" : target > 0 ? `${pct}%` : `${g.payments} payment${g.payments === 1 ? "" : "s"}`}
              </Text>
            </View>

            <Text style={s.moneyBig}>
              {formatMoney(g.spentMinor)}
              {target > 0 ? <Text style={s.moneyOf}> of {formatMoney(target)}</Text> : null}
            </Text>
            {target > 0 && (
              <>
                <View style={s.barTrack}>
                  <View style={[s.barFill, done && { backgroundColor: light.primary }, { width: `${pct}%` }]} />
                </View>
                <Text style={s.due}>
                  {done ? "Plan complete." : `${formatMoney(remaining)} still to go`}
                  {g.spentThisMonthMinor > 0 ? ` • ${formatMoney(g.spentThisMonthMinor)} this month` : ""}
                </Text>
              </>
            )}
            {target === 0 && g.spentThisMonthMinor > 0 && (
              <Text style={s.due}>{formatMoney(g.spentThisMonthMinor)} this month • no target set</Text>
            )}

            {targetEdit?.id === g.id ? (
              <>
                <Text style={s.label}>Target amount (BIF)</Text>
                <View style={s.payRow}>
                  <TextInput
                    style={[s.in, s.inPay]}
                    keyboardType="numeric"
                    value={targetEdit.val}
                    onChangeText={(v) => setTargetEdit({ id: g.id, val: v })}
                    placeholder="e.g. 15000000"
                  />
                  <Pressable
                    style={[s.btn, s.btnPay, busy && s.off]}
                    disabled={busy}
                    onPress={async () => {
                      setBusy(true);
                      try {
                        const v = minorOf(targetEdit.val);
                        const ok = await onSetTarget(g.id, v);
                        if (ok === null) return; // the error banner explains why
                        setTargetEdit(null);
                        setMsg(v > 0 ? `${g.name}: target set to ${formatMoney(v)}.` : `${g.name}: target removed.`);
                      } finally { setBusy(false); }
                    }}
                  >
                    <Text style={s.bt}>Save</Text>
                  </Pressable>
                </View>
                <View style={s.targetRow}>
                  <Text style={s.due}>Leave it empty to remove the target.</Text>
                  <Pressable hitSlop={8} onPress={() => setTargetEdit(null)}>
                    <Text style={s.tFix}>Cancel</Text>
                  </Pressable>
                </View>
              </>
            ) : (
              <View style={s.targetRow}>
                {targetConfirm === g.id ? (
                  <>
                    <Text style={s.tWarn}>
                      Remove the target? The {formatMoney(g.spentMinor)} already in this plan stays.
                    </Text>
                    <Pressable hitSlop={8} onPress={() => setTargetConfirm(null)}>
                      <Text style={s.tCancel}>Cancel</Text>
                    </Pressable>
                    <Pressable
                      hitSlop={8}
                      onPress={async () => {
                        const ok = await onSetTarget(g.id, 0);
                        if (ok === null) return;
                        setTargetConfirm(null);
                        setMsg(`${g.name}: target removed.`);
                      }}
                    >
                      <Text style={s.tRemove}>Remove</Text>
                    </Pressable>
                  </>
                ) : (
                  <>
                    <Text style={s.due}>
                      {target > 0 ? `Target ${formatMoney(target)}` : "No target set"}
                    </Text>
                    <View style={{ flexDirection: "row", alignItems: "center" }}>
                      <Pressable
                        hitSlop={8}
                        onPress={() => {
                          setTargetConfirm(null);
                          setPlanConfirm(null);
                          setTargetEdit({ id: g.id, val: target > 0 ? String(target / 100) : "" });
                        }}
                      >
                        <Text style={s.tFix}>{target > 0 ? "Change target" : "Set target"}</Text>
                      </Pressable>
                      {target > 0 && (
                        <Pressable hitSlop={8} onPress={() => setTargetConfirm(g.id)}>
                          <Text style={s.tDel}>✕</Text>
                        </Pressable>
                      )}
                    </View>
                  </>
                )}
              </View>
            )}

            <View style={s.payRow}>
              <TextInput
                style={[s.in, s.inPay]}
                keyboardType="numeric"
                value={amounts[g.id] ?? ""}
                onChangeText={(v) => setAmounts((a) => ({ ...a, [g.id]: v }))}
                placeholder="Amount (BIF)"
              />
              <Pressable
                style={[s.btn, s.btnPay, busy && s.off]}
                disabled={busy || minorOf(amounts[g.id]) <= 0}
                onPress={async () => {
                  const amt = minorOf(amounts[g.id]);
                  if (amt <= 0) return;
                  setBusy(true);
                  try {
                    await onAddToGoal({ categoryId: g.id, amountMinor: amt, note: g.name });
                    setAmounts((a) => ({ ...a, [g.id]: "" }));
                    setMsg(`${g.name}: added ${formatMoney(amt)}.`);
                  } finally { setBusy(false); }
                }}
              >
                <Text style={s.bt}>Add</Text>
              </Pressable>
            </View>

            <View style={s.planFoot}>
              {planConfirm === g.id ? (
                <>
                  <Text style={s.tWarn}>
                    Remove the plan “{g.name}”?
                    {g.spentMinor > 0
                      ? ` The ${formatMoney(g.spentMinor)} already logged stays in your records and keeps its name.`
                      : " Nothing has been logged to it yet."}
                  </Text>
                  <Pressable hitSlop={8} onPress={() => setPlanConfirm(null)}>
                    <Text style={s.tCancel}>Cancel</Text>
                  </Pressable>
                  <Pressable
                    hitSlop={8}
                    onPress={async () => {
                      const ok = await onDeleteCategory(g.id);
                      if (ok === null) return;
                      setPlanConfirm(null);
                      setMsg(`${g.name}: plan removed.`);
                    }}
                  >
                    <Text style={s.tRemove}>Remove</Text>
                  </Pressable>
                </>
              ) : (
                <>
                  <Text style={s.due}>
                    {g.payments === 0
                      ? "Nothing logged yet"
                      : `${g.payments} payment${g.payments === 1 ? "" : "s"} logged`}
                  </Text>
                  <Pressable
                    hitSlop={8}
                    onPress={() => {
                      setTargetEdit(null);
                      setTargetConfirm(null);
                      setPlanConfirm(g.id);
                    }}
                  >
                    <Text style={s.tRemove}>Remove this plan</Text>
                  </Pressable>
                </>
              )}
            </View>
          </View>
        );
      })}

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
          value={amount}
          onChangeText={setAmount}
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
              setAmount("");
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
        placeholder="e.g. Car, Trip to Nairobi, Baby needs"
        value={newName}
        onChangeText={setNewName}
      />
      <View style={s.chips}>
        {[["daily", "Everyday"], ["bill", "Bill (monthly)"], ["goal", "Planned purchase"]].map(([k, label]) => (
          <Pressable key={k} style={[s.chip, newKind === k && s.chipOn]} onPress={() => setNewKind(k)}>
            <Text style={[s.chipT, newKind === k && s.chipTOn]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      {newKind === "goal" && (
        <>
          <Text style={s.label}>Target amount (optional)</Text>
          <TextInput
            style={s.in}
            keyboardType="numeric"
            placeholder="e.g. 15000000 for the car"
            value={newTarget}
            onChangeText={setNewTarget}
          />
          <Text style={s.m}>
            The target is just your plan — you can add money to it month after month.
          </Text>
        </>
      )}
      <Pressable
        style={[s.btnGhost, (busy || !newName.trim()) && s.off]}
        disabled={busy || !newName.trim()}
        onPress={async () => {
          setBusy(true);
          try {
            await onAddCategory({
              name: newName.trim(),
              kind: newKind,
              targetMinor: newKind === "goal" ? minorOf(newTarget) : 0,
            });
            setMsg(`Category "${newName.trim()}" added.`);
            setNewName("");
            setNewTarget("");
            setNewKind("daily");
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
              {e.note ? `${e.note} • ` : ""}{KIND_LABEL[e.categoryKind] ?? "Everyday"}
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
  due: { color: light.text2, fontSize: 12, marginTop: 2 },
  moneyBig: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"], marginTop: 4 },
  moneyOf: { fontSize: 13, fontWeight: "600", color: light.text2 },
  barTrack: { height: 8, backgroundColor: light.surface2, borderRadius: 999, marginTop: 8, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: light.accent },
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
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 12, backgroundColor: light.surface },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btGhost: { color: light.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: light.border },
  lineT: { fontWeight: "600" },
  money: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  del: { marginLeft: 10, paddingHorizontal: 4 },
  delT: { color: light.text3, fontSize: 16 },
  targetRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 },
  planFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10, paddingTop: 8, borderTopWidth: 1, borderColor: light.border },
  tFix: { color: light.info, fontWeight: "700", fontSize: 12 },
  tDel: { color: light.danger, fontWeight: "700", fontSize: 14, marginLeft: 14 },
  tCancel: { color: light.text2, fontWeight: "700", fontSize: 12, marginRight: 14 },
  tRemove: { color: light.danger, fontWeight: "700", fontSize: 12 },
  tWarn: { flex: 1, color: light.danger, fontSize: 12, lineHeight: 16 },
});
