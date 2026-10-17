export const light = {
  bg: "#F8FAFC", surface: "#FFFFFF", surface2: "#F1F5F9", border: "#E2E8F0",
  text: "#0F172A", text2: "#475569", text3: "#94A3B8",
  primary: "#16A34A", primaryPressed: "#15803D",
  accent: "#F59E0B", danger: "#DC2626", info: "#2563EB",
  tithe: "#8B5CF6", savings: "#2563EB", emergency: "#0EA5E9", community: "#F59E0B", living: "#16A34A", custom: "#64748B",
};
export const dark = {
  bg: "#020617", surface: "#0F172A", surface2: "#1E293B", border: "#1E293B",
  text: "#F8FAFC", text2: "#CBD5E1", text3: "#64748B",
  primary: "#22C55E", primaryPressed: "#16A34A",
  accent: "#FBBF24", danger: "#F87171", info: "#60A5FA",
  tithe: "#A78BFA", savings: "#60A5FA", emergency: "#38BDF8", community: "#FBBF24", living: "#22C55E", custom: "#94A3B8",
};
export const spacing = { xs: 4, sm: 8, md: 12, lg: 16, xl: 20, xxl: 24, xxxl: 32 };
export const radius = { sm: 8, md: 12, lg: 16, xl: 24, full: 999 };
export const type = {
  display: { size: 28, lh: 34, weight: "700" },
  title: { size: 20, lh: 26, weight: "600" },
  body: { size: 16, lh: 24, weight: "400" },
  caption: { size: 13, lh: 18, weight: "400" },
  money: { size: 20, lh: 26, weight: "600", tabular: true },
} as const;
export function categoryColor(kind: string, mode: "light" | "dark" = "light") {
  const t = mode === "light" ? light : dark;
  return ({ tithe: t.tithe, saving: t.savings, emergency: t.emergency, community: t.community, living: t.living } as any)[kind] ?? t.custom;
}
export function formatMoney(minor: number, currency = "BIF") {
  const major = minor / 100;
  return `${new Intl.NumberFormat("en-US").format(major)} ${currency}`;
}
