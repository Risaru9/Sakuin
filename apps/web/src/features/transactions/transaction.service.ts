import { apiRequest } from "../../lib/api-client";
import { addToOfflineQueue } from "../../lib/offline-queue";
import type {
  CreateTransactionInput,
  CreateTransactionsBulkInput,
  Transaction,
  TransactionListResponse,
  TransactionSort,
  TransactionType,
  UpdateTransactionInput
} from "./transaction.types";

export type GetTransactionsParams = {
  page?: number;
  limit?: number;
  type?: TransactionType;
  categoryId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
  sort?: TransactionSort;
};

function setOptionalSearchParam(
  searchParams: URLSearchParams,
  key: string,
  value: string | undefined
) {
  const normalizedValue = value?.trim();

  if (normalizedValue) {
    searchParams.set(key, normalizedValue);
  }
}

export function getTransactions(params: GetTransactionsParams = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 10));

  if (params.type) {
    searchParams.set("type", params.type);
  }

  if (params.sort) {
    searchParams.set("sort", params.sort);
  }

  setOptionalSearchParam(searchParams, "categoryId", params.categoryId);
  setOptionalSearchParam(searchParams, "search", params.search);
  setOptionalSearchParam(searchParams, "startDate", params.startDate);
  setOptionalSearchParam(searchParams, "endDate", params.endDate);

  return apiRequest<TransactionListResponse>(
    `/api/transactions?${searchParams.toString()}`
  );
}

export async function createTransaction(input: CreateTransactionInput) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const offlineTx = addToOfflineQueue(input);
    const mockTx: Transaction = {
      id: offlineTx.offlineId,
      categoryId: input.categoryId,
      type: input.type,
      amount: input.amount,
      note: input.note ?? null,
      date: input.date,
      category: {
        id: input.categoryId,
        name: "Transaksi Offline",
        type: input.type,
        icon: null,
        color: null,
        isDefault: false
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sakuin:transaction-added"));
    }
    return mockTx;
  }

  const result = await apiRequest<Transaction>("/api/transactions", {
    method: "POST",
    body: input
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sakuin:transaction-added"));
  }
  return result;
}

export async function createTransactionsBulk(input: CreateTransactionsBulkInput) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const mockTransactions: Transaction[] = [];
    for (const tx of input.transactions) {
      const offlineTx = addToOfflineQueue(tx);
      mockTransactions.push({
        id: offlineTx.offlineId,
        categoryId: tx.categoryId,
        type: tx.type,
        amount: tx.amount,
        note: tx.note ?? null,
        date: tx.date,
        category: {
          id: tx.categoryId,
          name: "Transaksi Offline",
          type: tx.type,
          icon: null,
          color: null,
          isDefault: false
        },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("sakuin:transaction-added"));
    }
    return mockTransactions;
  }

  const result = await apiRequest<Transaction[]>("/api/transactions/bulk", {
    method: "POST",
    body: input
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sakuin:transaction-added"));
  }
  return result;
}

export function updateTransaction(
  transactionId: string,
  input: UpdateTransactionInput
) {
  return apiRequest<Transaction>(`/api/transactions/${transactionId}`, {
    method: "PUT",
    body: input
  });
}

export function deleteTransaction(transactionId: string) {
  return apiRequest<Transaction>(`/api/transactions/${transactionId}`, {
    method: "DELETE"
  });
}