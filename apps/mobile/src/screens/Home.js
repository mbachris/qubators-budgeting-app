import { View, Text, Pressable } from "react-native";
import { formatMoney, categoryColor } from "../theme/tokens";
import { useTheme, useThemedStyles } from "../theme/ThemeProvider";
import { periodLabel, shiftPeriod, currentPeriod } from "../lib/period";

const KIND_LABEL = {
  tithe: "Tithes / Giving",
  saving: "Savings & Wealth",
  emergency: "Emergency fund",
  community: "Community Impact",
  living: "Spendable (Living)",
};

const EXPENSE_KIND = { bill: "Bill", goal: "Planned", daily: "Everyday" };

export default function Home({
  period, summary, bills, goals = [], rules = [], categoryTotals = [], expenses = [], lifetime,
  payouts = [], sourceTotals = [], pending = 0, online, setPeriod, go, onDeleteExpense,
}) {
  const { c, mode } = useTheme();
  const s = useThemedStyles(makeStyles);
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
  const pctOf = (kind) => rules.find((r) => r.kind === kind)?.percent ?? 0;

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
        <Text style={[s.heroValue, over && { color: c.danger }]}>
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
          <View style={[s.barFill, over && { backgroundColor: c.danger }, { width: `${usedPct}%` }]} />
        </View>
        <Text style={s.heroFoot}>
          {formatMoney(spent)} spent of {formatMoney(spendable)} spendable ({usedPct}%)
        </Text>
      </View>

      {sourceTotals.length > 0 && (
        <>
          <Text style={s.h}>Where it came from</Text>
          <View style={s.card}>
            {sourceTotals.map((r) => (
              <View key={r.sourceId} style={s.rowBetween}>
                <Text style={s.rowLabel}>
                  {r.sourceName}
                  <Text style={s.hint}>  ×{r.count}</Text>
                </Text>
                <Text style={s.money}>{formatMoney(r.totalMinor)}</Text>
              </View>
            ))}
            <View style={s.hr} />
            <Row label="Total in" value={formatMoney(summary?.incomeMinor ?? 0)} strong />
            <Pressable style={s.miniBtn} onPress={() => go("add")}>
              <Text style={s.miniBtnT}>Add income or a source</Text>
            </Pressable>
          </View>
        </>
      )}

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
              <View style={[s.dot, { backgroundColor: categoryColor(r.kind, mode) }]} />
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

      {goals.length > 0 && (
        <>
          <Text style={s.h}>Planned purchases</Text>
          <View style={s.card}>
            {goals.map((g) => {
              const target = g.targetMinor ?? 0;
              const pct = target > 0 ? Math.min(100, Math.round((g.spentMinor / target) * 100)) : 0;
              return (
                <View key={g.id} style={{ marginBottom: 12 }}>
                  <View style={s.rowBetween}>
                    <Text style={s.t}>{g.name}</Text>
                    <Text style={s.money}>
                      {formatMoney(g.spentMinor)}
                      {target > 0 ? ` / ${formatMoney(target)}` : ""}
                    </Text>
                  </View>
                  {target > 0 ? (
                    <>
                      <View style={s.barTrack}>
                        <View style={[s.barFill, { width: `${pct}%`, backgroundColor: c.accent }]} />
                      </View>
                      <Text style={s.hint}>
                        {g.spentMinor >= target
                          ? "Plan complete ✓"
                          : `${pct}% • ${formatMoney(target - g.spentMinor)} still to go`}
                      </Text>
                    </>
                  ) : (
                    <Text style={s.hint}>
                      {g.payments} payment{g.payments === 1 ? "" : "s"} • no target set
                    </Text>
                  )}
                </View>
              );
            })}
            <Pressable style={s.miniBtn} onPress={() => go("spend")}>
              <Text style={s.miniBtnT}>Add to a plan</Text>
            </Pressable>
          </View>
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
              {e.note ? `${e.note} • ` : ""}{EXPENSE_KIND[e.categoryKind] ?? "Everyday"}
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
            <Row label={`Tithes given (${pctOf("tithe")}%)`} value={formatMoney(lifetime.tithePaid)} />
            <Row label={`Savings given (${pctOf("saving")}%)`} value={formatMoney(lifetime.savingsGiven)} />
            <Row label={`Emergency fund (${pctOf("emergency")}%)`} value={formatMoney(lifetime.emergencyGiven)} />
            <Row label={`Community given (${pctOf("community")}%)`} value={formatMoney(lifetime.communityGiven)} />
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
          No income recorded for {periodLabel(period)}. Add income and it is split straight away:{" "}
          {rules.filter((r) => r.kind !== "living").map((r) => `${r.percent}% ${r.name.toLowerCase()}`).join(", ")}
          {" "}— the remaining {rules.find((r) => r.kind === "living")?.percent ?? 0}% is what you spend.
        </Text>
      )}
    </View>
  );
}

function Stat({ label, value }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.stat}>
      <Text style={s.statLabel}>{label}</Text>
      <Text style={s.statValue}>{value}</Text>
    </View>
  );
}

function Row({ label, value, strong }) {
  const s = useThemedStyles(makeStyles);
  return (
    <View style={s.rowBetween}>
      <Text style={[s.rowLabel, strong && s.rowStrong]}>{label}</Text>
      <Text style={[s.money, strong && s.rowStrong]}>{value}</Text>
    </View>
  );
}

const makeStyles = (c) => ({
  badge: { alignSelf: "flex-start", backgroundColor: "#F1F5F9", paddingHorizontal: 10, paddingVertical: 6, borderRadius: 999, fontSize: 12, fontWeight: "700" },
  monthRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 12 },
  nav: { width: 44, height: 44, borderRadius: 999, borderWidth: 1, borderColor: c.border, alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
  navOff: { opacity: 0.35 },
  navT: { fontSize: 22, color: c.text },
  month: { fontSize: 20, fontWeight: "700" },
  monthSub: { color: c.text2, fontSize: 12 },

  hero: { backgroundColor: c.surface, borderWidth: 2, borderColor: c.primary, borderRadius: 20, padding: 16, marginTop: 14 },
  heroLabel: { color: c.text2, fontWeight: "800", fontSize: 12, textTransform: "uppercase", letterSpacing: 0.6 },
  heroValue: { fontSize: 34, fontWeight: "800", fontVariant: ["tabular-nums"], marginTop: 6, color: c.primary },
  heroNote: { color: c.text2, fontSize: 13, marginTop: 2 },
  heroGrid: { flexDirection: "row", flexWrap: "wrap", marginTop: 12 },
  stat: { width: "50%", paddingVertical: 6 },
  statLabel: { color: c.text2, fontSize: 12 },
  statValue: { fontWeight: "700", fontVariant: ["tabular-nums"], marginTop: 2 },
  barTrack: { height: 8, backgroundColor: c.surface2, borderRadius: 999, marginTop: 12, overflow: "hidden" },
  barFill: { height: 8, borderRadius: 999, backgroundColor: c.primary },
  heroFoot: { color: c.text2, fontSize: 12, marginTop: 8 },

  h: { fontSize: 18, fontWeight: "600", marginTop: 20 },
  card: { backgroundColor: c.surface, borderWidth: 1, borderColor: c.border, borderRadius: 16, padding: 12, marginTop: 8 },
  t: { fontWeight: "600" },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  rowLabel: { color: c.text2, flexShrink: 1, paddingRight: 8 },
  rowStrong: { fontWeight: "700", color: c.text },
  money: { fontVariant: ["tabular-nums"], fontWeight: "600" },
  hr: { height: 1, backgroundColor: c.border, marginVertical: 8 },
  hint: { color: c.text3, fontSize: 12, marginTop: 10 },
  m: { color: c.text2, marginTop: 6, fontSize: 12 },
  sub: { color: c.text2, marginTop: 8 },

  dedRow: { flexDirection: "row", alignItems: "center", paddingVertical: 8 },
  dot: { width: 10, height: 10, borderRadius: 999, marginRight: 10 },
  dedName: { fontWeight: "600" },
  dedSub: { color: c.text2, fontSize: 12, marginTop: 2 },
  miniBtn: { backgroundColor: c.accent, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 8 },
  miniBtnT: { color: "#fff", fontWeight: "700", fontSize: 13 },

  btnRow: { flexDirection: "row", marginTop: 14 },
  btn: { backgroundColor: c.primary, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center" },
  btnHalf: { flex: 1, marginHorizontal: 4 },
  bt: { color: "#fff", fontWeight: "700" },
  btnGhost: { borderWidth: 1, borderColor: c.border, borderRadius: 12, height: 48, alignItems: "center", justifyContent: "center", backgroundColor: c.surface },
  btGhost: { color: c.text, fontWeight: "700" },
  line: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingVertical: 10, borderBottomWidth: 1, borderColor: c.border },
  lineT: { fontWeight: "600" },
  due: { color: c.text2, fontSize: 12 },
  paid: { color: c.primary, fontWeight: "700", fontVariant: ["tabular-nums"] },
  del: { marginLeft: 10, paddingHorizontal: 4 },
  delT: { color: c.text3, fontSize: 16 },
});
