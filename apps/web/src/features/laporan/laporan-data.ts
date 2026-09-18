import type { Category } from "../categories/category.types";
import type { MonthlyTrendItem, SummaryCategoryItem } from "../summary/summary.types";
import { makeMonthKey, MONTH_NAMES, splitMonthKey } from "../beranda/beranda-data";

export type ReportKind = "EXPENSE" | "INCOME";

// ---------- category shares ----------

// Checked with the data-viz palette validator on the cream surface (#fff7e8): these three
// stay apart in every pair, also for colour-blind readers. More slices would not, so the
// rest folds into a neutral "Lainnya". Names and numbers are always printed in the legend.
export const SHARE_COLORS = ["#2a78d6", "#eb6834", "#1baf7a"] as const;
export const OTHER_SHARE_COLOR = "#a8a3b8";
const COLORED_SLICES = SHARE_COLORS.length;

// Preferred colour per category icon, so a category keeps its colour between months when
// the slot is free (car = blue, food = orange, bills = aqua, …).
const PREFERRED_SLOT: Record<string, number> = {
  car: 0,
  "book-open": 0,
  smartphone: 0,
  plane: 0,
  shirt: 0,
  wallet: 0,
  briefcase: 0,
  utensils: 1,
  coffee: 1,
  "shopping-bag": 1,
  gift: 1,
  house: 1,
  "paw-print": 1,
  banknote: 1,
  receipt: 2,
  "heart-pulse": 2,
  "gamepad-2": 2,
  "piggy-bank": 2,
  "trending-up": 2,
  "plus-circle": 2
};

export type ShareSlice = {
  key: string;
  name: string;
  amount: number;
  percent: number;
  color: string;
  /** Categories folded into this slice ("Lainnya"); 1 for a single category. */
  categoryCount: number;
};

/** Whole-number percentages that add up to exactly 100 (largest remainder). */
function toPercents(amounts: number[], total: number) {
  const raw = amounts.map((amount) => (amount / total) * 100);
  const floored = raw.map(Math.floor);
  let missing = 100 - floored.reduce((sum, value) => sum + value, 0);
  const order = raw
    .map((value, index) => ({ index, remainder: value - Math.floor(value) }))
    .sort((first, second) => second.remainder - first.remainder);

  for (const { index } of order) {
    if (missing <= 0) {
      break;
    }

    floored[index] += 1;
    missing -= 1;
  }

  return floored;
}

export function buildShares(items: SummaryCategoryItem[]): ShareSlice[] {
  const positive = items
    .map((item) => ({ item, amount: Number(item.totalAmount) }))
    .filter(({ amount }) => Number.isFinite(amount) && amount > 0)
    .sort((first, second) => second.amount - first.amount);
  const total = positive.reduce((sum, { amount }) => sum + amount, 0);

  if (total === 0) {
    return [];
  }

  const colored = positive.slice(0, COLORED_SLICES);
  const rest = positive.slice(COLORED_SLICES);
  const usedSlots = new Set<number>();

  const slices: Array<Omit<ShareSlice, "percent">> = colored.map(({ item, amount }) => {
    const preferred = PREFERRED_SLOT[item.categoryIcon ?? ""];
    const slot =
      preferred !== undefined && !usedSlots.has(preferred)
        ? preferred
        : [0, 1, 2].find((candidate) => !usedSlots.has(candidate)) ?? 0;
    usedSlots.add(slot);

    return {
      key: item.categoryId,
      name: item.categoryName,
      amount,
      color: SHARE_COLORS[slot],
      categoryCount: 1
    };
  });

  if (rest.length > 0) {
    slices.push({
      key: "other",
      name: rest.length === 1 ? rest[0].item.categoryName : "Lainnya",
      amount: rest.reduce((sum, { amount }) => sum + amount, 0),
      color: OTHER_SHARE_COLOR,
      categoryCount: rest.length
    });
  }

  const percents = toPercents(
    slices.map((slice) => slice.amount),
    total
  );

  return slices.map((slice, index) => ({ ...slice, percent: percents[index] }));
}

// ---------- month-to-month comparison ----------

export function previousMonthKey(monthKey: string) {
  const { year, month } = splitMonthKey(monthKey);
  return month === 1 ? makeMonthKey(year - 1, 12) : makeMonthKey(year, month - 1);
}

export type MonthComparison = {
  tone: "good" | "bad" | "neutral";
  direction: "up" | "down" | "same";
  text: string;
};

const amountFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

/**
 * "12% lebih hemat dari Agustus" for spending, "300.000 lebih banyak dari Agustus" for income.
 * Returns null when the previous month is outside the 12-month trend or was empty.
 */
export function compareWithPreviousMonth({
  kind,
  current,
  monthKey,
  currentMonthKey,
  trend
}: {
  kind: ReportKind;
  current: number;
  monthKey: string;
  currentMonthKey: string;
  trend: MonthlyTrendItem[];
}): MonthComparison | null {
  const previousKey = previousMonthKey(monthKey);
  const previousItem = trend.find((item) => item.month === previousKey);

  if (!previousItem) {
    return null;
  }

  const previous = Number(kind === "EXPENSE" ? previousItem.expense : previousItem.income);

  if (!Number.isFinite(previous) || previous <= 0) {
    return null;
  }

  const previousName = MONTH_NAMES[splitMonthKey(previousKey).month - 1];
  // The running month is only partly over, so say so instead of claiming a final result.
  const prefix = monthKey === currentMonthKey ? "Sejauh ini " : "";
  const difference = current - previous;

  if (Math.round(difference) === 0) {
    return { tone: "neutral", direction: "same", text: `${prefix}sama dengan ${previousName}` };
  }

  if (kind === "EXPENSE") {
    const percent = Math.max(1, Math.round((Math.abs(difference) / previous) * 100));

    return difference < 0
      ? { tone: "good", direction: "down", text: `${prefix}${percent}% lebih hemat dari ${previousName}` }
      : { tone: "bad", direction: "up", text: `${prefix}${percent}% lebih boros dari ${previousName}` };
  }

  const amountText = amountFormatter.format(Math.abs(difference));

  return difference > 0
    ? { tone: "good", direction: "up", text: `${prefix}${amountText} lebih banyak dari ${previousName}` }
    : { tone: "bad", direction: "down", text: `${prefix}${amountText} lebih sedikit dari ${previousName}` };
}

// ---------- budgets ----------

export type BudgetStatus = "ok" | "watch" | "over";

export type BudgetRow = {
  category: Category;
  spent: number;
  limit: number;
  /** Share of the limit used, capped at 100 for the bar. */
  percent: number;
  status: BudgetStatus;
  note: string;
};

export function getBudgetStatus(spent: number, limit: number): BudgetStatus {
  const ratio = spent / limit;

  if (ratio > 1) {
    return "over";
  }

  return ratio >= 0.8 ? "watch" : "ok";
}

export function describeBudget(spent: number, limit: number) {
  const left = limit - spent;

  if (left < 0) {
    return `Lewat batas ${amountFormatter.format(-left)}`;
  }

  if (left === 0) {
    return "Pas di batas";
  }

  return getBudgetStatus(spent, limit) === "watch"
    ? `Hampir batas · sisa ${amountFormatter.format(left)}`
    : `Sisa ${amountFormatter.format(left)}`;
}

/** Expense categories that have a monthly limit, most urgent first. */
export function buildBudgets(categories: Category[], expenseItems: SummaryCategoryItem[]): BudgetRow[] {
  const spentByCategory = new Map(
    expenseItems.map((item) => [item.categoryId, Number(item.totalAmount) || 0])
  );

  return categories
    .filter((category) => category.type === "EXPENSE" && (category.limit ?? 0) > 0)
    .map((category) => {
      const limit = category.limit ?? 0;
      const spent = spentByCategory.get(category.id) ?? 0;

      return {
        category,
        spent,
        limit,
        percent: Math.min(100, Math.round((spent / limit) * 100)),
        status: getBudgetStatus(spent, limit),
        note: describeBudget(spent, limit)
      };
    })
    .sort((first, second) => second.spent / second.limit - first.spent / first.limit);
}
