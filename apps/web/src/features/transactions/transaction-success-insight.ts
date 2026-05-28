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

function getDayKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(date.getDate()).padStart(2, "0")}`;
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

function isTransactionInReferenceDay(
  transaction: Transaction,
  referenceDate: Date
) {
  const transactionDate = new Date(transaction.date);

  if (Number.isNaN(transactionDate.getTime())) {
    return false;
  }

  return getDayKey(transactionDate) === getDayKey(referenceDate);
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

function getTodayProgressText(
  transactions: Transaction[],
  previousSummary: SummaryData | undefined,
  referenceDate: Date
) {
  const savedTodayCount = transactions.filter((transaction) =>
    isTransactionInReferenceDay(transaction, referenceDate)
  ).length;

  if (savedTodayCount === 0) {
    return "";
  }

  const previousTodayCount =
    previousSummary?.habit?.todayTransactionCount ??
    previousSummary?.habit?.transactionsToday ??
    0;
  const nextTodayCount = previousTodayCount + savedTodayCount;

  if (nextTodayCount <= 1) {
    return " Hari ini kamu sudah mulai mencatat; insight hari ini mulai terbentuk.";
  }

  if (nextTodayCount >= 4) {
    return ` Hari ini sudah ${nextTodayCount} transaksi; cukup bagus untuk review singkat.`;
  }

  return ` Hari ini kamu sudah mencatat ${nextTodayCount} transaksi.`;
}

function getRecommendedNextStepText(
  transactions: Transaction[],
  previousSummary: SummaryData | undefined,
  referenceDate: Date
) {
  const todayTransactions = transactions.filter((transaction) =>
    isTransactionInReferenceDay(transaction, referenceDate)
  );
  const todayExpenseTotal = todayTransactions
    .filter((transaction) => transaction.type === "EXPENSE")
    .reduce((total, transaction) => total + toNumber(transaction.amount), 0);
  const suggestedDailyLimit = previousSummary?.safeToSpend?.suggestedDailyLimit;
  const safeToSpendStatus = previousSummary?.safeToSpend?.status;
  const habit = previousSummary?.habit;

  if (todayTransactions.length === 0) {
    return " Buka dashboard nanti untuk melihat ringkasan terbaru.";
  }

  if (
    todayExpenseTotal > 0 &&
    typeof suggestedDailyLimit === "number" &&
    suggestedDailyLimit > 0 &&
    todayExpenseTotal >= suggestedDailyLimit
  ) {
    return ` Pengeluaran yang baru dicatat sudah menyentuh batas harian saran ${formatRupiah(
      suggestedDailyLimit
    )}, jadi cek Aman Dipakai sebelum belanja lagi.`;
  }

  if (safeToSpendStatus === "WATCH" || safeToSpendStatus === "HOLD") {
    return " Status Aman Dipakai perlu dipantau, jadi review 30 detik setelah ini akan membantu.";
  }

  if (habit?.currentStreakDays && habit.currentStreakDays >= 3) {
    return ` Streak ${habit.currentStreakDays} hari kamu tetap terjaga, lanjutkan dengan catatan kecil berikutnya.`;
  }

  if (habit?.weeklyActiveDays !== undefined && habit.weeklyActiveDays < 3) {
    return " Kalau ada transaksi kecil lain hari ini, catat juga agar pola minggu ini lebih jelas.";
  }

  return " Lihat dashboard sebentar untuk mengecek dampaknya ke ringkasan harian.";
}

export function buildTransactionSuccessInsight({
  transactions,
  previousSummary,
  createdCategoryCount = 0,
  referenceDate = new Date()
}: BuildTransactionSuccessInsightInput) {
  const savedCount = transactions.length;
  const todayProgressText = getTodayProgressText(
    transactions,
    previousSummary,
    referenceDate
  );
  const recommendedNextStepText = getRecommendedNextStepText(
    transactions,
    previousSummary,
    referenceDate
  );

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
        )} dari ${nextCategoryCount} transaksi. Total catatanmu sekarang ${totalTransactionCount}.${todayProgressText}${recommendedNextStepText}`,
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
        )}. Total catatanmu sekarang ${totalTransactionCount}.${todayProgressText}${recommendedNextStepText}`,
        createdCategoryCount
      );
    }

    return appendCategoryText(
      `Transaksi tersimpan. Total catatanmu sekarang ${totalTransactionCount}.${todayProgressText}${recommendedNextStepText}`,
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
      )}; data bulan ini makin lengkap untuk membaca pola pengeluaran.${todayProgressText}${recommendedNextStepText}`,
      createdCategoryCount
    );
  }

  if (incomeTotal > 0) {
    return appendCategoryText(
      `${savedCount} transaksi tersimpan. Pemasukan yang baru dicatat ${formatRupiah(
        incomeTotal
      )}; cashflow bulan ini jadi lebih utuh.${todayProgressText}${recommendedNextStepText}`,
      createdCategoryCount
    );
  }

  return appendCategoryText(
    `${savedCount} transaksi tersimpan. Total catatanmu sekarang ${totalTransactionCount}.${todayProgressText}${recommendedNextStepText}`,
    createdCategoryCount
  );
}
