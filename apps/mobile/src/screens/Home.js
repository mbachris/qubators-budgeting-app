import { View, Text, Pressable, StyleSheet } from "react-native";
import { light, formatMoney, categoryColor } from "../theme/tokens";
import { periodLabel, shiftPeriod, currentPeriod } from "../lib/period";

const KIND_LABEL = {
  tithe: "Tithes / Giving",
  saving: "Savings & Wealth",
  emergency: "Emergency fund",
  community: "Community Impact",
  living: "Spendable (Living)",
};

export default function Home({
  period, summary, bills, rules = [], categoryTotals = [], expenses = [], lifetime,
  payouts = [], pending = 0, online, setPeriod, go, onDeleteExpense,
}) {
  const cur = currentPeriod();
  const isCurrent = period === cur;
  const badge = !online
    ? "Local Vault • On this device"
    : pending > 0 ? `Cloud Sync • Pending ${pending}` : "Cloud Sync • Synced";

  const spendable = summary?.spendableMinor ?? 0;
  const spent = summary?.spentMinor ?? 0;
  const usedPct = spendable > 0 ? Math.min(100, Math.round((spent / spendable) * 100)) : 0;
  const over = spent > spendable && spendable > 0;
  const available = spendable - spent;
  const maxCat = Math.max(1, ...categoryTotals.map((c) => c.spentMinor));

  const amountFor = (kind) => ({
    tithe: summary?.titheMinor ?? 0,
    saving: summary?.savingsMinor ?? 0,
    emergency: summary?.emergencyMinor ?? 0,
    community: summary?.communityMinor ?? 0,
    living: spendable,
  }[kind] ?? 0);

  const communityGivenMonth = payouts
    .filter((p) => p.period === period)
    .reduce((a, p) => a + p.amountMinor, 0);

  const unpaidBills = bills.filter((b) => b.paidMinor === 0);
  const paidBills = bills.filter((b) => b.paidMinor > 0);

  return (
    <View>
      <Text style={s.badge}>{badge}</Text>

      <View style={s.monthRow}>
        <Pressable style={s.nav} onPress={() => setPeriod(shiftPeriod(period, -1))}>
          <Text style={s.navT}>‹</Text>
        </Pressable>
        <View style={{ alignItems: "center" }}>
          <Text style={s.month}>{periodLabel(period)}</Text>
          <Text style={s.monthSub}>{isCurrent ? "This month" : "Past month"}</Text>
        </View>
        <Pressable
          style={[s.nav, isCurrent && s.navOff]}
          disabled={isCurrent}
          onPress={() => setPeriod(shiftPeriod(period, 1))}
        >
          <Text style={s.navT}>›</Text>
        </Pressable>
      </View>

      {/* Hero: the number the user acts on. */}
      <View style={s.hero}>
        <Text style={s.heroLabel}>Available for expenditure</Text>
        <Text style={[s.heroValue, over && { color: light.danger }]}>
          {formatMoney(Math.abs(available))}
        </Text>
        <Text style={s.heroNote}>{over ? "over budget by" : "still available this month"}</Text>

        <View style={s.heroGrid}>
          <Stat label="Income" value={formatMoney(summary?.incomeMinor ?? 0)} />
          <Stat label="Deducted" value={formatMoney(
            (summary?.titheMinor ?? 0) + (summary?.savingsMinor ?? 0) +
            (summary?.emergencyMinor ?? 0) + (summary?.communityMinor ?? 0)
          )} />
          <Stat label="Spent" value={formatMoney(spent)} />
          <Stat label="Spendable" value={formatMoney(spendable)} />
        </View>

        <View style={s.barTrack}>
          <View style={[s.barFill, over && { backgroundColor: light.danger }, { width: `${usedPct}%` }]} />
        </View>
        <Text style={s.heroFoot}>
          {formatMoney(spent)} spent of {formatMoney(spendable)} spendable ({usedPct}%)
        </Text>
      </View>

      {/* Deductions with their percentages, taken the moment income lands. */}
      <Text style={s.h}>Deductions this month</Text>
      <View style={s.card}>
        {rules.map((r) => {
          const amount = amountFor(r.kind);
          const isCommunity = r.kind === "community";
          const isSpendable = r.kind === "living";
          const given = r.kind === "tithe" || r.kind === "saving" || r.kind === "emergency";
          return (
            <View key={r.id} style={s.dedRow}>
              <View style={[s.dot, { backgroundColor: categoryColor(r.kind) }]} />
              <View style={{ flex: 1 }}>
                <Text style={s.dedName}>
                  {KIND_LABEL[r.kind] ?? r.name} ({r.percent}%)
                </Text>
                {!isSpendable && (
                  <Text style={s.dedSub}>
                    {formatMoney(amount)}
                    {given ? " • given ✓" : ""}
                    {isCommunity
                      ? ` • given ${formatMoney(communityGivenMonth)} • remaining ${formatMoney(amount - communityGivenMonth)}`
                      : ""}
                  </Text>
                )}
                {isSpendable && <Text style={s.dedSub}>{formatMoney(amount)} available to spend</Text>}
              </View>
              {isCommunity && (
                <Pressable style={s.miniBtn} onPress={() => go("community")}>
                  <Text style={s.miniBtnT}>Give</Text>
                </Pressable>
              )}
            </View>
          );
        })}
        <Text style={s.hint}>
          Tithe, savings and emergency are recorded as given the moment income arrives. Only community
          giving needs an action.
        </Text>
      </View>

      <View style={s.btnRow}>
        <Pressable style={[s.btn, s.btnHalf]} onPress={() => go("add")}>
          <Text style={s.bt}>Add income</Text>
        </Pressable>
        <Pressable style={[s.btnGhost, s.btnHalf]} onPress={() => go("spend")}>
          <Text style={s.btGhost}>Add expense</Text>
        </Pressable>
      </View>

      {bills.length > 0 && (
        <>
          <Text style={s.h}>Bills this month</Text>
          {unpaidBills.length === 0 && <Text style={s.sub}>All bills paid — nice.</Text>}
          {unpaidBills.map((b) => (
            <Pressable key={b.id} style={s.line} onPress={() => go("spend")}>
              <Text style={s.lineT}>{b.name}</Text>
              <Text style={s.due}>
                due {b.dueDay ?? "—"} • {formatMoney(b.lastMinor || b.defaultAmountMinor)}
              </Text>
            </Pressable>
          ))}
          {paidBills.map((b) => (
            <View key={b.id} style={s.line}>
              <Text style={s.lineT}>{b.name}</Text>
              <Text style={s.paid}>✓ {formatMoney(b.paidMinor)}</Text>
            </View>
          ))}
        </>
      )}

      {categoryTotals.length > 0 && (
        <>
          <Text style={s.h}>Spending by category</Text>
          {categoryTotals.map((c) => (
            <View key={c.categoryId} style={s.card}>
              <View style={s.rowBetween}>
                <Text style={s.t}>{c.categoryName}</Text>
                <Text style={s.money}>{formatMoney(c.spentMinor)}</Text>
              </View>
              <View style={s.barTrack}>
                <View style={[s.barFill, { width: `${Math.round((c.spentMinor / maxCat) * 100)}%` }]} />
              </View>
            </View>
          ))}
        </>
      )}

      <Text style={s.h}>Recent expenses</Text>
      {expenses.length === 0 && <Text style={s.sub}>No expenses in {periodLabel(period)} yet.</Text>}
      {expenses.slice(0, 12).map((e) => (
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

      {/* All time — the bottom of the app. */}
      {lifetime && (
        <>
          <Text style={s.h}>All time</Text>
          <View style={s.card}>
            <Row label="Total income" value={formatMoney(lifetime.incomeMinor)} strong />
            <Row label="Total spent" value={`− ${formatMoney(lifetime.spentMinor)}`} />
            <Row label="Available for expenditure" value={formatMoney(lifetime.spendableLeft)} strong />
            <View style={s.hr} />
            <Row label="Tithes given (10%)" value={formatMoney(lifetime.tithePaid)} />
            <Row label="Savings given (15%)" value={formatMoney(lifetime.savingsGiven)} />
            <Row label="Emergency fund (5%)" value={formatMoney(lifetime.emergencyGiven)} />
            <Row label="Community given (5%)" value={formatMoney(lifetime.communityGiven)} />
            <Row label="Community remaining" value={formatMoney(lifetime.communityRemaining)} />
            <Text style={s.hint}>
              Ceremonies {formatMoney(lifetime.communityByCategory?.ceremonies ?? 0)} •{" "}
              Society {formatMoney(lifetime.communityByCategory?.society ?? 0)}
            </Text>
          </View>
        </>
      )}

      {!summary?.incomeCount && (
        <Text style={s.sub}>
          No income recorded for {periodLabel(period)}. Add income and it is split straight away: 10%
          tithes, 15% savings, 5% emergency, 5% community — the remaining 65% is what you spend.
        </Text>
      )}
    </View>
  );
}

function Stat({ label, value }) {
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value, strong }) {
  return (
    <View style={s.rowBetween}>
      <Text style={[s.rowLabel, strong && s.rowStrong]}>{label}</Text>
      <Text style={[s.money, strong && s.rowStrong]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  badge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: "700" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  nav: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: light.border, alignItems: "center", justifyContent: "center", backgroundColor: light.surface },
  navOff: { opacity: 0.35 },
  navT: { fontSize: 22, color: light.text },
  month: { fontSize: 20, fontWeight: "700" },
  monthSub: { color: light.text2, fontSize: 12 },

  hero: { backgroundColor: light.surface, borderWidth: 2, borderColor: light.primary, borderRadius: 20, padding: 16, marginTop: 14 },
  heroLabel: { color: light.text2, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  heroValue: { fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"], marginTop: 6, color: light.primary },
  heroNote: { color: light.text2, fontSize: 13, marginTop: 2 },
  heroGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  stat: { width: "50%", paddingVertical: 6 },
  statLabel: { color: light.text2, fontSize: 12 },
  statValue: { fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 2 },
  barTrack: { height: 8, backgroundColor: light.surface2, borderRadius: 999, marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: light.primary },
  heroFoot: { color: light.text2, fontSize: 12, marginTop: 8 },

  h: { fontSize: 18, fontWeight: "600", marginTop: 20 },
  card: { backgroundColor: light.surface, borderWidth: 1, borderColor: light.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: light.text2, flexShrink: 1, paddingRight: 8 },
  rowStrong: { fontWeight: "700", color: light.text },
  money: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  hr: { height: 1, backgroundColor: light.border, marginVertical: 8 },
  hint: { color: light.text3, fontSize: 12, marginTop: 10 },
  m: { color: light.text2, marginTop: 6, fontSize: 12 },
  sub: { color: light.text2, marginTop: 8 },

  dedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 10 },
  dedName: { fontWeight: "600" },
  dedSub: { color: light.text2, fontSize: 12, marginTop: 2 },
  miniBtn: { backgroundColor: light.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  miniBtnT: { color: "#fff", fontWeight: "700", fontSize: 13 },

  btnRow: { flexDirection: "row", marginTop: 14 },
  btn: { backgroundColor: light.primary, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  btnHalf: { flex: 1, marginHorizontal: 4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: light.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: light.surface },
  btGhost: { color: light.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: light.border },
  lineT: { fontWeight: "600" },
  due: { color: light.text2, fontSize: 12 },
  paid: { color: light.primary, fontWeight: "700", fontVariant: ["tabular-nums"] },
  del: { marginLeft: 10, paddingHorizontal: 4 },
  delT: { color: light.text3, fontSize: 16 },
});
