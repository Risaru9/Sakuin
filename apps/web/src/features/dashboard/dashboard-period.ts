import { getTransactions } from "../transactions/transaction.service";
import type { Transaction } from "../transactions/transaction.types";

export const DASHBOARD_MONTH_OPTIONS = [
  { value: 1, label: "Januari" },
  { value: 2, label: "Februari" },
  { value: 3, label: "Maret" },
  { value: 4, label: "April" },
  { value: 5, label: "Mei" },
  { value: 6, label: "Juni" },
  { value: 7, label: "Juli" },
  { value: 8, label: "Agustus" },
  { value: 9, label: "September" },
  { value: 10, label: "Oktober" },
  { value: 11, label: "November" },
  { value: 12, label: "Desember" }
] as const;

export type DashboardPeriodMonth =
  | (typeof DASHBOARD_MONTH_OPTIONS)[number]["value"]
  | "all";
export type DashboardPeriodYear = number | "all";

export function parseDashboardMonth(
  value: string | null,
  fallbackMonth: DashboardPeriodMonth
): DashboardPeriodMonth {
  if (value === "all") {
    return "all";
  }

  const numericValue = Number(value);

  if (DASHBOARD_MONTH_OPTIONS.some((month) => month.value === numericValue)) {
    return numericValue as DashboardPeriodMonth;
  }

  return fallbackMonth;
}

export function parseDashboardYear(
  value: string | null,
  fallbackYear: DashboardPeriodYear
): DashboardPeriodYear {
  if (value === "all") {
    return "all";
  }

  const numericValue = Number(value);

  if (
    Number.isInteger(numericValue) &&
    numericValue >= 1900 &&
    numericValue <= 9999
  ) {
    return numericValue;
  }

  return fallbackYear;
}

export function getDashboardPeriodLabel(
  month: DashboardPeriodMonth,
  year: DashboardPeriodYear
) {
  if (month !== "all" && year !== "all") {
    const monthLabel =
      DASHBOARD_MONTH_OPTIONS.find((option) => option.value === month)?.label ??
      "Bulan";

    return `${monthLabel} ${year}`;
  }

  if (year !== "all") {
    return `Tahun ${year}`;
  }

  return "Semua waktu";
}

export function getDashboardPeriodRange(
  month: DashboardPeriodMonth,
  year: DashboardPeriodYear
) {
  if (month === "all" || year === "all") {
    if (month === "all" && year !== "all") {
      return {
        startDate: new Date(year, 0, 1, 0, 0, 0, 0).toISOString(),
        endDate: new Date(year, 11, 31, 23, 59, 59, 999).toISOString()
      };
    }

    return null;
  }

  return {
    startDate: new Date(year, month - 1, 1, 0, 0, 0, 0).toISOString(),
    endDate: new Date(year, month, 0, 23, 59, 59, 999).toISOString()
  };
}

export async function getAllTransactionsForPeriod(input: {
  startDate: string;
  endDate: string;
}) {
  const allTransactions: Transaction[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const response = await getTransactions({
      page,
      limit: 100,
      startDate: input.startDate,
      endDate: input.endDate,
      sort: "date_desc"
    });

    allTransactions.push(...response.items);
    totalPages =
      response.pagination?.totalPages ?? response.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return allTransactions;
}

export function buildPeriodDashboardMetrics(transactions: Transaction[]) {
  const totals = transactions.reduce(
    (current, transaction) => {
      const amount = Number(transaction.amount ?? 0);

      if (transaction.type === "INCOME") {
        current.income += Number.isFinite(amount) ? amount : 0;
      }

      if (transaction.type === "EXPENSE") {
        current.expense += Number.isFinite(amount) ? amount : 0;
      }

      return current;
    },
    {
      income: 0,
      expense: 0
    }
  );

  return {
    totalIncome: totals.income.toFixed(2),
    totalExpense: totals.expense.toFixed(2),
    balance: (totals.income - totals.expense).toFixed(2),
    transactionCount: transactions.length,
    recentTransactions: transactions.slice(0, 5)
  };
}
