// Sticky sayings shown on open and every few minutes while the app is used.
// Edit freely — one entry per idea; `theme` is only for your own grouping.
export const TIPS = [
  { id: "t1", theme: "budgeting", text: "A budget is telling your money where to go instead of wondering where it went." },
  { id: "t2", theme: "budgeting", text: "Plan the month before the month spends you." },
  { id: "t3", theme: "budgeting", text: "Track every franc for one week — you will find money you forgot you had." },

  { id: "t4", theme: "spending", text: "If you do not need it, a discount is still money spent." },
  { id: "t5", theme: "spending", text: "Buy what you need first, what you want second, and what impresses people last." },
  { id: "t6", theme: "spending", text: "Small daily leaks sink big monthly boats." },

  { id: "t7", theme: "saving", text: "Set aside your savings the day income arrives — not from what is left over." },
  { id: "t8", theme: "saving", text: "Pay your future self on payday, and the leftovers stop mattering." },
  { id: "t9", theme: "saving", text: "An emergency fund turns a crisis into an inconvenience." },

  { id: "t10", theme: "wealth", text: "Wealth is built in boring months, not lucky ones." },
  { id: "t11", theme: "wealth", text: "Own things that work while you sleep: a skill, a plot, a small business." },
  { id: "t12", theme: "wealth", text: "Debt eats tomorrow's income. Buy your freedom first." },

  { id: "t13", theme: "giving", text: "Ten percent given with joy costs less than one hundred percent kept with worry." },
  { id: "t14", theme: "giving", text: "Real wealth is measured by how many lives you lift." },
  { id: "t15", theme: "giving", text: "Give first, and the rest of your budget learns generosity." },

  { id: "t16", theme: "peace", text: "Peace of mind is the best return any investment will ever pay you." },
  { id: "t17", theme: "peace", text: "You can be generous, careful and free — all at the same time." },
  { id: "t18", theme: "peace", text: "Money is a tool for the life you want, not the life you show." },
];

export function randomTip(excludeId = null) {
  const pool = excludeId ? TIPS.filter((t) => t.id !== excludeId) : TIPS;
  return pool[Math.floor(Math.random() * pool.length)] ?? TIPS[0];
}
