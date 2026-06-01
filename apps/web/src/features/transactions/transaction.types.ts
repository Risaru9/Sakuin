import type {
  CategoryType,
  TransactionCategory,
  Transaction,
  TransactionPagination,
  TransactionListResponse,
  CreateTransactionInput,
  CreateTransactionsBulkInput,
  UpdateTransactionInput
} from "@sakuin/shared";

export type TransactionType = CategoryType;

export type TransactionSort =
  | "date_desc"
  | "date_asc"
  | "created_desc"
  | "created_asc";

export type TransactionCategoryOption = {
  id: string;
  name: string;
  type: TransactionType;
};

export type {
  TransactionCategory,
  Transaction,
  TransactionPagination,
  TransactionListResponse,
  CreateTransactionInput,
  CreateTransactionsBulkInput,
  UpdateTransactionInput
};