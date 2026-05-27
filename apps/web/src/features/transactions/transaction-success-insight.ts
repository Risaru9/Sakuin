import type { SummaryData, SummaryCategoryItem } from "../summary/summary.types";
import type { Transaction } from "./transaction.types";

type BuildTransactionSuccessInsightInput = {
  transactions: Transaction[];
  previousSummary?: SummaryData;
  createdCategoryCount?: number;
  referenceDate?: Date;
};

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function isTransactionInReferenceMonth(
  transaction: Transaction,
  referenceDate: Date
) {
  const transactionDate = new Date(transaction.date);

  if (Number.isNaN(transactionDate.getTime())) {
    return false;
  }

  return getMonthKey(transactionDate) === getMonthKey(referenceDate);
}

function getCategorySummaryItem(
  items: SummaryCategoryItem[] | undefined,
  transaction: Transaction
) {
  return items?.find(
    (item) =>
      item.categoryId === transaction.category.id ||
      item.categoryName.toLowerCase() === transaction.category.name.toLowerCase()
  );
}

function appendCategoryText(description: string, createdCategoryCount: number) {
  if (createdCategoryCount <= 0) {
    return description;
  }

  return `${description} ${createdCategoryCount} kategori baru juga siap dipakai lagi.`;
}

export function buildTransactionSuccessInsight({
  transactions,
  previousSummary,
  createdCategoryCount = 0,
  referenceDate = new Date()
}: BuildTransactionSuccessInsightInput) {
  const savedCount = transactions.length;

  if (savedCount === 0) {
    return appendCategoryText(
      "Belum ada transaksi baru yang disimpan.",
      createdCategoryCount
    );
  }

  const totalTransactionCount =
    (previousSummary?.transactionCount ?? 0) + savedCount;
  const currentMonthTransactions = transactions.filter((transaction) =>
    isTransactionInReferenceMonth(transaction, referenceDate)
  );
  const currentMonthExpenses = currentMonthTransactions.filter(
    (transaction) => transaction.type === "EXPENSE"
  );
  const currentMonthIncomes = currentMonthTransactions.filter(
    (transaction) => transaction.type === "INCOME"
  );

  if (savedCount === 1) {
    const transaction = transactions[0];

    if (
      transaction.type === "EXPENSE" &&
      isTransactionInReferenceMonth(transaction, referenceDate)
    ) {
      const previousCategory = getCategorySummaryItem(
        previousSummary?.expenseByCategory,
        transaction
      );
      const nextCategoryAmount =
        toNumber(previousCategory?.totalAmount) + toNumber(transaction.amount);
      const nextCategoryCount =
        (previousCategory?.transactionCount ?? 0) + 1;

      return appendCategoryText(
        `${transaction.category.name} bulan ini jadi ${formatRupiah(
          nextCategoryAmount
        )} dari ${nextCategoryCount} transaksi. Total catatanmu sekarang ${totalTransactionCount}.`,
        createdCategoryCount
      );
    }

    if (
      transaction.type === "INCOME" &&
      isTransactionInReferenceMonth(transaction, referenceDate)
    ) {
      const nextIncomeThisMonth =
        toNumber(previousSummary?.incomeThisMonth) + toNumber(transaction.amount);

      return appendCategoryText(
        `Pemasukan bulan ini jadi ${formatRupiah(
          nextIncomeThisMonth
        )}. Total catatanmu sekarang ${totalTransactionCount}.`,
        createdCategoryCount
      );
    }

    return appendCategoryText(
      `Transaksi tersimpan. Total catatanmu sekarang ${totalTransactionCount}.`,
      createdCategoryCount
    );
  }

  const expenseTotal = currentMonthExpenses.reduce(
    (total, transaction) => total + toNumber(transaction.amount),
    0
  );
  const incomeTotal = currentMonthIncomes.reduce(
    (total, transaction) => total + toNumber(transaction.amount),
    0
  );

  if (expenseTotal > 0) {
    return appendCategoryText(
      `${savedCount} transaksi tersimpan. Expense yang baru dicatat ${formatRupiah(
        expenseTotal
      )}; data bulan ini makin lengkap untuk membaca pola pengeluaran.`,
      createdCategoryCount
    );
  }

  if (incomeTotal > 0) {
    return appendCategoryText(
      `${savedCount} transaksi tersimpan. Pemasukan yang baru dicatat ${formatRupiah(
        incomeTotal
      )}; cashflow bulan ini jadi lebih utuh.`,
      createdCategoryCount
    );
  }

  return appendCategoryText(
    `${savedCount} transaksi tersimpan. Total catatanmu sekarang ${totalTransactionCount}.`,
    createdCategoryCount
  );
}
