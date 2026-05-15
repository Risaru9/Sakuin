import { PrismaClient, TransactionType } from "@prisma/client";

const prisma = new PrismaClient();

const defaultCategories = [
  {
    id: "cat_income_salary",
    name: "Gaji",
    type: TransactionType.INCOME,
    icon: "wallet",
    color: "#22c55e",
    isDefault: true
  },
  {
    id: "cat_income_bonus",
    name: "Bonus",
    type: TransactionType.INCOME,
    icon: "gift",
    color: "#84cc16",
    isDefault: true
  },
  {
    id: "cat_income_other",
    name: "Pemasukan Lainnya",
    type: TransactionType.INCOME,
    icon: "plus-circle",
    color: "#14b8a6",
    isDefault: true
  },
  {
    id: "cat_expense_food",
    name: "Makanan",
    type: TransactionType.EXPENSE,
    icon: "utensils",
    color: "#f97316",
    isDefault: true
  },
  {
    id: "cat_expense_transport",
    name: "Transportasi",
    type: TransactionType.EXPENSE,
    icon: "car",
    color: "#3b82f6",
    isDefault: true
  },
  {
    id: "cat_expense_shopping",
    name: "Belanja",
    type: TransactionType.EXPENSE,
    icon: "shopping-bag",
    color: "#ec4899",
    isDefault: true
  },
  {
    id: "cat_expense_education",
    name: "Pendidikan",
    type: TransactionType.EXPENSE,
    icon: "book-open",
    color: "#8b5cf6",
    isDefault: true
  },
  {
    id: "cat_expense_health",
    name: "Kesehatan",
    type: TransactionType.EXPENSE,
    icon: "heart-pulse",
    color: "#ef4444",
    isDefault: true
  },
  {
    id: "cat_expense_bill",
    name: "Tagihan",
    type: TransactionType.EXPENSE,
    icon: "receipt",
    color: "#64748b",
    isDefault: true
  },
  {
    id: "cat_expense_other",
    name: "Pengeluaran Lainnya",
    type: TransactionType.EXPENSE,
    icon: "minus-circle",
    color: "#6b7280",
    isDefault: true
  }
];

async function main() {
  for (const category of defaultCategories) {
    await prisma.category.upsert({
      where: {
        id: category.id
      },
      update: {
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isDefault: category.isDefault
      },
      create: category
    });
  }

  console.log("Default categories seeded successfully.");
}

main()
  .catch((error) => {
    console.error("Failed to seed database:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });