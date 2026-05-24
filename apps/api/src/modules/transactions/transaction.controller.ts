import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { recordAuditEventFromContext } from "../../utils/audit-event-recorder.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateTransactionInput,
  CreateTransactionsBulkInput,
  GetTransactionsQuery,
  TransactionIdParam,
  UpdateTransactionInput
} from "./transaction.types.js";
import {
  createTransaction,
  createTransactionsBulk,
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

function getChangedFields(input: UpdateTransactionInput) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field)
    .join(",");
}

function hasNonEmptyNote(note: string | null | undefined) {
  return Boolean(note?.trim());
}

export async function createTransactionController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateTransactionInput;

  const transaction = await createTransaction(userId, input);

  await recordAuditEventFromContext(c, {
    eventType: "transaction.created",
    status: "success",
    targetType: "transaction",
    targetId: transaction.id,
    metadata: {
      type: transaction.type,
      hasNote: hasNonEmptyNote(input.note),
      dateProvided: Boolean(input.date)
    }
  });

  return successResponse(c, "Transaksi berhasil dibuat", transaction, 201);
}

export async function createTransactionsBulkController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateTransactionsBulkInput;

  const transactions = await createTransactionsBulk(userId, input);

  for (const [index, transaction] of transactions.entries()) {
    const transactionInput = input.transactions[index];

    await recordAuditEventFromContext(c, {
      eventType: "transaction.created",
      status: "success",
      targetType: "transaction",
      targetId: transaction.id,
      metadata: {
        type: transaction.type,
        hasNote: hasNonEmptyNote(transactionInput?.note),
        dateProvided: Boolean(transactionInput?.date),
        source: "bulk"
      }
    });
  }

  return successResponse(c, "Daftar transaksi berhasil dibuat", transactions, 201);
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

  await recordAuditEventFromContext(c, {
    eventType: "transaction.updated",
    status: "success",
    targetType: "transaction",
    targetId: transaction.id,
    metadata: {
      changedFields: getChangedFields(input),
      hasNote: input.note !== undefined ? hasNonEmptyNote(input.note) : null
    }
  });

  return successResponse(c, "Transaksi berhasil diupdate", transaction);
}

export async function deleteTransactionController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as TransactionIdParam;

  const transaction = await deleteTransaction(userId, param.id);

  await recordAuditEventFromContext(c, {
    eventType: "transaction.deleted",
    status: "success",
    targetType: "transaction",
    targetId: transaction.id,
    metadata: {
      reason: "user_requested"
    }
  });

  return successResponse(c, "Transaksi berhasil dihapus", transaction);
}