import { getLocalDateKey } from "../../lib/daily-review";
import type { OfflineTransaction } from "../../lib/offline-queue";
import type { Category } from "../categories/category.types";
import type { SafeToSpendData } from "../summary/summary.types";
import { getTransactions, type GetTransactionsParams } from "../transactions/transaction.service";
import type { Transaction, TransactionListResponse } from "../transactions/transaction.types";

// ---------- months ----------

const MONTH_KEY_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;

export const MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
] as const;

export const MONTH_SHORT_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "Mei",
  "Jun",
  "Jul",
  "Agu",
  "Sep",
  "Okt",
  "Nov",
  "Des"
] as const;

// Month keys are local "YYYY-MM", the same shape the summary API uses for monthlyTrend.
export function parseMonthKey(value: string | null | undefined, fallback: string) {
  return value && MONTH_KEY_PATTERN.test(value) ? value : fallback;
}

export function splitMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);

  return { year, month };
}

export function makeMonthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function formatMonthLabel(monthKey: string) {
  const { year, month } = splitMonthKey(monthKey);

  return `${MONTH_NAMES[month - 1]} ${year}`;
}

// ---------- fetching a whole month ----------

const API_PAGE_SIZE = 100;
// Reported to the cache instead of the API page size: the optimistic helpers trim a list to
// its page limit, and this list is the whole month, so it must never be trimmed.
const WHOLE_MONTH_LIMIT = 100_000;

/** Query params for one month; also the list-cache key, so optimistic saves land in it. */
export function getMonthListParams(monthKey: string) {
  const { year, month } = splitMonthKey(monthKey);

  return {
    page: 1,
    limit: API_PAGE_SIZE,
    startDate: new Date(year, month - 1, 1).toISOString(),
    endDate: new Date(year, month, 0, 23, 59, 59, 999).toISOString(),
    sort: "date_desc"
  } satisfies GetTransactionsParams;
}

export async function fetchWholeMonth(
  params: ReturnType<typeof getMonthListParams>
): Promise<TransactionListResponse> {
  const byId = new Map<string, Transaction>();
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getTransactions({ ...params, page });

    for (const item of response.items) {
      byId.set(item.id, item);
    }

    totalPages = (response.pagination ?? response.meta)?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  const items = [...byId.values()];

  return {
    items,
    pagination: {
      page: 1,
      limit: WHOLE_MONTH_LIMIT,
      total: items.length,
      totalPages: items.length > 0 ? 1 : 0
    }
  };
}

// ---------- offline entries ----------

export function isPendingTransaction(transaction: Pick<Transaction, "id">) {
  return transaction.id.startsWith("offline-");
}

/** Shows a queued offline entry like a normal row, with its real category. */
export function offlineEntryToTransaction(
  entry: OfflineTransaction,
  categories: Category[]
): Transaction {
  const category = categories.find((item) => item.id === entry.categoryId);

  return {
    id: entry.offlineId,
    type: entry.type,
    amount: entry.amount,
    note: entry.note ?? null,
    date: entry.date,
    categoryId: entry.categoryId,
    category: category
      ? {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          isDefault: category.isDefault
        }
      : { id: entry.categoryId, name: "Kategori", type: entry.type, icon: null, color: null },
    createdAt: entry.queuedAt,
    updatedAt: entry.queuedAt
  };
}

// ---------- the month view ----------

export type DayGroup = {
  dateKey: string;
  label: string;
  expense: number;
  income: number;
  items: Transaction[];
};

export type MonthTotals = {
  expense: number;
  income: number;
  balance: number;
};

export type MonthView = {
  groups: DayGroup[];
  totals: MonthTotals;
  count: number;
};

const dayLabelFormatter = new Intl.DateTimeFormat("id-ID", {
  weekday: "long",
  day: "numeric",
  month: "short"
});

function dateFromKey(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return new Date(year, month - 1, day);
}

export function formatDayLabel(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) {
    return "Hari ini";
  }

  const yesterday = dateFromKey(todayKey);
  yesterday.setDate(yesterday.getDate() - 1);

  if (dateKey === getLocalDateKey(yesterday)) {
    return "Kemarin";
  }

  return dayLabelFormatter.format(dateFromKey(dateKey));
}

export function transactionDateKey(transaction: Pick<Transaction, "date">) {
  return getLocalDateKey(new Date(transaction.date));
}

function newestFirst(first: Transaction, second: Transaction) {
  const byDate = new Date(second.date).getTime() - new Date(first.date).getTime();

  if (byDate !== 0) {
    return byDate;
  }

  return new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime();
}

export function buildMonthView({
  items,
  pending,
  monthKey,
  todayKey
}: {
  items: Transaction[];
  /** Entries still waiting in the offline queue. */
  pending: Transaction[];
  monthKey: string;
  todayKey: string;
}): MonthView {
  const pendingIds = new Set(pending.map((transaction) => transaction.id));
  const byId = new Map<string, Transaction>();

  for (const item of items) {
    // A cached offline row whose queue entry is gone has been synced (or undone).
    if (isPendingTransaction(item) && !pendingIds.has(item.id)) {
      continue;
    }

    byId.set(item.id, item);
  }

  for (const entry of pending) {
    byId.set(entry.id, entry);
  }

  const inMonth = [...byId.values()]
    .filter((transaction) => transactionDateKey(transaction).startsWith(`${monthKey}-`))
    .sort(newestFirst);

  const groups: DayGroup[] = [];
  const totals: MonthTotals = { expense: 0, income: 0, balance: 0 };

  for (const transaction of inMonth) {
    const dateKey = transactionDateKey(transaction);
    let group = groups[groups.length - 1];

    if (!group || group.dateKey !== dateKey) {
      group = { dateKey, label: formatDayLabel(dateKey, todayKey), expense: 0, income: 0, items: [] };
      groups.push(group);
    }

    const amount = Number(transaction.amount);
    const safeAmount = Number.isFinite(amount) ? amount : 0;

    if (transaction.type === "INCOME") {
      group.income += safeAmount;
      totals.income += safeAmount;
    } else {
      group.expense += safeAmount;
      totals.expense += safeAmount;
    }

    group.items.push(transaction);
  }

  totals.balance = totals.income - totals.expense;

  return { groups, totals, count: inMonth.length };
}

export function searchMonthView(
  view: MonthView,
  { query, type, categoryId }: { query: string; type: "ALL" | "INCOME" | "EXPENSE"; categoryId: string | null }
) {
  const needle = query.trim().toLowerCase();
  const items = view.groups
    .flatMap((group) => group.items)
    .filter((transaction) => {
      if (type !== "ALL" && transaction.type !== type) {
        return false;
      }

      if (categoryId && transaction.categoryId !== categoryId) {
        return false;
      }

      if (!needle) {
        return true;
      }

      return (
        (transaction.note ?? "").toLowerCase().includes(needle) ||
        transaction.category.name.toLowerCase().includes(needle)
      );
    });

  return items;
}

// ---------- header helpers ----------

const amountFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

export function formatPlainAmount(value: number) {
  return amountFormatter.format(Math.round(value));
}

/** "82 rb", "2,26 jt" — short enough for the header pill and the month grid. */
export function formatCompactAmount(value: number) {
  const absolute = Math.abs(value);

  if (absolute >= 1_000_000) {
    return `${(absolute / 1_000_000).toLocaleString("id-ID", { maximumFractionDigits: 2 })} jt`;
  }

  if (absolute >= 1_000) {
    return `${Math.round(absolute / 1_000).toLocaleString("id-ID")} rb`;
  }

  return Math.round(absolute).toLocaleString("id-ID");
}

export type StatusTone = "safe" | "watch" | "hold";

export type StatusPill = {
  tone: StatusTone;
  text: string;
};

export function describeSafeToSpend(safeToSpend: SafeToSpendData | null | undefined): StatusPill | null {
  if (!safeToSpend || safeToSpend.status === "UNKNOWN") {
    return null;
  }

  const dailyLimit = safeToSpend.suggestedDailyLimit;
  const perDay = dailyLimit !== null && dailyLimit > 0 ? ` · ±${formatCompactAmount(dailyLimit)}/hari` : "";

  if (safeToSpend.status === "SAFE") {
    return { tone: "safe", text: `Masih aman${perDay}` };
  }

  if (safeToSpend.status === "WATCH") {
    return { tone: "watch", text: `Mulai hati-hati${perDay}` };
  }

  return { tone: "hold", text: "Rem dulu, ya" };
}
