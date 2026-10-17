/**
 * allocateIncome — pure money math, minor units (e.g. cents).
 * Rules: [{ id, name, percent, kind }] where kind in tithe|saving|community|living|custom.
 * Living (kind==='living') gets remainder to guarantee sum(outputs)===input.
 * Throws on: negative amount, non-integer amount, percents sum >100, missing living fallback.
 */

export const DEFAULT_RULES = [
  { id: "tithe", name: "Tithes / Giving", percent: 10, kind: "tithe" },
  { id: "savings", name: "Savings & Wealth", percent: 15, kind: "saving" },
  { id: "emergency", name: "Emergency fund", percent: 5, kind: "emergency" },
  { id: "community", name: "Community Impact", percent: 5, kind: "community" },
  { id: "living", name: "Spendable (Living)", percent: 65, kind: "living" },
];

export function validateRules(rules) {
  if (!Array.isArray(rules) || rules.length === 0) throw new Error("rules required");
  for (const r of rules) {
    if (typeof r.percent !== "number" || r.percent < 0 || r.percent > 100)
      throw new Error(`bad percent for ${r.id}`);
  }
  const sum = rules.reduce((a, r) => a + r.percent, 0);
  if (sum > 100 + 1e-9) throw new Error(`percents sum ${sum} > 100`);
  if (!rules.some((r) => r.kind === "living"))
    throw new Error("one rule with kind 'living' required as remainder catcher");
  return sum;
}

export function allocateIncome(amountMinor, rules = DEFAULT_RULES) {
  if (!Number.isInteger(amountMinor) || amountMinor < 0)
    throw new Error("amountMinor must be a non-negative integer");
  validateRules(rules);

  const living = rules.find((r) => r.kind === "living");
  const others = rules.filter((r) => r !== living);

  // Largest-remainder for fixed-percent rules
  const computed = others.map((r) => {
    const exact = (amountMinor * r.percent) / 100;
    return { rule: r, base: Math.floor(exact), frac: exact - Math.floor(exact) };
  });
  let used = computed.reduce((a, c) => a + c.base, 0);
  let dust = Math.round(
    others.reduce((a, r) => a + (amountMinor * r.percent) / 100, 0) -
      computed.reduce((a, c) => a + c.base, 0)
  );
  // sort by frac desc for dust distribution
  const order = [...computed].sort((a, b) => b.frac - a.frac);
  const extra = new Map(order.map((c) => [c.rule.id, 0]));
  for (let i = 0; i < dust; i++) extra.set(order[i % order.length].rule.id, extra.get(order[i % order.length].rule.id) + 1);

  const out = computed.map((c) => ({
    id: c.rule.id,
    name: c.rule.name,
    kind: c.rule.kind,
    percent: c.rule.percent,
    amountMinor: c.base + (extra.get(c.rule.id) ?? 0),
  }));
  used = out.reduce((a, o) => a + o.amountMinor, 0);
  out.push({
    id: living.id,
    name: living.name,
    kind: living.kind,
    percent: living.percent,
    amountMinor: amountMinor - used, // remainder guarantees sum === input
  });
  const total = out.reduce((a, o) => a + o.amountMinor, 0);
  if (total !== amountMinor) throw new Error("invariant broken: sum != input");
  if (out.find((o) => o.id === living.id).amountMinor < 0)
    throw new Error("living remainder negative — percents exceed 100");
  return out;
}
