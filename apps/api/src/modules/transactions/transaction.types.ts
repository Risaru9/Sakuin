import type { z } from "zod";
import type {
  createTransactionSchema,
  createTransactionsBulkSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema
} from "./transaction.schema.js";
import type {
  TransactionResponse,
  TransactionListResponse as SharedTransactionListResponse
} from "@sakuin/shared";

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
export type CreateTransactionsBulkInput = z.infer<
  typeof createTransactionsBulkSchema
>;
export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;

export type { TransactionResponse };

export type TransactionListResponse = {
  items: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};