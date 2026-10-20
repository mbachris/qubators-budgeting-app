import test from "node:test";
import assert from "node:assert/strict";
import { allocateIncome, DEFAULT_RULES } from "../src/allocate.js";

const sum = (rows) => rows.reduce((a, r) => a + r.amountMinor, 0);
const byId = (rows) => Object.fromEntries(rows.map((r) => [r.id, r.amountMinor]));

test("100 000 splits 10/15/5/5/65 exactly", () => {
  const rows = allocateIncome(100000, DEFAULT_RULES);
  assert.deepEqual(byId(rows), { tithe: 10000, savings: 15000, emergency: 5000, community: 5000, living: 65000 });
});

test("sum always equals input incl. rounding dust", () => {
  for (const amt of [1, 3, 7, 99, 101, 999, 123456]) {
    const rows = allocateIncome(amt, DEFAULT_RULES);
    assert.equal(sum(rows), amt, `amt ${amt}`);
    assert.ok(rows.find((r) => r.id === "living").amountMinor >= 0);
  }
});

test("custom rules + rename supported", () => {
  const rules = [
    { id: "a", name: "Church", percent: 12, kind: "tithe" },
    { id: "b", name: "Emergency", percent: 20, kind: "saving" },
    { id: "c", name: "Village", percent: 8, kind: "community" },
    { id: "d", name: "Daily", percent: 60, kind: "living" },
  ];
  const rows = allocateIncome(10001, rules);
  assert.equal(sum(rows), 10001);
});

test("custom percentages 12/18/5/5 leave 60% spendable", () => {
  const rules = [
    { id: "tithe", name: "Tithes / Giving", percent: 12, kind: "tithe" },
    { id: "savings", name: "Savings & Wealth", percent: 18, kind: "saving" },
    { id: "emergency", name: "Emergency fund", percent: 5, kind: "emergency" },
    { id: "community", name: "Community Impact", percent: 5, kind: "community" },
    { id: "living", name: "Spendable (Living)", percent: 60, kind: "living" },
  ];
  const rows = allocateIncome(200000, rules);
  assert.deepEqual(byId(rows), { tithe: 24000, savings: 36000, emergency: 10000, community: 10000, living: 120000 });
  assert.equal(rows.find((r) => r.kind === "living").percent, 60);
});

test("all deductions at 0 → everything is spendable", () => {
  const rules = DEFAULT_RULES.map((r) => ({ ...r, percent: r.kind === "living" ? 100 : 0 }));
  const rows = allocateIncome(12345, rules);
  assert.deepEqual(byId(rows), { tithe: 0, savings: 0, emergency: 0, community: 0, living: 12345 });
});

test("rejects sum >100 and missing living", () => {
  assert.throws(() =>
    allocateIncome(100, [
      { id: "x", name: "X", percent: 90, kind: "custom" },
      { id: "l", name: "L", percent: 20, kind: "living" },
    ])
  );
  assert.throws(() => allocateIncome(100, [{ id: "x", name: "X", percent: 10, kind: "custom" }]));
});

test("zero income → all zero", () => {
  const rows = allocateIncome(0, DEFAULT_RULES);
  assert.equal(sum(rows), 0);
});
