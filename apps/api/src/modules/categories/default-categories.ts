export type DefaultCategory = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string;
  color: string;
  isDefault: true;
};

export const defaultCategories = [
  {
    id: "cat_income_salary",
    name: "Gaji",
    type: "INCOME",
    icon: "wallet",
    color: "#22c55e",
    isDefault: true
  },
  {
    id: "cat_income_bonus",
    name: "Bonus",
    type: "INCOME",
    icon: "gift",
    color: "#84cc16",
    isDefault: true
  },
  {
    id: "cat_income_other",
    name: "Pemasukan Lainnya",
    type: "INCOME",
    icon: "plus-circle",
    color: "#14b8a6",
    isDefault: true
  },
  {
    id: "cat_expense_food",
    name: "Makanan",
    type: "EXPENSE",
    icon: "utensils",
    color: "#f97316",
    isDefault: true
  },
  {
    id: "cat_expense_transport",
    name: "Transportasi",
    type: "EXPENSE",
    icon: "car",
    color: "#3b82f6",
    isDefault: true
  },
  {
    id: "cat_expense_shopping",
    name: "Belanja",
    type: "EXPENSE",
    icon: "shopping-bag",
    color: "#ec4899",
    isDefault: true
  },
  {
    id: "cat_expense_education",
    name: "Pendidikan",
    type: "EXPENSE",
    icon: "book-open",
    color: "#8b5cf6",
    isDefault: true
  },
  {
    id: "cat_expense_health",
    name: "Kesehatan",
    type: "EXPENSE",
    icon: "heart-pulse",
    color: "#ef4444",
    isDefault: true
  },
  {
    id: "cat_expense_bill",
    name: "Tagihan",
    type: "EXPENSE",
    icon: "receipt",
    color: "#64748b",
    isDefault: true
  },
  {
    id: "cat_expense_other",
    name: "Pengeluaran Lainnya",
    type: "EXPENSE",
    icon: "minus-circle",
    color: "#6b7280",
    isDefault: true
  }
] satisfies DefaultCategory[];
