import { useEffect, useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { SafeAreaProvider, useSafeAreaInsets } from "react-native-safe-area-context";
import { light } from "./src/theme/tokens";
import { listIncome, listCategories, listProjects, addIncome, queueCount } from "./src/db/repo";
import Dashboard from "./src/screens/Dashboard";
import AddIncome from "./src/screens/AddIncome";
import Community from "./src/screens/Community";
import Settings from "./src/screens/Settings";

const TABS = [
  { id: "dash", label: "Dashboard" },
  { id: "add", label: "Add" },
  { id: "community", label: "Community" },
  { id: "settings", label: "Settings" },
];

function AppShell() {
  const [tab, setTab] = useState("dash");
  const [incomes, setIncomes] = useState([]);
  const [categories, setCategories] = useState([]);
  const [projects, setProjects] = useState([]);
  const [pending, setPending] = useState(0);
  const [online, setOnline] = useState(false);
  const [ready, setReady] = useState(false);
  const insets = useSafeAreaInsets();

  async function refresh() {
    const [i, c, p, q] = await Promise.all([listIncome(), listCategories(), listProjects(), queueCount()]);
    setIncomes(i); setCategories(c); setProjects(p); setPending(q);
  }

  useEffect(() => {
    (async () => {
      try { await refresh(); } catch (e) { console.warn("db init:", String(e?.message || e)); }
      setReady(true);
    })();
  }, []);

  const Screen = useMemo(
    () => ({ dash: Dashboard, add: AddIncome, community: Community, settings: Settings }[tab]),
    [tab]
  );

  const props = {
    incomes, categories, projects, pending, online, setOnline, go: setTab,
    refresh,
    onSaveIncome: async (amountMinor) => { await addIncome({ amountMinor }); await refresh(); },
    onGive: async () => { await refresh(); },
  };

  return (
    <View style={[s.root, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={s.body}>
        {ready ? <Screen {...props} /> : <Text style={s.loading}>Loading…</Text>}
      </View>
      <View style={s.tabs}>
        {TABS.map((t) => (
          <Pressable key={t.id} onPress={() => setTab(t.id)} style={[s.tab, tab === t.id && s.on]}>
            <Text style={[s.t, tab === t.id && s.ton]}>{t.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppShell />
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: light.bg },
  body: { flex: 1, padding: 16 },
  loading: { color: light.text2 },
  tabs: { flexDirection: "row", borderTopWidth: 1, borderColor: light.border, backgroundColor: light.surface },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center" },
  on: { borderTopWidth: 2, borderColor: light.primary },
  t: { color: light.text2, fontWeight: "600" },
  ton: { color: light.text },
});
