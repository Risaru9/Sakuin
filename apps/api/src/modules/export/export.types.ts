import type { z } from "zod";
import type { exportTransactionsQuerySchema } from "./export.schema.js";

export type ExportTransactionsQuery = z.infer<
  typeof exportTransactionsQuerySchema
>;

export type ExportTransactionRow = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note: string | null;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

export type ExportTransactionsFilters = {
  type: "INCOME" | "EXPENSE" | null;
  categoryId: string | null;
  startDate: string | null;
  endDate: string | null;
};

export type ExportTransactionsSummary = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  transactionCount: number;
};

export type ExportTransactionsData = {
  generatedAt: string;
  filters: ExportTransactionsFilters;
  summary: ExportTransactionsSummary;
  transactions: ExportTransactionRow[];
};