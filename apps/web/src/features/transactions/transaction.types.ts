export type TransactionType = "INCOME" | "EXPENSE";

export type TransactionCategoryOption = {
  id: string;
  name: string;
  type: TransactionType;
};

export type TransactionCategory = {
  id: string;
  name: string;
  type: TransactionType;
  icon: string | null;
  color: string | null;
  isDefault?: boolean;
};

export type Transaction = {
  id: string;
  type: TransactionType;
  amount: string;
  note: string | null;
  date: string;
  categoryId: string;
  category: TransactionCategory;
  createdAt: string;
  updatedAt: string;
};

export type TransactionListResponse = {
  items: Transaction[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

export type CreateTransactionInput = {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note?: string;
};

export type UpdateTransactionInput = Partial<CreateTransactionInput>;