import { apiRequest } from "../../lib/api-client";
import type {
  CreateTransactionInput,
  Transaction,
  TransactionListResponse,
  TransactionType,
  UpdateTransactionInput
} from "./transaction.types";

type GetTransactionsParams = {
  page?: number;
  limit?: number;
  type?: TransactionType;
};

export function getTransactions(params: GetTransactionsParams = {}) {
  const searchParams = new URLSearchParams();

  searchParams.set("page", String(params.page ?? 1));
  searchParams.set("limit", String(params.limit ?? 100));

  if (params.type) {
    searchParams.set("type", params.type);
  }

  return apiRequest<TransactionListResponse>(
    `/api/transactions?${searchParams.toString()}`
  );
}

export function createTransaction(input: CreateTransactionInput) {
  return apiRequest<Transaction>("/api/transactions", {
    method: "POST",
    body: input
  });
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