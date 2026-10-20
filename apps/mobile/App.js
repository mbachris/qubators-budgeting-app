import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { View, Text, Pressable, ScrollView, StatusBar } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { ThemeProvider, useTheme, useThemedStyles } from "./src/theme/ThemeProvider";
import {
  listIncomeByPeriod, listExpenseCategories, listExpensesByPeriod, expenseTotalsByCategory,
  billRows, listAllocationRules, listProjects, listPayouts, periodSummary, lifetimeTotals,
  addIncome, addExpense, deleteExpense, addExpenseCategory, setCategoryDefault, addPayout,
  deleteIncome, deletePayout, setCategoryTarget, deleteExpenseCategory, setAllocationRules,
  goalRows, listIncomeSources, addIncomeSource, incomeBySource, incomeBySourceLifetime, queueCount,
} from "./src/db/repo";
import { resetDB } from "./src/db/client";
import { currentPeriod, stampInPeriod } from "./src/lib/period";
import { getToken } from "./src/lib/api";
import { getPref, setPref } from "./src/lib/prefs";
import Home from "./src/screens/Home";
import AddIncome from "./src/screens/AddIncome";
import Spend from "./src/screens/Spend";
import Community from "./src/screens/Community";
import Settings from "./src/screens/Settings";
import TipModal from "./src/components/TipModal";
import Onboarding from "./src/components/Onboarding";

const TABS = [
  { id: "dash", label: "Home" },
  { id: "spend", label: "Spend" },
  { id: "add", label: "Income" },
  { id: "community", label: "Community" },
  { id: "settings", label: "Settings" },
];

function AppShell() {
  const { c, mode } = useTheme();
  const s = useThemedStyles(makeStyles);
  const [tab, setTab] = useState("dash");
  const [period, setPeriod] = useState(currentPeriod());
  const [summary, setSummary] = useState(null);
  const [incomes, setIncomes] = useState([]);
  const [sources, setSources] = useState([]);
  const [sourceTotals, setSourceTotals] = useState([]);
  const [sourceLifetime, setSourceLifetime] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [categoryTotals, setCategoryTotals] = useState([]);
  const [bills, setBills] = useState([]);
  const [goals, setGoals] = useState([]);
  const [categories, setCategories] = useState([]);
  const [rules, setRules] = useState([]);
  const [projects, setProjects] = useState([]);
  const [payouts, setPayouts] = useState([]);
  const [lifetime, setLifetime] = useState(null);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(false);
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  // Starts true so the intro cannot flash while the preference is being read.
  const [onboarded, setOnboarded] = useState(true);
  const scrollRef = useRef(null);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    let alive = true;
    getPref("onboarded").then((v) => { if (alive) setOnboarded(v === "1"); });
    return () => { alive = false; };
  }, []);

  const finishIntro = useCallback(async () => {
    setOnboarded(true);
    await setPref("onboarded", "1");
  }, []);

  // Every write goes through here so a failed statement shows up as a message
  // instead of an unhandled promise rejection in the console banner.
  const action = useCallback((label, fn) => async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      const m = String(e?.message || e);
      console.warn(`[action] ${label} failed:`, m);
      setErr(`${label} failed — ${m}`);
      return null;
    }
  }, []);

  const refresh = useCallback(async () => {
    const [
      summ, inc, cats, exp, totals, billsNow, ruleList, projs, paid, life, q, token, goalsNow,
      srcs, srcTotals, srcLife,
    ] = await Promise.all([
      periodSummary(period),
      listIncomeByPeriod(period),
      listExpenseCategories(),
      listExpensesByPeriod(period),
      expenseTotalsByCategory(period),
      billRows(period),
      listAllocationRules(),
      listProjects(),
      listPayouts(200),
      lifetimeTotals(),
      queueCount(),
      getToken(),
      goalRows(period),
      listIncomeSources(),
      incomeBySource(period),
      incomeBySourceLifetime(),
    ]);
    setSummary(summ); setIncomes(inc); setCategories(cats); setExpenses(exp);
    setCategoryTotals(totals); setBills(billsNow); setRules(ruleList); setProjects(projs);
    setPayouts(paid); setLifetime(life); setPending(q); setOnline(!!token); setGoals(goalsNow);
    setSources(srcs); setSourceTotals(srcTotals); setSourceLifetime(srcLife);
  }, [period]);

  useEffect(() => {
    (async () => {
      try { await refresh(); } catch (e) { console.warn("db init:", String(e?.message || e)); }
      setReady(true);
    })();
  }, [refresh]);

  const Screen = useMemo(
    () => ({ dash: Home, spend: Spend, add: AddIncome, community: Community, settings: Settings }[tab]),
    [tab]
  );

  const props = {
    period, initialPeriod: period, setPeriod, summary, incomes, expenses, categoryTotals, bills,
    goals, categories, rules, sources, sourceTotals, sourceLifetime,
    projects, payouts: payouts.filter((p) => p.bucket === "community"),
    lifetime, pending, online, setOnline, go: setTab, refresh,
    // Fetching an old entry back into the form only helps if the form is in view.
    scrollToTop: () => scrollRef.current?.scrollTo({ y: 0, animated: true }),
    // Settings can replay the three-screen intro.
    onShowIntro: () => setOnboarded(false),

    // Income lands in the month you chose on the Income screen, tagged with its source.
    onSaveIncome: action("Saving income", async ({ amountMinor, period: p, sourceId, note }) => {
      await addIncome({ amountMinor, sourceId, note, occurredAt: stampInPeriod(p) });
      await refresh();
    }),

    onAddSource: action("Adding the source", async ({ name }) => {
      await addIncomeSource({ name });
      await refresh();
    }),

    onSaveExpense: action("Saving the expense", async ({ categoryId, amountMinor, note }) => {
      await addExpense({ categoryId, amountMinor, note, period });
      await refresh();
    }),

    onPayBill: action("Paying the bill", async (bill, amountMinor, payPeriod) => {
      await addExpense({ categoryId: bill.id, amountMinor, period: payPeriod });
      // Remember the amount so next month is a one-tap job.
      await setCategoryDefault(bill.id, amountMinor);
      await refresh();
    }),

    onDeleteExpense: action("Deleting the expense", async (id) => {
      await deleteExpense(id);
      await refresh();
    }),

    // Removing an entry also un-sets the essentials that came off it, which is
    // why the screens ask for a confirming tap first.
    onDeleteIncome: action("Removing the income", async (id) => {
      await deleteIncome(id);
      await refresh();
    }),

    onDeleteGift: action("Removing the gift", async (id) => {
      await deletePayout(id);
      await refresh();
    }),

    // Only new income is split by the new percentages; history keeps its snapshots.
    onSaveRules: action("Saving the percentages", async (percents) => {
      const res = await setAllocationRules(percents);
      await refresh();
      return res;
    }),

    onAddCategory: action("Adding the category", async ({ name, kind, targetMinor }) => {
      await addExpenseCategory({ name, kind, targetMinor });
      await refresh();
    }),

    // Setting it to 0 clears the target without touching what is already in the plan.
    onSetTarget: action("Saving the target", async (id, targetMinor) => {
      await setCategoryTarget(id, targetMinor);
      await refresh();
    }),

    // Removing a plan (or any category) keeps the expenses already logged to it:
    // that money really was spent, so the record keeps its name and its amount.
    onDeleteCategory: action("Removing the plan", async (id) => {
      await deleteExpenseCategory(id);
      await refresh();
    }),

    // Planned purchases are spending like any other: they draw on the month's pot.
    onAddToGoal: action("Adding to the plan", async ({ categoryId, amountMinor, note }) => {
      await addExpense({ categoryId, amountMinor, note, period });
      await refresh();
    }),

    onGive: action("Recording the gift", async ({ category, projectId, amountMinor, period: p }) => {
      await addPayout({ bucket: "community", category, projectId, amountMinor, period: p });
      await refresh();
    }),

    onReset: action("Resetting local data", async () => {
      await resetDB();
      await refresh();
    }),
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <StatusBar
        barStyle={mode === "dark" ? "light-content" : "dark-content"}
        backgroundColor={c.surface}
      />
      <ScrollView ref={scrollRef} style={s.body} contentContainerStyle={s.bodyContent} keyboardShouldPersistTaps="handled">
        {ready ? <Screen {...props} /> : <Text style={s.loading}>Loading…</Text>}
      </ScrollView>
      {!!err && (
        <Pressable style={s.err} onPress={() => setErr("")}>
          <Text style={s.errT}>{err}</Text>
          <Text style={s.errX}>✕</Text>
        </Pressable>
      )}
      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tab, tab === t.id && s.on]}>
            <Text style={[s.t, tab === t.id && s.ton]} numberOfLines={1}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
      {ready && onboarded && <TipModal />}
      {ready && !onboarded && <Onboarding rules={rules} onDone={finishIntro} />}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AppShell />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}

const makeStyles = (c) => ({
  root: { flex: 1, backgroundColor: c.bg },
  body: { flex: 1 },
  bodyContent: { padding: 16, paddingBottom: 32 },
  loading: { color: c.text2 },
  err: { flexDirection: "row", alignItems: "center", backgroundColor: c.surface2, borderTopWidth: 1, borderColor: c.danger, paddingHorizontal: 14, paddingVertical: 10 },
  errT: { flex: 1, color: c.danger, fontSize: 12, fontWeight: "600" },
  errX: { color: c.danger, fontSize: 14, paddingLeft: 10 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: c.border, backgroundColor: c.surface },
  tab: { flex: 1, paddingVertical: 14, paddingHorizontal: 2, alignItems: "center" },
  on: { borderTopWidth: 2, borderColor: c.primary },
  t: { color: c.text2, fontWeight: "600", fontSize: 12 },
  ton: { color: c.text },
});
