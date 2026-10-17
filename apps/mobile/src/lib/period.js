// Month buckets ("periods") — the pot every income and expense belongs to.
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

export function periodOf(ms) {
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function currentPeriod() {
  return periodOf(Date.now());
}

export function periodLabel(period) {
  const [y, m] = String(period).split("-");
  return `${MONTHS[Number(m) - 1] ?? period} ${y}`;
}

export function shiftPeriod(period, delta) {
  const [y, m] = String(period).split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

// Milliseconds inside a period (now when it is the current month, otherwise the
// last day of that month) so past-month entries land in the right pot.
export function stampInPeriod(period, day = null) {
  const current = currentPeriod();
  if (period === current) return Date.now();
  const [y, m] = String(period).split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const d = day && day <= lastDay ? day : lastDay;
  return new Date(y, m - 1, d, 12, 0, 0).getTime();
}

export const periodMonths = MONTHS;
