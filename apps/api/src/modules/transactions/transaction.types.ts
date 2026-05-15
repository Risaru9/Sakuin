import type { z } from "zod";
import type {
  createTransactionSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema
} from "./transaction.schema.js";

export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;

export type UpdateTransactionInput = z.infer<typeof updateTransactionSchema>;

export type GetTransactionsQuery = z.infer<typeof getTransactionsQuerySchema>;

export type TransactionIdParam = z.infer<typeof transactionIdParamSchema>;

export type TransactionResponse = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
    isDefault: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type TransactionListResponse = {
  items: TransactionResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};