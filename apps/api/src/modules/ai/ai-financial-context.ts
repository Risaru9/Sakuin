import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import {
  calculateSafeToSpend,
  type SafeToSpendResult
} from "../finance/safe-to-spend.js";

type TransactionWithCategory = Awaited<
  ReturnType<typeof getTransactionsForPeriod>
>[number];

type CategoryBucket = {
  name: string;
  amount: Prisma.Decimal;
  transactionCount: number;
};

export type AiFinancialTopCategory = {
  name: string;
  amount: string;
  transactionCount: number;
  percentageOfExpense: number;
  percentageOfIncome: number;
};

export type AiFinancialPeriodContext = {
  periodLabel: string;
  startDate: string;
  endDate: string;
  totalIncome: string;
  totalExpense: string;
  netCashflow: string;
  transactionCount: number;
  topExpenseCategories: AiFinancialTopCategory[];
};

export type AiFinancialMonthComparison = {
  incomeChangePercent: number | null;
  expenseChangePercent: number | null;
};

export type AiGoalSummaryContext = {
  totalGoals: number;
  completedGoals: number;
  activeGoals: number;
  overdueGoals: number;
};

export type AiFinancialHabitContext = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  transactionsToday: number;
  expenseTransactionsToday: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  last7DaysTransactionCount: number;
  last7DaysExpense: string;
  last7DaysTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  habitStatus: "NO_DATA" | "LIGHT" | "ACTIVE" | "STALE";
  habitMessage: string;
};

export type AiFinancialBaseContext = {
  currency: "IDR";
  generatedAt: string;
  safeBalanceLimit: string;
  currentMonth: AiFinancialPeriodContext;
  previousMonth: AiFinancialPeriodContext;
  monthComparison: AiFinancialMonthComparison;
  goals: AiGoalSummaryContext;
};

export type AiFinancialContext = AiFinancialBaseContext & {
  safeToSpend: SafeToSpendResult;
  habit?: AiFinancialHabitContext;
};

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function calculatePercentage(part: Prisma.Decimal, total: Prisma.Decimal) {
  if (total.lessThanOrEqualTo(0)) {
    return 0;
  }

  return Number(part.dividedBy(total).times(100).toFixed(2));
}

function calculateChangePercent(
  currentValue: Prisma.Decimal,
  previousValue: Prisma.Decimal
) {
  if (previousValue.equals(0)) {
    if (currentValue.equals(0)) {
      return 0;
    }

    return null;
  }

  return Number(
    currentValue
      .minus(previousValue)
      .dividedBy(previousValue)
      .times(100)
      .toFixed(2)
  );
}

function getMonthRange(referenceDate: Date, monthOffset = 0) {
  const year = referenceDate.getUTCFullYear();
  const month = referenceDate.getUTCMonth() + monthOffset;

  const startDate = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const endDate = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));

  return {
    startDate,
    endDate
  };
}

function getPeriodLabel(date: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC"
  }).format(date);
}

function getUtcDayStart(date: Date) {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
  );
}

function getUtcDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getDaysBetweenUtcDates(startDate: Date, endDate: Date) {
  const millisecondsPerDay = 1000 * 60 * 60 * 24;

  return Math.floor(
    (getUtcDayStart(endDate).getTime() - getUtcDayStart(startDate).getTime()) /
      millisecondsPerDay
  );
}

async function getTransactionsForPeriod(
  userId: string,
  startDate: Date,
  endDate: Date
) {
  return prisma.transaction.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lt: endDate
      }
    },
    include: {
      category: {
        select: {
          name: true,
          type: true
        }
      }
    }
  });
}

function summarizePeriod(
  transactions: TransactionWithCategory[],
  startDate: Date,
  endDate: Date
): AiFinancialPeriodContext {
  const totalIncome = transactions.reduce((total, transaction) => {
    if (transaction.type !== "INCOME") {
      return total;
    }

    return total.plus(transaction.amount);
  }, toDecimal(0));

  const totalExpense = transactions.reduce((total, transaction) => {
    if (transaction.type !== "EXPENSE") {
      return total;
    }

    return total.plus(transaction.amount);
  }, toDecimal(0));

  const expenseCategoryBuckets = new Map<string, CategoryBucket>();

  for (const transaction of transactions) {
    if (transaction.type !== "EXPENSE") {
      continue;
    }

    const categoryName = transaction.category.name;
    const existingBucket = expenseCategoryBuckets.get(categoryName);

    if (existingBucket) {
      existingBucket.amount = existingBucket.amount.plus(transaction.amount);
      existingBucket.transactionCount += 1;
      continue;
    }

    expenseCategoryBuckets.set(categoryName, {
      name: categoryName,
      amount: toDecimal(transaction.amount),
      transactionCount: 1
    });
  }

  const topExpenseCategories = [...expenseCategoryBuckets.values()]
    .sort((firstCategory, secondCategory) =>
      secondCategory.amount.comparedTo(firstCategory.amount)
    )
    .slice(0, 5)
    .map((category) => ({
      name: category.name,
      amount: decimalToString(category.amount),
      transactionCount: category.transactionCount,
      percentageOfExpense: calculatePercentage(category.amount, totalExpense),
      percentageOfIncome: calculatePercentage(category.amount, totalIncome)
    }));

  return {
    periodLabel: getPeriodLabel(startDate),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
    totalIncome: decimalToString(totalIncome),
    totalExpense: decimalToString(totalExpense),
    netCashflow: decimalToString(totalIncome.minus(totalExpense)),
    transactionCount: transactions.length,
    topExpenseCategories
  };
}

function summarizeHabitContext(input: {
  transactions: TransactionWithCategory[];
  referenceDate: Date;
  monthStartDate: Date;
}): AiFinancialHabitContext {
  const { transactions, referenceDate, monthStartDate } = input;
  const referenceDayStart = getUtcDayStart(referenceDate);
  const todayKey = getUtcDayKey(referenceDayStart);
  const currentMonthDaysElapsed = Math.max(
    getDaysBetweenUtcDates(monthStartDate, referenceDate) + 1,
    1
  );

  const transactionDayKeys = new Set<string>();
  const todayTransactions = transactions.filter((transaction) => {
    const transactionDayKey = getUtcDayKey(transaction.date);
    transactionDayKeys.add(transactionDayKey);

    return transactionDayKey === todayKey;
  });

  const latestTransaction = [...transactions].sort((firstItem, secondItem) => {
    const dateDifference =
      secondItem.date.getTime() - firstItem.date.getTime();

    if (dateDifference !== 0) {
      return dateDifference;
    }

    return secondItem.createdAt.getTime() - firstItem.createdAt.getTime();
  })[0];

  const daysSinceLastTransaction = latestTransaction
    ? Math.max(getDaysBetweenUtcDates(latestTransaction.date, referenceDate), 0)
    : null;

  const last7DaysStart = new Date(referenceDayStart);
  last7DaysStart.setUTCDate(last7DaysStart.getUTCDate() - 6);

  const last7DaysTransactions = transactions.filter(
    (transaction) =>
      transaction.date >= last7DaysStart && transaction.date <= referenceDate
  );

  const last7DaysExpense = last7DaysTransactions.reduce(
    (total, transaction) =>
      transaction.type === "EXPENSE"
        ? total.plus(transaction.amount)
        : total,
    toDecimal(0)
  );

  const last7DaysCategoryBuckets = new Map<string, CategoryBucket>();

  for (const transaction of last7DaysTransactions) {
    if (transaction.type !== "EXPENSE") {
      continue;
    }

    const categoryName = transaction.category.name;
    const existingBucket = last7DaysCategoryBuckets.get(categoryName);

    if (existingBucket) {
      existingBucket.amount = existingBucket.amount.plus(transaction.amount);
      existingBucket.transactionCount += 1;
      continue;
    }

    last7DaysCategoryBuckets.set(categoryName, {
      name: categoryName,
      amount: toDecimal(transaction.amount),
      transactionCount: 1
    });
  }

  const last7DaysTopExpenseCategory = [...last7DaysCategoryBuckets.values()]
    .sort((firstCategory, secondCategory) =>
      secondCategory.amount.comparedTo(firstCategory.amount)
    )
    .map((category) => ({
      name: category.name,
      amount: decimalToString(category.amount),
      transactionCount: category.transactionCount
    }))[0] ?? null;

  const currentMonthTransactionDays = transactionDayKeys.size;
  const currentMonthCompletenessPercent = Number(
    (
      (currentMonthTransactionDays / currentMonthDaysElapsed) *
      100
    ).toFixed(1)
  );

  const expenseTransactionsToday = todayTransactions.filter(
    (transaction) => transaction.type === "EXPENSE"
  ).length;

  let habitStatus: AiFinancialHabitContext["habitStatus"] = "ACTIVE";
  let habitMessage =
    "Pencatatan bulan ini sudah cukup rutin untuk membaca pola pengeluaran dengan lebih percaya diri.";

  if (transactions.length === 0) {
    habitStatus = "NO_DATA";
    habitMessage =
      "Belum ada transaksi bulan ini. Catat beberapa transaksi pertama agar insight Sakuin mulai terasa berguna.";
  } else if (daysSinceLastTransaction !== null && daysSinceLastTransaction >= 3) {
    habitStatus = "STALE";
    habitMessage = `Transaksi terakhir tercatat ${daysSinceLastTransaction} hari lalu. Catat transaksi terbaru agar insight bulan ini tetap akurat.`;
  } else if (
    currentMonthTransactionDays <=
    Math.max(2, Math.floor(currentMonthDaysElapsed * 0.25))
  ) {
    habitStatus = "LIGHT";
    habitMessage =
      "Data bulan ini masih ringan. Catat transaksi kecil yang sering terlewat supaya pola bocor uang lebih mudah terlihat.";
  }

  return {
    currentMonthTransactionDays,
    currentMonthDaysElapsed,
    currentMonthCompletenessPercent,
    transactionsToday: todayTransactions.length,
    expenseTransactionsToday,
    lastTransactionDate: latestTransaction
      ? latestTransaction.date.toISOString()
      : null,
    daysSinceLastTransaction,
    last7DaysTransactionCount: last7DaysTransactions.length,
    last7DaysExpense: decimalToString(last7DaysExpense),
    last7DaysTopExpenseCategory,
    habitStatus,
    habitMessage
  };
}

async function getGoalSummary(userId: string, referenceDate: Date) {
  const goals = await prisma.goal.findMany({
    where: {
      userId
    },
    select: {
      targetAmount: true,
      currentAmount: true,
      deadline: true
    }
  });

  let completedGoals = 0;
  let overdueGoals = 0;

  for (const goal of goals) {
    const isCompleted = toDecimal(goal.currentAmount).greaterThanOrEqualTo(
      goal.targetAmount
    );

    if (isCompleted) {
      completedGoals += 1;
      continue;
    }

    if (goal.deadline && goal.deadline < referenceDate) {
      overdueGoals += 1;
    }
  }

  return {
    totalGoals: goals.length,
    completedGoals,
    activeGoals: goals.length - completedGoals,
    overdueGoals
  };
}

export async function getAiFinancialContext(
  userId: string,
  referenceDate = new Date()
): Promise<AiFinancialContext> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      safeBalanceLimit: true
    }
  });

  if (!user) {
    throw new HttpError("User tidak ditemukan", 404);
  }

  const currentMonthRange = getMonthRange(referenceDate, 0);
  const previousMonthRange = getMonthRange(referenceDate, -1);

  const [currentMonthTransactions, previousMonthTransactions, goals] =
    await Promise.all([
      getTransactionsForPeriod(
        userId,
        currentMonthRange.startDate,
        currentMonthRange.endDate
      ),
      getTransactionsForPeriod(
        userId,
        previousMonthRange.startDate,
        previousMonthRange.endDate
      ),
      getGoalSummary(userId, referenceDate)
    ]);

  const currentMonth = summarizePeriod(
    currentMonthTransactions,
    currentMonthRange.startDate,
    currentMonthRange.endDate
  );

  const previousMonth = summarizePeriod(
    previousMonthTransactions,
    previousMonthRange.startDate,
    previousMonthRange.endDate
  );

  const baseContext: AiFinancialBaseContext = {
    currency: "IDR",
    generatedAt: referenceDate.toISOString(),
    safeBalanceLimit: decimalToString(toDecimal(user.safeBalanceLimit)),
    currentMonth,
    previousMonth,
    monthComparison: {
      incomeChangePercent: calculateChangePercent(
        toDecimal(currentMonth.totalIncome),
        toDecimal(previousMonth.totalIncome)
      ),
      expenseChangePercent: calculateChangePercent(
        toDecimal(currentMonth.totalExpense),
        toDecimal(previousMonth.totalExpense)
      )
    },
    goals
  };

  return {
    ...baseContext,
    safeToSpend: calculateSafeToSpend(baseContext, {
      referenceDate
    }),
    habit: summarizeHabitContext({
      transactions: currentMonthTransactions,
      referenceDate,
      monthStartDate: currentMonthRange.startDate
    })
  };
}
