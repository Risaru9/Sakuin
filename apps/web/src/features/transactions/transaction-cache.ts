import type { QueryClient, QueryKey } from "@tanstack/react-query";
import { queryKeys } from "../../lib/query-keys";
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
      queryKey: queryKeys.categories
    });
  }
}