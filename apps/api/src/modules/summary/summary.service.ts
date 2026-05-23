import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { getAiFinancialContext } from "../ai/ai-financial-context.js";
import type {
  CategorySummaryItem,
  MonthlyTrendItem,
  RecentTransaction,
  SummaryResponse
} from "./summary.types.js";

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function getStartOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), 1, 0, 0, 0, 0);
}

function getEndOfMonth(date: Date) {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999);
}

function getMonthKey(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getLastSixMonths(currentDate: Date) {
  const months: {
    key: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let index = 5; index >= 0; index -= 1) {
    const date = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() - index,
      1
    );

    const year = date.getFullYear();
    const month = date.getMonth();

    months.push({
      key: `${year}-${String(month + 1).padStart(2, "0")}`,
      startDate: new Date(year, month, 1, 0, 0, 0, 0),
      endDate: new Date(year, month + 1, 0, 23, 59, 59, 999)
    });
  }

  return months;
}

function mapRecentTransaction(
  transaction: Prisma.TransactionGetPayload<{
    include: {
      category: true;
    };
  }>
): RecentTransaction {
  return {
    id: transaction.id,
    type: transaction.type,
    amount: decimalToString(transaction.amount),
    note: transaction.note,
    date: transaction.date.toISOString(),
    category: {
      id: transaction.category.id,
      name: transaction.category.name,
      type: transaction.category.type,
      icon: transaction.category.icon,
      color: transaction.category.color
    }
  };
}

export async function getSummary(userId: string): Promise<SummaryResponse> {
  const now = new Date();
  const startOfCurrentMonth = getStartOfMonth(now);
  const endOfCurrentMonth = getEndOfMonth(now);
  const lastSixMonths = getLastSixMonths(now);

  const [
    user,
    totalIncomeAggregate,
    totalExpenseAggregate,
    incomeThisMonthAggregate,
    expenseThisMonthAggregate,
    transactionCount,
    recentTransactions,
    categoryTransactions,
    monthlyTransactions
  ] = await prisma.$transaction([
    prisma.user.findUnique({
      where: {
        id: userId
      },
      select: {
        safeBalanceLimit: true
      }
    }),

    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME
      },
      _sum: {
        amount: true
      }
    }),

    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE
      },
      _sum: {
        amount: true
      }
    }),

    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.INCOME,
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      _sum: {
        amount: true
      }
    }),

    prisma.transaction.aggregate({
      where: {
        userId,
        type: TransactionType.EXPENSE,
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      _sum: {
        amount: true
      }
    }),

    prisma.transaction.count({
      where: {
        userId
      }
    }),

    prisma.transaction.findMany({
      where: {
        userId
      },
      include: {
        category: true
      },
      orderBy: {
        date: "desc"
      },
      take: 5
    }),

    prisma.transaction.findMany({
      where: {
        userId
      },
      select: {
        type: true,
        amount: true,
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true
          }
        }
      }
    }),

    prisma.transaction.findMany({
      where: {
        userId,
        date: {
          gte: lastSixMonths[0].startDate,
          lte: lastSixMonths[lastSixMonths.length - 1].endDate
        }
      },
      select: {
        type: true,
        amount: true,
        date: true
      }
    })
  ]);

  const totalIncome = toDecimal(totalIncomeAggregate._sum.amount ?? 0);
  const totalExpense = toDecimal(totalExpenseAggregate._sum.amount ?? 0);
  const balance = totalIncome.minus(totalExpense);

  const incomeThisMonth = toDecimal(incomeThisMonthAggregate._sum.amount ?? 0);
  const expenseThisMonth = toDecimal(expenseThisMonthAggregate._sum.amount ?? 0);
  const balanceThisMonth = incomeThisMonth.minus(expenseThisMonth);

  const safeBalanceLimit = toDecimal(user?.safeBalanceLimit ?? 0);
  const isBelowSafeLimit = balance.lessThan(safeBalanceLimit);

  const categorySummaryMap = new Map<
    string,
    {
      categoryId: string;
      categoryName: string;
      categoryIcon: string | null;
      categoryColor: string | null;
      type: "INCOME" | "EXPENSE";
      totalAmount: Prisma.Decimal;
      transactionCount: number;
    }
  >();

  for (const transaction of categoryTransactions) {
    const key = `${transaction.category.id}-${transaction.type}`;
    const existing = categorySummaryMap.get(key);

    if (existing) {
      existing.totalAmount = existing.totalAmount.plus(transaction.amount);
      existing.transactionCount += 1;
      continue;
    }

    categorySummaryMap.set(key, {
      categoryId: transaction.category.id,
      categoryName: transaction.category.name,
      categoryIcon: transaction.category.icon,
      categoryColor: transaction.category.color,
      type: transaction.type,
      totalAmount: transaction.amount,
      transactionCount: 1
    });
  }

  const categorySummaryItems: CategorySummaryItem[] = Array.from(
    categorySummaryMap.values()
  )
    .map((item) => {
      return {
        categoryId: item.categoryId,
        categoryName: item.categoryName,
        categoryIcon: item.categoryIcon,
        categoryColor: item.categoryColor,
        type: item.type,
        totalAmount: decimalToString(item.totalAmount),
        transactionCount: item.transactionCount
      };
    })
    .sort((a, b) => Number(b.totalAmount) - Number(a.totalAmount));

  const incomeByCategory = categorySummaryItems.filter(
    (item) => item.type === TransactionType.INCOME
  );

  const expenseByCategory = categorySummaryItems.filter(
    (item) => item.type === TransactionType.EXPENSE
  );

  const monthlyMap = new Map<
    string,
    {
      income: Prisma.Decimal;
      expense: Prisma.Decimal;
    }
  >();

  for (const month of lastSixMonths) {
    monthlyMap.set(month.key, {
      income: toDecimal(0),
      expense: toDecimal(0)
    });
  }

  for (const transaction of monthlyTransactions) {
    const monthKey = getMonthKey(transaction.date);
    const current = monthlyMap.get(monthKey);

    if (!current) {
      continue;
    }

    if (transaction.type === TransactionType.INCOME) {
      current.income = current.income.plus(transaction.amount);
    }

    if (transaction.type === TransactionType.EXPENSE) {
      current.expense = current.expense.plus(transaction.amount);
    }
  }

  const monthlyTrend: MonthlyTrendItem[] = lastSixMonths.map((month) => {
    const value = monthlyMap.get(month.key) ?? {
      income: toDecimal(0),
      expense: toDecimal(0)
    };

    return {
      month: month.key,
      income: decimalToString(value.income),
      expense: decimalToString(value.expense),
      balance: decimalToString(value.income.minus(value.expense))
    };
  });

  const aiFinancialContext = await getAiFinancialContext(userId, now);

  return {
  totalIncome: decimalToString(totalIncome),
  totalExpense: decimalToString(totalExpense),
  balance: decimalToString(balance),
  safeBalanceLimit: decimalToString(safeBalanceLimit),
  isBelowSafeLimit,
  safeToSpend: aiFinancialContext.safeToSpend,

  incomeThisMonth: decimalToString(incomeThisMonth),
  expenseThisMonth: decimalToString(expenseThisMonth),
  balanceThisMonth: decimalToString(balanceThisMonth),

  transactionCount,
  recentTransactions: recentTransactions.map(mapRecentTransaction),

  expenseByCategory,
  incomeByCategory,
  monthlyTrend
  };
}