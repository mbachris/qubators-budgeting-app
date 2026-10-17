import { getDB } from "./client";
import { uuid, now } from "../lib/id";
import { allocateIncome } from "../domain/allocate";
import { periodOf, currentPeriod, stampInPeriod } from "../lib/period";

// ---------------------------------------------------------------- safe runner
// expo-sqlite rejects `undefined` bindings (native NullPointerException), so every
// parameter is normalised before it reaches the driver.
const bind = (args) => args.map((a) => (a === undefined ? null : a));

async function run(db, sql, ...args) {
  return db.runAsync(sql, ...bind(args));
}

// ---------------------------------------------------------------- allocations
export async function listAllocationRules() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT id,name,percent,kind,sort FROM allocation_rules WHERE is_deleted=0 ORDER BY sort"
  );
}

// ---------------------------------------------------------------------- income
// Every income is split immediately: tithe / savings / community are set aside,
// the remainder (living) is the spendable pot for that income's month.
export async function addIncome({ amountMinor, currency = "BIF", note = null, occurredAt = null }) {
  const db = await getDB();
  const rules = await listAllocationRules();
  const split = allocateIncome(amountMinor, rules);
  const part = (kind) => split.find((p) => p.kind === kind)?.amountMinor ?? 0;

  const t = now();
  const at = occurredAt ?? t;
  const period = periodOf(at);
  const id = uuid();
  const row = {
    id,
    amountMinor,
    currency,
    note,
    occurredAt: at,
    period,
    titheMinor: part("tithe"),
    savingsMinor: part("saving"),
    emergencyMinor: part("emergency"),
    communityMinor: part("community"),
    spendableMinor: part("living"),
    updatedAt: t,
  };

  await run(db,
    `INSERT INTO income_entries
       (id,amount_minor,currency,note,occurred_at,period,tithe_minor,savings_minor,emergency_minor,community_minor,spendable_minor,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,NULL,?,0,1)`,
    row.id, row.amountMinor, row.currency, row.note, row.occurredAt, row.period,
    row.titheMinor, row.savingsMinor, row.emergencyMinor, row.communityMinor,
    row.spendableMinor, row.updatedAt
  );
  await enqueue("income_entries", row.id, "upsert", row);
  return row;
}

export async function listIncomeByPeriod(period) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, amount_minor AS amountMinor, currency, note, occurred_at AS occurredAt, period,
            tithe_minor AS titheMinor, savings_minor AS savingsMinor,
            emergency_minor AS emergencyMinor, community_minor AS communityMinor,
            spendable_minor AS spendableMinor
     FROM income_entries WHERE is_deleted=0 AND period=? ORDER BY occurred_at DESC`,
    period
  );
}

// Months that have any activity, newest first, always including the live month.
export async function listPeriods() {
  const db = await getDB();
  const rows = await db.getAllAsync(
    `SELECT period FROM income_entries WHERE is_deleted=0
     UNION SELECT period FROM expenses WHERE is_deleted=0
     UNION SELECT period FROM payouts WHERE is_deleted=0`
  );
  const set = new Set(rows.map((r) => r.period));
  set.add(currentPeriod());
  return [...set].sort().reverse();
}

// The month's statement: what came in, what was deducted, what is spendable.
export async function periodSummary(period) {
  const db = await getDB();
  const inc = await db.getFirstAsync(
    `SELECT COUNT(*) AS incomeCount,
            COALESCE(SUM(amount_minor),0) AS incomeMinor,
            COALESCE(SUM(tithe_minor),0) AS titheMinor,
            COALESCE(SUM(savings_minor),0) AS savingsMinor,
            COALESCE(SUM(emergency_minor),0) AS emergencyMinor,
            COALESCE(SUM(community_minor),0) AS communityMinor,
            COALESCE(SUM(spendable_minor),0) AS spendableMinor
     FROM income_entries WHERE is_deleted=0 AND period=?`,
    period
  );
  const exp = await db.getFirstAsync(
    `SELECT COUNT(*) AS expenseCount, COALESCE(SUM(amount_minor),0) AS spentMinor
     FROM expenses WHERE is_deleted=0 AND period=?`,
    period
  );
  const incomeMinor = inc?.incomeMinor ?? 0;
  const spendableMinor = inc?.spendableMinor ?? 0;
  const spentMinor = exp?.spentMinor ?? 0;
  return {
    period,
    incomeCount: inc?.incomeCount ?? 0,
    expenseCount: exp?.expenseCount ?? 0,
    incomeMinor,
    titheMinor: inc?.titheMinor ?? 0,
    savingsMinor: inc?.savingsMinor ?? 0,
    emergencyMinor: inc?.emergencyMinor ?? 0,
    communityMinor: inc?.communityMinor ?? 0,
    spendableMinor,
    spentMinor,
    leftMinor: spendableMinor - spentMinor,
  };
}

// ----------------------------------------------------------- expense categories
export async function listExpenseCategories() {
  const db = await getDB();
  const rows = await db.getAllAsync(
    `SELECT id,name,kind,default_amount_minor AS defaultAmountMinor,due_day AS dueDay,sort
     FROM expense_categories WHERE is_deleted=0 ORDER BY sort, name`
  );
  return rows.map((r) => ({ ...r, kind: r.kind === "bill" ? "bill" : "daily" }));
}

export async function addExpenseCategory({ name, kind = "daily", dueDay = null, defaultAmountMinor = 0 }) {
  const db = await getDB();
  const t = now();
  const id = `cat-${uuid().slice(0, 8)}`;
  const max = await db.getFirstAsync("SELECT COALESCE(MAX(sort),0) AS m FROM expense_categories");
  const sort = (max?.m ?? 0) + 1;
  const row = { id, name, kind, defaultAmountMinor, dueDay, sort, updatedAt: t };
  await run(db,
    `INSERT INTO expense_categories (id,name,kind,default_amount_minor,due_day,sort,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,?,?,NULL,?,0,1)`,
    id, name, kind, defaultAmountMinor, dueDay, sort, t
  );
  await enqueue("expense_categories", id, "upsert", row);
  return row;
}

// Remembering the amount is what makes bills a one-tap job next month.
export async function setCategoryDefault(id, defaultAmountMinor) {
  const db = await getDB();
  const t = now();
  await run(db,
    "UPDATE expense_categories SET default_amount_minor=?, updated_at=? WHERE id=?",
    defaultAmountMinor, t, id
  );
  await enqueue("expense_categories", id, "upsert", { id, defaultAmountMinor, updatedAt: t });
}

export async function deleteExpenseCategory(id) {
  const db = await getDB();
  const t = now();
  await run(db,"UPDATE expense_categories SET is_deleted=1, updated_at=? WHERE id=?", t, id);
  await enqueue("expense_categories", id, "delete", { id, isDeleted: true, updatedAt: t });
}

// -------------------------------------------------------------------- expenses
export async function addExpense({ categoryId, amountMinor, note = null, occurredAt = null, period = null }) {
  const db = await getDB();
  const t = now();
  const at = occurredAt ?? (period ? stampInPeriod(period) : t);
  const id = uuid();
  const row = { id, categoryId, period: period ?? periodOf(at), amountMinor, note, occurredAt: at, updatedAt: t };
  await run(db,
    `INSERT INTO expenses (id,category_id,period,amount_minor,note,occurred_at,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,?,?,NULL,?,0,1)`,
    id, row.categoryId, row.period, row.amountMinor, row.note, row.occurredAt, t
  );
  await enqueue("expenses", id, "upsert", row);
  return row;
}

export async function deleteExpense(id) {
  const db = await getDB();
  const t = now();
  await run(db,"UPDATE expenses SET is_deleted=1, updated_at=? WHERE id=?", t, id);
  await enqueue("expenses", id, "delete", { id, isDeleted: true, updatedAt: t });
}

export async function listExpensesByPeriod(period) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT e.id, e.category_id AS categoryId, e.period, e.amount_minor AS amountMinor, e.note,
            e.occurred_at AS occurredAt, c.name AS categoryName, c.kind AS categoryKind
     FROM expenses e LEFT JOIN expense_categories c ON c.id = e.category_id
     WHERE e.is_deleted=0 AND e.period=? ORDER BY e.occurred_at DESC`,
    period
  );
}

export async function expenseTotalsByCategory(period) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT e.category_id AS categoryId, COALESCE(c.name, e.category_id) AS categoryName,
            c.kind AS categoryKind, SUM(e.amount_minor) AS spentMinor, COUNT(*) AS n
     FROM expenses e LEFT JOIN expense_categories c ON c.id = e.category_id
     WHERE e.is_deleted=0 AND e.period=?
     GROUP BY e.category_id ORDER BY spentMinor DESC`,
    period
  );
}

// Bills with this month's paid amount and the amount to pre-fill next time.
export async function billRows(period) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT c.id, c.name, c.due_day AS dueDay,
            c.default_amount_minor AS defaultAmountMinor,
            COALESCE((SELECT SUM(e.amount_minor) FROM expenses e
                      WHERE e.category_id=c.id AND e.period=? AND e.is_deleted=0),0) AS paidMinor,
            COALESCE((SELECT e.amount_minor FROM expenses e
                      WHERE e.category_id=c.id AND e.is_deleted=0
                      ORDER BY e.occurred_at DESC LIMIT 1),0) AS lastMinor
     FROM expense_categories c
     WHERE c.is_deleted=0 AND c.kind='bill' ORDER BY c.sort, c.name`,
    period
  );
}

// --------------------------------------------------------------------- payouts
// Money actually moved out of a set-aside bucket: tithe given, savings moved,
// community given (optionally to a project).
export async function addPayout({ bucket, category = null, projectId = null, amountMinor, note = null, occurredAt = null, period = null }) {
  const db = await getDB();
  const t = now();
  const at = occurredAt ?? (period ? stampInPeriod(period) : t);
  const id = uuid();
  const row = { id, bucket, category, projectId, amountMinor, note, occurredAt: at, period: period ?? periodOf(at), updatedAt: t };
  await run(db,
    `INSERT INTO payouts (id,bucket,category,project_id,amount_minor,note,occurred_at,period,user_id,updated_at,is_deleted,rev)
     VALUES (?,?,?,?,?,?,?,?,NULL,?,0,1)`,
    id, row.bucket, row.category, row.projectId, row.amountMinor, row.note, row.occurredAt, row.period, t
  );
  await enqueue("payouts", id, "upsert", row);
  if (projectId) await bumpProjectRaised(projectId, amountMinor);
  return row;
}

export async function listPayouts(limit = 100) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, bucket, category, project_id AS projectId, amount_minor AS amountMinor, note,
            occurred_at AS occurredAt, period
     FROM payouts WHERE is_deleted=0 ORDER BY occurred_at DESC LIMIT ?`,
    limit
  );
}

export async function listPayoutsByPeriod(period) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, bucket, category, project_id AS projectId, amount_minor AS amountMinor, note, occurred_at AS occurredAt
     FROM payouts WHERE is_deleted=0 AND period=? ORDER BY occurred_at DESC`,
    period
  );
}

// -------------------------------------------------------------------- projects
export async function listProjects() {
  const db = await getDB();
  return db.getAllAsync(
    "SELECT id,name,goal_minor AS goalMinor,raised_minor AS raisedMinor,cover_url AS coverUrl FROM projects_cache ORDER BY name"
  );
}

// Optimistic local credit; the server re-aggregates on the next pull.
export async function bumpProjectRaised(projectId, amountMinor) {
  const db = await getDB();
  await run(db,
    "UPDATE projects_cache SET raised_minor = raised_minor + ? WHERE id = ?",
    amountMinor, projectId
  );
}

// ------------------------------------------------------------ lifetime picture
// Totals the user cares about across all months: what is set aside, what has
// already been given, and what is still owed to each bucket.
export async function lifetimeTotals() {
  const db = await getDB();
  const inc = await db.getFirstAsync(
    `SELECT COALESCE(SUM(amount_minor),0) AS incomeMinor,
            COALESCE(SUM(tithe_minor),0) AS titheMinor,
            COALESCE(SUM(savings_minor),0) AS savingsMinor,
            COALESCE(SUM(emergency_minor),0) AS emergencyMinor,
            COALESCE(SUM(community_minor),0) AS communityMinor,
            COALESCE(SUM(spendable_minor),0) AS spendableMinor
     FROM income_entries WHERE is_deleted=0`
  );
  const paidRows = await db.getAllAsync(
    "SELECT bucket, COALESCE(SUM(amount_minor),0) AS total FROM payouts WHERE is_deleted=0 GROUP BY bucket"
  );
  const paid = { tithe: 0, savings: 0, community: 0 };
  for (const r of paidRows) paid[r.bucket] = r.total;

  const communityByCat = { ceremonies: 0, society: 0 };
  const catRows = await db.getAllAsync(
    `SELECT COALESCE(category,'society') AS category, COALESCE(SUM(amount_minor),0) AS total
     FROM payouts WHERE is_deleted=0 AND bucket='community' GROUP BY COALESCE(category,'society')`
  );
  for (const r of catRows) communityByCat[r.category] = r.total;

  const spentRow = await db.getFirstAsync(
    "SELECT COALESCE(SUM(amount_minor),0) AS spentMinor FROM expenses WHERE is_deleted=0"
  );

  const incomeMinor = inc?.incomeMinor ?? 0;
  const titheMinor = inc?.titheMinor ?? 0;
  const savingsMinor = inc?.savingsMinor ?? 0;
  const emergencyMinor = inc?.emergencyMinor ?? 0;
  const communityMinor = inc?.communityMinor ?? 0;
  const spendableMinor = inc?.spendableMinor ?? 0;
  const spentMinor = spentRow?.spentMinor ?? 0;

  return {
    incomeMinor,
    titheMinor, savingsMinor, emergencyMinor, communityMinor, spendableMinor, spentMinor,
    // Tithe, savings and emergency are treated as given/set aside the moment income arrives.
    tithePaid: titheMinor,
    savingsGiven: savingsMinor,
    emergencyGiven: emergencyMinor,
    communityGiven: paid.community,
    titheUnpaid: 0,
    savingsUnpaid: 0,
    emergencyUnpaid: 0,
    communityRemaining: communityMinor - paid.community,
    communityByCategory: communityByCat,
    spendableLeft: spendableMinor - spentMinor,
  };
}

// ---------------------------------------------------------------- sync plumbing
const SYNC_TABLES = ["allocation_rules", "income_entries", "expense_categories", "expenses", "payouts"];

export async function enqueue(tableName, rowId, op, payload) {
  const db = await getDB();
  await run(db,
    `INSERT INTO sync_queue (id,table_name,row_id,op,payload,created_at,tries) VALUES (?,?,?,?,?,?,0)`,
    uuid(), tableName, rowId, op, JSON.stringify(payload), now()
  );
}

export async function queueCount() {
  const db = await getDB();
  const r = await db.getFirstAsync("SELECT COUNT(*) AS n FROM sync_queue");
  return r?.n ?? 0;
}

export async function listQueue(limit = 200) {
  const db = await getDB();
  return db.getAllAsync(
    `SELECT id, table_name AS tableName, row_id AS rowId, op, payload, created_at AS createdAt, tries
     FROM sync_queue ORDER BY created_at ASC LIMIT ?`,
    limit
  );
}

export async function deleteQueue(ids) {
  if (!ids.length) return;
  const db = await getDB();
  const placeholders = ids.map(() => "?").join(",");
  await run(db,`DELETE FROM sync_queue WHERE id IN (${placeholders})`, ...ids);
}

// Server row → local row (same column names). tableName is whitelisted.
// Postgres hands back BIGINT as a string and BOOLEAN as true/false; SQLite wants
// numbers, so normalise before writing.
function normalize(value) {
  if (typeof value === "boolean") return value ? 1 : 0;
  if (typeof value === "string" && /^-?\d+$/.test(value)) return Number(value);
  return value;
}

export async function applyServerRow(tableName, row) {
  if (!SYNC_TABLES.includes(tableName) || !row?.id) return;
  const cols = Object.keys(row).filter((k) => k !== "id");
  if (!cols.length) return;
  const db = await getDB();
  await run(db,
    `UPDATE ${tableName} SET ${cols.map((c) => `${c} = ?`).join(", ")} WHERE id = ?`,
    ...cols.map((c) => normalize(row[c])),
    row.id
  );
}

export async function exportAll() {
  const db = await getDB();
  const [allocationRules, income, expenseCategories, expenses, payouts, projects] = await Promise.all([
    listAllocationRules(), db.getAllAsync("SELECT * FROM income_entries"),
    listExpenseCategories(), db.getAllAsync("SELECT * FROM expenses"),
    listPayouts(1000), listProjects(),
  ]);
  return {
    version: 2,
    exportedAt: now(),
    allocationRules,
    income,
    expenseCategories,
    expenses,
    payouts,
    projects,
  };
}
