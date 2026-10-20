import { useState } from "react";
import { View, Text, TextInput, Pressable } from "react-native";
import { formatMoney } from "../theme/tokens";
import { useThemedStyles } from "../theme/ThemeProvider";
import { periodLabel } from "../lib/period";
import { COMMUNITY_CATEGORIES } from "../db/schema";

export default function Community({ period, summary, lifetime, payouts = [], rules = [], onGive, onDeleteGift, go }) {
  const s = useThemedStyles(makeStyles);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [confirmId, setConfirmId] = useState(null);

  const minor = Math.round((Number(amount.replace(/[^0-9.]/g, "")) || 0) * 100);
  const givenThisMonth = (id) =>
    payouts
      .filter((p) => p.period === period && (p.category ?? "society") === id)
      .reduce((a, p) => a + p.amountMinor, 0);

  return (
    <View>
      <Text style={s.h}>Community giving</Text>

      <View style={s.card}>
        <Text style={s.t}>
          Community Impact bucket
          {rules.find((r) => r.kind === "community")
            ? ` (${rules.find((r) => r.kind === "community").percent}%)`
            : ""}
        </Text>
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
      {payouts.length > 0 && <Text style={s.sub}>✕ removes a gift given by mistake.</Text>}
      {payouts.slice(0, 20).map((p) => (
        <View key={p.id} style={s.gift}>
          <View style={s.giftRow}>
            <View style={{ flex: 1, paddingRight: 8 }}>
              <Text style={s.lineT}>
                {COMMUNITY_CATEGORIES.find((c) => c.id === (p.category ?? "society"))?.name ?? "Community"}
              </Text>
              <Text style={s.sub}>
                {periodLabel(p.period)}
                {p.note ? ` • ${p.note}` : ""}
              </Text>
            </View>
            {confirmId === p.id ? (
              <View style={s.acts}>
                <Pressable hitSlop={8} onPress={() => setConfirmId(null)}>
                  <Text style={s.cancelT}>Cancel</Text>
                </Pressable>
                <Pressable
                  hitSlop={8}
                  onPress={async () => {
                    await onDeleteGift(p.id);
                    setConfirmId(null);
                  }}
                >
                  <Text style={s.removeT}>Remove</Text>
                </Pressable>
              </View>
            ) : (
              <View style={s.acts}>
                <Text style={s.moneySmall}>{formatMoney(p.amountMinor)}</Text>
                <Pressable hitSlop={8} onPress={() => setConfirmId(p.id)} style={s.xWrap}>
                  <Text style={s.delT}>✕</Text>
                </Pressable>
              </View>
            )}
          </View>
          {confirmId === p.id && (
            <Text style={s.warnT}>
              Removes {formatMoney(p.amountMinor)} from {periodLabel(p.period)}. The money goes back to
              “remaining to give”, so you can record it again correctly.
            </Text>
          )}
        </View>
      ))}

      <Pressable style={s.btnGhost} onPress={() => go("dash")}>
        <Text style={s.btGhost}>Back to my month</Text>
      </Pressable>
    </View>
  );
}

const makeStyles = (c) => ({
  h: { fontSize: 20, fontWeight: "600" },
  section: { fontSize: 16, fontWeight: "700", marginTop: 22 },
  m: { color: c.text2, marginTop: 2 },
  sub: { color: c.text2, marginTop: 8 },
  link: { color: c.info, marginTop: 8, fontWeight: "600" },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 8 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  t: { fontWeight: "600" },
  moneySmall: { fontVariant: ["tabular-nums"], fontWeight: "600", fontSize: 13 },
  in: { height: 48, borderWidth: 1, borderColor: c.border, borderRadius: 12, paddingHorizontal: 14, marginTop: 6, backgroundColor: c.surface, fontVariant: ["tabular-nums"] },
  btn: { alignSelf: "flex-start", backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 16, paddingVertical: 10, marginTop: 10 },
  off: { opacity: 0.4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", marginTop: 20, backgroundColor: c.surface },
  btGhost: { color: c.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border },
  lineT: { color: c.text2 },
  gift: { borderBottomWidth: 1, borderColor: c.border, paddingVertical: 8 },
  giftRow: { flexDirection: "row", alignItems: "center" },
  acts: { flexDirection: "row", alignItems: "center" },
  xWrap: { marginLeft: 12 },
  delT: { color: c.danger, fontWeight: "700", fontSize: 15 },
  cancelT: { color: c.text2, fontWeight: "700", fontSize: 13, marginRight: 14 },
  removeT: { color: c.danger, fontWeight: "700", fontSize: 13 },
  warnT: { color: c.danger, fontSize: 12, marginTop: 6, lineHeight: 17 },
});
