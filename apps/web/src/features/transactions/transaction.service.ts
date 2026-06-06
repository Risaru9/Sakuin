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
  accountId?: string;
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

function isNetworkFailure(error: unknown) {
  if (error instanceof TypeError) {
    return true;
  }

  if (!(error instanceof Error)) {
    return false;
  }

  return /failed to fetch|networkerror|network request failed|load failed/i.test(
    error.message
  );
}

function toOfflineTransaction(input: CreateTransactionInput): Transaction {
  const offlineTx = addToOfflineQueue(input);

  return {
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
}

function dispatchTransactionAdded() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("sakuin:transaction-added"));
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
  setOptionalSearchParam(searchParams, "accountId", params.accountId);
  setOptionalSearchParam(searchParams, "search", params.search);
  setOptionalSearchParam(searchParams, "startDate", params.startDate);
  setOptionalSearchParam(searchParams, "endDate", params.endDate);

  return apiRequest<TransactionListResponse>(
    `/api/transactions?${searchParams.toString()}`
  );
}

export async function createTransaction(input: CreateTransactionInput) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const mockTx = toOfflineTransaction(input);
    dispatchTransactionAdded();
    return mockTx;
  }

  try {
    const result = await apiRequest<Transaction>("/api/transactions", {
      method: "POST",
      body: input
    });
    dispatchTransactionAdded();
    return result;
  } catch (error) {
    if (!isNetworkFailure(error)) {
      throw error;
    }

    const mockTx = toOfflineTransaction(input);
    dispatchTransactionAdded();
    return mockTx;
  }
}

export async function createTransactionsBulk(input: CreateTransactionsBulkInput) {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    const mockTransactions = input.transactions.map(toOfflineTransaction);
    dispatchTransactionAdded();
    return mockTransactions;
  }

  try {
    const result = await apiRequest<Transaction[]>("/api/transactions/bulk", {
      method: "POST",
      body: input
    });
    dispatchTransactionAdded();
    return result;
  } catch (error) {
    if (!isNetworkFailure(error)) {
      throw error;
    }

    const mockTransactions = input.transactions.map(toOfflineTransaction);
    dispatchTransactionAdded();
    return mockTransactions;
  }
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
