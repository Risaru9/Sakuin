import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import {
  calculateSafeToSpend,
  type SafeToSpendResult
} from "../finance/safe-to-spend.js";
import {
  buildHabitSummary,
  getHabitTransactionRange,
  type HabitSummaryResult
} from "../finance/habit-engine.js";

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

export type AiFinancialHabitContext = HabitSummaryResult;

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
  const habitRange = getHabitTransactionRange(referenceDate);

  const [
    currentMonthTransactions,
    previousMonthTransactions,
    goals,
    habitTransactions
  ] =
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
      getGoalSummary(userId, referenceDate),
      getTransactionsForPeriod(userId, habitRange.startDate, habitRange.endDate)
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
    habit: buildHabitSummary({
      transactions: habitTransactions,
      referenceDate
    })
  };
}
