import type { TransactionCategoryOption, TransactionType } from "./transaction.types";

export const TRANSACTION_CATEGORY_OPTIONS: TransactionCategoryOption[] = [
  {
    id: "cat_income_salary",
    name: "Gaji",
    type: "INCOME"
  },
  {
    id: "cat_expense_food",
    name: "Makanan",
    type: "EXPENSE"
  }
];

export function getCategoriesByType(type: TransactionType) {
  return TRANSACTION_CATEGORY_OPTIONS.filter((category) => category.type === type);
}

export function getDefaultCategoryId(type: TransactionType) {
  return getCategoriesByType(type)[0]?.id ?? "";
}