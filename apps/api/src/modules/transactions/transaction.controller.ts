import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateTransactionInput,
  GetTransactionsQuery,
  TransactionIdParam,
  UpdateTransactionInput
} from "./transaction.types.js";
import {
  createTransaction,
  deleteTransaction,
  getTransactionById,
  getTransactions,
  updateTransaction
} from "./transaction.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function createTransactionController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateTransactionInput;

  const transaction = await createTransaction(userId, input);

  return successResponse(c, "Transaksi berhasil dibuat", transaction, 201);
}

export async function getTransactionsController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const query = c.get("validatedQuery") as GetTransactionsQuery;

  const transactions = await getTransactions(userId, query);

  return successResponse(c, "Daftar transaksi berhasil diambil", transactions);
}

export async function getTransactionDetailController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as TransactionIdParam;

  const transaction = await getTransactionById(userId, param.id);

  return successResponse(c, "Detail transaksi berhasil diambil", transaction);
}

export async function updateTransactionController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as TransactionIdParam;
  const input = c.get("validatedJson") as UpdateTransactionInput;

  const transaction = await updateTransaction(userId, param.id, input);

  return successResponse(c, "Transaksi berhasil diupdate", transaction);
}

export async function deleteTransactionController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as TransactionIdParam;

  const transaction = await deleteTransaction(userId, param.id);

  return successResponse(c, "Transaksi berhasil dihapus", transaction);
}