import { QueryClient } from "@tanstack/react-query";
import { describe, expect, it } from "vitest";
import { queryKeys } from "../../lib/query-keys";
import type { Transaction, TransactionListResponse } from "./transaction.types";
import {
  addTransactionsToListCaches,
  getTransactionListCacheSnapshot,
  removeTransactionFromListCaches
} from "./transaction-cache";

function createTransaction(input: Partial<Transaction> = {}): Transaction {
  return {
    id: input.id ?? "tx-1",
    type: input.type ?? "EXPENSE",
    amount: input.amount ?? "10000",
    note: input.note ?? "Test transaksi",
    date: input.date ?? "2026-06-04T00:00:00.000Z",
    categoryId: input.categoryId ?? "cat-expense-food",
    category: input.category ?? {
      id: input.categoryId ?? "cat-expense-food",
      name: "Makanan",
      type: input.type ?? "EXPENSE",
      icon: null,
      color: null,
      isDefault: true
    },
    createdAt: input.createdAt ?? "2026-06-04T00:00:00.000Z",
    updatedAt: input.updatedAt ?? "2026-06-04T00:00:00.000Z"
  };
}

function createTransactionList(
  transactions: Transaction[] = []
): TransactionListResponse {
  return {
    items: transactions,
    pagination: {
      page: 1,
      limit: 10,
      total: transactions.length,
      totalPages: transactions.length > 0 ? 1 : 0
    }
  };
}

describe("transaction-cache", () => {
  it("only patches paginated transaction list caches", () => {
    const queryClient = new QueryClient();
    const transaction = createTransaction();
    const dashboardPeriodKey = [
      ...queryKeys.transactions.all,
      "dashboard-period",
      "2026-06-01",
      "2026-06-30"
    ] as const;

    queryClient.setQueryData(dashboardPeriodKey, [transaction]);
    queryClient.setQueryData(
      queryKeys.transactions.list({ page: 1, limit: 10 }),
      createTransactionList()
    );

    expect(() =>
      addTransactionsToListCaches(queryClient, [transaction])
    ).not.toThrow();

    expect(queryClient.getQueryData(dashboardPeriodKey)).toEqual([transaction]);
    expect(
      queryClient.getQueryData<TransactionListResponse>(
        queryKeys.transactions.list({ page: 1, limit: 10 })
      )?.items
    ).toHaveLength(1);
  });

  it("does not snapshot dashboard transaction arrays as paginated list caches", () => {
    const queryClient = new QueryClient();
    const transaction = createTransaction();

    queryClient.setQueryData(
      [...queryKeys.transactions.all, "dashboard-period", "a", "b"],
      [transaction]
    );
    queryClient.setQueryData(
      queryKeys.transactions.list({ page: 1, limit: 10 }),
      createTransactionList([transaction])
    );

    const snapshot = getTransactionListCacheSnapshot(queryClient);

    expect(snapshot).toHaveLength(1);
    expect(snapshot[0][0]).toEqual(
      queryKeys.transactions.list({ page: 1, limit: 10 })
    );
  });

  it("ignores malformed transaction list cache data instead of throwing", () => {
    const queryClient = new QueryClient();
    const malformedListKey = queryKeys.transactions.list({ page: 1, limit: 10 });

    queryClient.setQueryData(malformedListKey, { data: [] });

    expect(() =>
      removeTransactionFromListCaches(queryClient, "tx-unknown")
    ).not.toThrow();
    expect(queryClient.getQueryData(malformedListKey)).toEqual({ data: [] });
  });
});
