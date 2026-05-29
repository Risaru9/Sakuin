import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
import type { SummaryData, SummaryTransaction } from "../summary/summary.types";
import type {
  Transaction,
  TransactionListResponse,
  TransactionPagination,
  TransactionSort,
  TransactionType
} from "./transaction.types";

type TransactionListParams = {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: TransactionSort;
};

export type TransactionListCacheSnapshot = Array<
  [QueryKey, TransactionListResponse | undefined]
>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatSummaryAmount(value: number) {
  return value.toFixed(2);
}

function getCurrentMonthRange() {
  const now = new Date();

  return {
    startDate: new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0),
    endDate: new Date(now.getFullYear(), now.getMonth() + 1, 0, 0, 0, 0, 0)
  };
}

function isTransactionInCurrentMonth(transaction: Transaction) {
  const transactionDate = new Date(transaction.date);

  if (Number.isNaN(transactionDate.getTime())) {
    return false;
  }

  const { startDate, endDate } = getCurrentMonthRange();

  return transactionDate >= startDate && transactionDate < endDate;
}

function isTransactionToday(transaction: Transaction) {
  const transactionDate = new Date(transaction.date);

  if (Number.isNaN(transactionDate.getTime())) {
    return false;
  }

  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

  return transactionDate >= todayStart && transactionDate <= todayEnd;
}

function getLocalTodayDateString() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getSignedIncomeDelta(transaction: Transaction) {
  return transaction.type === "INCOME" ? toNumber(transaction.amount) : 0;
}

function getSignedExpenseDelta(transaction: Transaction) {
  return transaction.type === "EXPENSE" ? toNumber(transaction.amount) : 0;
}

function addAmount(value: string, delta: number) {
  return formatSummaryAmount(toNumber(value) + delta);
}

function subtractAmount(value: string, delta: number) {
  return formatSummaryAmount(toNumber(value) - delta);
}

function recalculateBalance(input: {
  income: string;
  expense: string;
}) {
  return formatSummaryAmount(toNumber(input.income) - toNumber(input.expense));
}

function mapTransactionToSummaryTransaction(
  transaction: Transaction
): SummaryTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: transaction.amount,
    note: transaction.note,
    date: transaction.date,
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color,
      isDefault: transaction.category.isDefault
    },
    createdAt: transaction.createdAt,
    updatedAt: transaction.updatedAt
  };
}

function sortSummaryTransactions(items: SummaryTransaction[]) {
  return [...items].sort((firstItem, secondItem) => {
    const dateDifference =
      new Date(secondItem.date).getTime() - new Date(firstItem.date).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return (
      new Date(secondItem.createdAt ?? 0).getTime() -
      new Date(firstItem.createdAt ?? 0).getTime()
    );
  });
}

function addRecentTransaction(
  recentTransactions: SummaryTransaction[],
  transaction: Transaction
) {
  const nextTransaction = mapTransactionToSummaryTransaction(transaction);

  const withoutDuplicate = recentTransactions.filter(
    (item) => item.id !== transaction.id
  );

  return sortSummaryTransactions([nextTransaction, ...withoutDuplicate]).slice(
    0,
    5
  );
}

function updateRecentTransaction(
  recentTransactions: SummaryTransaction[],
  transaction: Transaction
) {
  const exists = recentTransactions.some((item) => item.id === transaction.id);

  if (!exists) {
    return addRecentTransaction(recentTransactions, transaction);
  }

  return sortSummaryTransactions(
    recentTransactions.map((item) =>
      item.id === transaction.id
        ? mapTransactionToSummaryTransaction(transaction)
        : item
    )
  ).slice(0, 5);
}

function removeRecentTransaction(
  recentTransactions: SummaryTransaction[],
  transactionId: string
) {
  return recentTransactions.filter((item) => item.id !== transactionId);
}

function patchHabitForAdd(
  habit: SummaryData["habit"],
  transaction: Transaction
): SummaryData["habit"] {
  if (!habit) {
    return habit;
  }

  const transactionIsToday = isTransactionToday(transaction);
  const todayDateString = getLocalTodayDateString();

  if (!transactionIsToday) {
    return habit;
  }

  const isExpense = transaction.type === "EXPENSE";
  const isIncome = transaction.type === "INCOME";

  const previouslyHadTransactionToday = habit.hasTransactionToday;

  const updatedHabit = {
    ...habit,
    hasTransactionToday: true,
    currentStreakDays: !previouslyHadTransactionToday
      ? (habit.currentStreakDays ?? 0) + 1
      : (habit.currentStreakDays ?? 0),
    transactionsToday: (habit.transactionsToday ?? 0) + 1,
    todayTransactionCount: (habit.todayTransactionCount ?? 0) + 1,
    expenseTransactionsToday: isExpense
      ? (habit.expenseTransactionsToday ?? 0) + 1
      : (habit.expenseTransactionsToday ?? 0),
    todayExpenseCount: isExpense
      ? (habit.todayExpenseCount ?? 0) + 1
      : (habit.todayExpenseCount ?? 0),
    todayIncomeCount: isIncome
      ? (habit.todayIncomeCount ?? 0) + 1
      : (habit.todayIncomeCount ?? 0)
  };

  // Update dayRhythm entry untuk hari ini
  if (habit.dayRhythm && habit.dayRhythm.length === 7) {
    const updatedDayRhythm = habit.dayRhythm.map((day) => {
      if (day.date === todayDateString || day.isToday) {
        const newExpense = isExpense
          ? formatSummaryAmount(toNumber(day.expense) + toNumber(transaction.amount))
          : day.expense;
        const newIncome = isIncome
          ? formatSummaryAmount(toNumber(day.income) + toNumber(transaction.amount))
          : day.income;

        return {
          ...day,
          hasTransaction: true,
          transactionCount: day.transactionCount + 1,
          income: newIncome,
          expense: newExpense
        };
      }

      return day;
    });

    return {
      ...updatedHabit,
      dayRhythm: updatedDayRhythm
    };
  }

  return updatedHabit;
}

function patchHabitForDelete(
  habit: SummaryData["habit"],
  transaction: Transaction
): SummaryData["habit"] {
  if (!habit) {
    return habit;
  }

  const transactionIsToday = isTransactionToday(transaction);
  const todayDateString = getLocalTodayDateString();

  if (!transactionIsToday) {
    return habit;
  }

  const isExpense = transaction.type === "EXPENSE";
  const isIncome = transaction.type === "INCOME";

  const newTransactionsToday = Math.max((habit.transactionsToday ?? 0) - 1, 0);
  const newTodayTransactionCount = Math.max((habit.todayTransactionCount ?? 0) - 1, 0);
  const previouslyHadTransactionToday = habit.hasTransactionToday;

  const updatedHabit = {
    ...habit,
    hasTransactionToday: newTodayTransactionCount > 0,
    currentStreakDays: (previouslyHadTransactionToday && newTodayTransactionCount === 0)
      ? Math.max((habit.currentStreakDays ?? 0) - 1, 0)
      : (habit.currentStreakDays ?? 0),
    transactionsToday: newTransactionsToday,
    todayTransactionCount: newTodayTransactionCount,
    expenseTransactionsToday: isExpense
      ? Math.max((habit.expenseTransactionsToday ?? 0) - 1, 0)
      : (habit.expenseTransactionsToday ?? 0),
    todayExpenseCount: isExpense
      ? Math.max((habit.todayExpenseCount ?? 0) - 1, 0)
      : (habit.todayExpenseCount ?? 0),
    todayIncomeCount: isIncome
      ? Math.max((habit.todayIncomeCount ?? 0) - 1, 0)
      : (habit.todayIncomeCount ?? 0)
  };

  // Update dayRhythm entry untuk hari ini
  if (habit.dayRhythm && habit.dayRhythm.length === 7) {
    const updatedDayRhythm = habit.dayRhythm.map((day) => {
      if (day.date === todayDateString || day.isToday) {
        const newExpense = isExpense
          ? formatSummaryAmount(Math.max(toNumber(day.expense) - toNumber(transaction.amount), 0))
          : day.expense;
        const newIncome = isIncome
          ? formatSummaryAmount(Math.max(toNumber(day.income) - toNumber(transaction.amount), 0))
          : day.income;
        const newCount = Math.max(day.transactionCount - 1, 0);

        return {
          ...day,
          hasTransaction: newCount > 0,
          transactionCount: newCount,
          income: newIncome,
          expense: newExpense
        };
      }

      return day;
    });

    return {
      ...updatedHabit,
      dayRhythm: updatedDayRhythm
    };
  }

  return updatedHabit;
}

function patchSummaryAmountsForAdd(
  summary: SummaryData,
  transaction: Transaction
): SummaryData {
  const incomeDelta = getSignedIncomeDelta(transaction);
  const expenseDelta = getSignedExpenseDelta(transaction);

  const totalIncome = addAmount(summary.totalIncome, incomeDelta);
  const totalExpense = addAmount(summary.totalExpense, expenseDelta);

  const isCurrentMonth = isTransactionInCurrentMonth(transaction);

  const incomeThisMonth = isCurrentMonth
    ? addAmount(summary.incomeThisMonth, incomeDelta)
    : summary.incomeThisMonth;

  const expenseThisMonth = isCurrentMonth
    ? addAmount(summary.expenseThisMonth, expenseDelta)
    : summary.expenseThisMonth;

  return {
    ...summary,
    totalIncome,
    totalExpense,
    balance: recalculateBalance({
      income: totalIncome,
      expense: totalExpense
    }),
    incomeThisMonth,
    expenseThisMonth,
    balanceThisMonth: recalculateBalance({
      income: incomeThisMonth,
      expense: expenseThisMonth
    }),
    transactionCount: summary.transactionCount + 1,
    recentTransactions: addRecentTransaction(
      summary.recentTransactions,
      transaction
    ),
    habit: patchHabitForAdd(summary.habit, transaction)
  };
}

function patchSummaryAmountsForDelete(
  summary: SummaryData,
  transaction: Transaction
): SummaryData {
  const incomeDelta = getSignedIncomeDelta(transaction);
  const expenseDelta = getSignedExpenseDelta(transaction);

  const totalIncome = subtractAmount(summary.totalIncome, incomeDelta);
  const totalExpense = subtractAmount(summary.totalExpense, expenseDelta);

  const isCurrentMonth = isTransactionInCurrentMonth(transaction);

  const incomeThisMonth = isCurrentMonth
    ? subtractAmount(summary.incomeThisMonth, incomeDelta)
    : summary.incomeThisMonth;

  const expenseThisMonth = isCurrentMonth
    ? subtractAmount(summary.expenseThisMonth, expenseDelta)
    : summary.expenseThisMonth;

  return {
    ...summary,
    totalIncome,
    totalExpense,
    balance: recalculateBalance({
      income: totalIncome,
      expense: totalExpense
    }),
    incomeThisMonth,
    expenseThisMonth,
    balanceThisMonth: recalculateBalance({
      income: incomeThisMonth,
      expense: expenseThisMonth
    }),
    transactionCount: Math.max(summary.transactionCount - 1, 0),
    recentTransactions: removeRecentTransaction(
      summary.recentTransactions,
      transaction.id
    ),
    habit: patchHabitForDelete(summary.habit, transaction)
  };
}

function getTransactionCategoryId(transaction: Transaction) {
  return transaction.categoryId || transaction.category?.id || "";
}

function getPagination(data: TransactionListResponse) {
  return data.pagination ?? data.meta;
}

function getTransactionListParams(queryKey: QueryKey): TransactionListParams {
  for (const segment of queryKey) {
    if (!isRecord(segment)) {
      continue;
    }

    const maybeParams = segment as TransactionListParams;

    if (
      "page" in maybeParams ||
      "limit" in maybeParams ||
      "type" in maybeParams ||
      "categoryId" in maybeParams ||
      "search" in maybeParams ||
      "startDate" in maybeParams ||
      "endDate" in maybeParams ||
      "sort" in maybeParams
    ) {
      return maybeParams;
    }
  }

  return {};
}

function normalizeDateOnly(value: string | undefined) {
  if (!value) {
    return null;
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function transactionMatchesParams(
  transaction: Transaction,
  params: TransactionListParams
) {
  if (params.type && transaction.type !== params.type) {
    return false;
  }

  if (params.categoryId && getTransactionCategoryId(transaction) !== params.categoryId) {
    return false;
  }

  if (params.search?.trim()) {
    const search = params.search.trim().toLowerCase();
    const note = transaction.note?.toLowerCase() ?? "";

    if (!note.includes(search)) {
      return false;
    }
  }

  const transactionDate = normalizeDateOnly(transaction.date);
  const startDate = normalizeDateOnly(params.startDate);
  const endDate = normalizeDateOnly(params.endDate);

  if (startDate && transactionDate && transactionDate < startDate) {
    return false;
  }

  if (endDate && transactionDate && transactionDate > endDate) {
    return false;
  }

  return true;
}

function compareCreatedAtDesc(firstItem: Transaction, secondItem: Transaction) {
  return (
    new Date(secondItem.createdAt).getTime() -
    new Date(firstItem.createdAt).getTime()
  );
}

function sortTransactions(items: Transaction[], sort: TransactionSort | undefined) {
  const activeSort = sort ?? "date_desc";

  return [...items].sort((firstItem, secondItem) => {
    if (activeSort === "date_asc") {
      const dateDifference =
        new Date(firstItem.date).getTime() - new Date(secondItem.date).getTime();

      if (dateDifference !== 0) {
        return dateDifference;
      }

      return compareCreatedAtDesc(firstItem, secondItem);
    }

    if (activeSort === "created_desc") {
      return compareCreatedAtDesc(firstItem, secondItem);
    }

    if (activeSort === "created_asc") {
      return (
        new Date(firstItem.createdAt).getTime() -
        new Date(secondItem.createdAt).getTime()
      );
    }

    const dateDifference =
      new Date(secondItem.date).getTime() - new Date(firstItem.date).getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return compareCreatedAtDesc(firstItem, secondItem);
  });
}

function updatePaginationTotal(
  data: TransactionListResponse,
  totalDelta: number
): TransactionListResponse {
  const currentPagination = getPagination(data);

  if (!currentPagination) {
    return data;
  }

  const nextTotal = Math.max(currentPagination.total + totalDelta, 0);
  const nextPagination: TransactionPagination = {
    ...currentPagination,
    total: nextTotal,
    totalPages:
      nextTotal === 0 ? 0 : Math.ceil(nextTotal / currentPagination.limit)
  };

  return {
    ...data,
    pagination: data.pagination ? nextPagination : undefined,
    meta: data.meta ? nextPagination : undefined
  };
}

function trimPageItems(
  items: Transaction[],
  pagination: TransactionPagination | undefined
) {
  if (!pagination) {
    return items;
  }

  return items.slice(0, pagination.limit);
}

function addTransactionToList(
  data: TransactionListResponse,
  transaction: Transaction,
  params: TransactionListParams
): TransactionListResponse {
  if (!transactionMatchesParams(transaction, params)) {
    return data;
  }

  const currentPagination = getPagination(data);
  const currentPage = currentPagination?.page ?? params.page ?? 1;
  const alreadyExists = data.items.some((item) => item.id === transaction.id);

  if (alreadyExists) {
    return {
      ...data,
      items: sortTransactions(
        data.items.map((item) =>
          item.id === transaction.id ? transaction : item
        ),
        params.sort
      )
    };
  }

  const dataWithUpdatedTotal = updatePaginationTotal(data, 1);

  if (currentPage !== 1) {
    return dataWithUpdatedTotal;
  }

  const nextPagination = getPagination(dataWithUpdatedTotal);
  const nextItems = trimPageItems(
    sortTransactions([transaction, ...data.items], params.sort),
    nextPagination
  );

  return {
    ...dataWithUpdatedTotal,
    items: nextItems
  };
}

function updateTransactionInList(
  data: TransactionListResponse,
  transaction: Transaction,
  params: TransactionListParams
): TransactionListResponse {
  const existingIndex = data.items.findIndex((item) => item.id === transaction.id);
  const matches = transactionMatchesParams(transaction, params);

  if (existingIndex >= 0 && !matches) {
    return updatePaginationTotal(
      {
        ...data,
        items: data.items.filter((item) => item.id !== transaction.id)
      },
      -1
    );
  }

  if (existingIndex >= 0 && matches) {
    return {
      ...data,
      items: sortTransactions(
        data.items.map((item) =>
          item.id === transaction.id ? transaction : item
        ),
        params.sort
      )
    };
  }

  return data;
}

function removeTransactionFromList(
  data: TransactionListResponse,
  transactionId: string
): TransactionListResponse {
  const exists = data.items.some((item) => item.id === transactionId);

  if (!exists) {
    return data;
  }

  return updatePaginationTotal(
    {
      ...data,
      items: data.items.filter((item) => item.id !== transactionId)
    },
    -1
  );
}

function updateTransactionListCaches(
  queryClient: QueryClient,
  updater: (
    data: TransactionListResponse,
    params: TransactionListParams
  ) => TransactionListResponse
) {
  const transactionQueries = queryClient.getQueryCache().findAll({
    queryKey: queryKeys.transactions.all
  });

  for (const query of transactionQueries) {
    queryClient.setQueryData<TransactionListResponse>(
      query.queryKey,
      (currentData) => {
        if (!currentData) {
          return currentData;
        }

        return updater(currentData, getTransactionListParams(query.queryKey));
      }
    );
  }
}

export function getTransactionListCacheSnapshot(
  queryClient: QueryClient
): TransactionListCacheSnapshot {
  return queryClient.getQueriesData<TransactionListResponse>({
    queryKey: queryKeys.transactions.all
  });
}

export function restoreTransactionListCacheSnapshot(
  queryClient: QueryClient,
  snapshot: TransactionListCacheSnapshot | undefined
) {
  if (!snapshot) {
    return;
  }

  for (const [queryKey, data] of snapshot) {
    queryClient.setQueryData(queryKey, data);
  }
}

export function addTransactionToListCaches(
  queryClient: QueryClient,
  transaction: Transaction
) {
  updateTransactionListCaches(queryClient, (data, params) =>
    addTransactionToList(data, transaction, params)
  );
}

export function addTransactionsToListCaches(
  queryClient: QueryClient,
  transactions: Transaction[]
) {
  updateTransactionListCaches(queryClient, (data, params) =>
    transactions.reduce(
      (currentData, transaction) =>
        addTransactionToList(currentData, transaction, params),
      data
    )
  );
}

export function updateTransactionInListCaches(
  queryClient: QueryClient,
  transaction: Transaction
) {
  updateTransactionListCaches(queryClient, (data, params) =>
    updateTransactionInList(data, transaction, params)
  );
}

export function removeTransactionFromListCaches(
  queryClient: QueryClient,
  transactionId: string
) {
  updateTransactionListCaches(queryClient, (data) =>
    removeTransactionFromList(data, transactionId)
  );
}

export function getSummaryCacheSnapshot(queryClient: QueryClient) {
  return queryClient.getQueryData<SummaryData>(queryKeys.summary);
}

export function restoreSummaryCacheSnapshot(
  queryClient: QueryClient,
  snapshot: SummaryData | undefined
) {
  if (!snapshot) {
    return;
  }

  queryClient.setQueryData(queryKeys.summary, snapshot);
}

export function addTransactionToSummaryCache(
  queryClient: QueryClient,
  transaction: Transaction
) {
  queryClient.setQueryData<SummaryData>(queryKeys.summary, (currentSummary) => {
    if (!currentSummary) {
      return currentSummary;
    }

    return patchSummaryAmountsForAdd(currentSummary, transaction);
  });
}

export function addTransactionsToSummaryCache(
  queryClient: QueryClient,
  transactions: Transaction[]
) {
  queryClient.setQueryData<SummaryData>(queryKeys.summary, (currentSummary) => {
    if (!currentSummary) {
      return currentSummary;
    }

    return transactions.reduce(
      (summary, transaction) =>
        patchSummaryAmountsForAdd(summary, transaction),
      currentSummary
    );
  });
}

export function removeTransactionFromSummaryCache(
  queryClient: QueryClient,
  transaction: Transaction
) {
  queryClient.setQueryData<SummaryData>(queryKeys.summary, (currentSummary) => {
    if (!currentSummary) {
      return currentSummary;
    }

    return patchSummaryAmountsForDelete(currentSummary, transaction);
  });
}

export function updateTransactionInSummaryCache(
  queryClient: QueryClient,
  input: {
    previousTransaction: Transaction;
    nextTransaction: Transaction;
  }
) {
  queryClient.setQueryData<SummaryData>(queryKeys.summary, (currentSummary) => {
    if (!currentSummary) {
      return currentSummary;
    }

    const afterDelete = patchSummaryAmountsForDelete(
      currentSummary,
      input.previousTransaction
    );

    const afterAdd = patchSummaryAmountsForAdd(
      afterDelete,
      input.nextTransaction
    );

    return {
      ...afterAdd,
      transactionCount: currentSummary.transactionCount,
      recentTransactions: updateRecentTransaction(
        afterAdd.recentTransactions,
        input.nextTransaction
      )
    };
  });
}

export function markTransactionDerivedDataStale(
  queryClient: QueryClient,
  options: {
    includeCategories?: boolean;
  } = {}
) {
  void queryClient.invalidateQueries({
    queryKey: queryKeys.transactions.all,
    refetchType: "inactive"
  });

  void queryClient.invalidateQueries({
    queryKey: queryKeys.summary
  });

  if (options.includeCategories) {
    void queryClient.invalidateQueries({
      queryKey: queryKeys.categories,
      refetchType: "inactive"
    });
  }

  // Trigger update widget di Service Worker
  if (navigator.serviceWorker && navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: "UPDATE_WIDGET" });
  }
}