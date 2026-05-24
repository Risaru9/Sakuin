import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { getAiFinancialContext } from "../ai/ai-financial-context.js";
import { buildFinancialCheckup } from "../finance/financial-checkup.js";
import type {
  CategorySummaryItem,
  MonthlyTrendItem,
  RecentTransaction,
  SummaryResponse
} from "./summary.types.js";

type AmountByTypeRow = {
  type: TransactionType;
  _sum?: {
    amount?: Prisma.Decimal | null;
  } | null;
};

type CategoryAggregateRow = {
  categoryId: string;
  type: TransactionType;
  _sum?: {
    amount?: Prisma.Decimal | null;
  } | null;
  _count?:
    | true
    | {
        _all?: number;
      }
    | null;
};

type CategoryMetadata = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
};

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

function buildAmountByTypeMap(rows: AmountByTypeRow[]) {
  const amountByType: Record<TransactionType, Prisma.Decimal> = {
    [TransactionType.INCOME]: toDecimal(0),
    [TransactionType.EXPENSE]: toDecimal(0)
  };

  for (const row of rows) {
    amountByType[row.type] = toDecimal(row._sum?.amount ?? 0);
  }

  return amountByType;
}

function getGroupByCount(
  count:
    | true
    | {
        _all?: number;
      }
    | null
    | undefined
) {
  if (!count || count === true) {
    return 0;
  }

  return count._all ?? 0;
}

function buildCategorySummaryItems(input: {
  categoryAggregates: CategoryAggregateRow[];
  categoriesById: Map<string, CategoryMetadata>;
}) {
  const items: CategorySummaryItem[] = [];

  for (const aggregate of input.categoryAggregates) {
    const category = input.categoriesById.get(aggregate.categoryId);

    if (!category) {
      continue;
    }

    items.push({
      categoryId: category.id,
      categoryName: category.name,
      categoryIcon: category.icon,
      categoryColor: category.color,
      type: aggregate.type,
      totalAmount: decimalToString(toDecimal(aggregate._sum?.amount ?? 0)),
      transactionCount: getGroupByCount(aggregate._count)
    });
  }

  return items.sort((firstItem, secondItem) => {
    return Number(secondItem.totalAmount) - Number(firstItem.totalAmount);
  });
}

export async function getSummary(userId: string): Promise<SummaryResponse> {
  const now = new Date();
  const startOfCurrentMonth = getStartOfMonth(now);
  const endOfCurrentMonth = getEndOfMonth(now);
  const lastSixMonths = getLastSixMonths(now);

  const aiFinancialContextPromise = getAiFinancialContext(userId, now);

  const [
    user,
    totalAmountByTypeRows,
    currentMonthAmountByTypeRows,
    transactionCount,
    recentTransactions,
    categoryAggregates,
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

    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId
      },
      orderBy: {
        type: "asc"
      },
      _sum: {
        amount: true
      }
    }),

    prisma.transaction.groupBy({
      by: ["type"],
      where: {
        userId,
        date: {
          gte: startOfCurrentMonth,
          lte: endOfCurrentMonth
        }
      },
      orderBy: {
        type: "asc"
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
      orderBy: [
        {
          date: "desc"
        },
        {
          createdAt: "desc"
        }
      ],
      take: 5
    }),

    prisma.transaction.groupBy({
      by: ["categoryId", "type"],
      where: {
        userId
      },
      orderBy: [
        {
          categoryId: "asc"
        },
        {
          type: "asc"
        }
      ],
      _sum: {
        amount: true
      },
      _count: {
        _all: true
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

  const categoryIds = [
    ...new Set(categoryAggregates.map((aggregate) => aggregate.categoryId))
  ];

  const categories =
    categoryIds.length > 0
      ? await prisma.category.findMany({
          where: {
            id: {
              in: categoryIds
            }
          },
          select: {
            id: true,
            name: true,
            icon: true,
            color: true
          }
        })
      : [];

  const categoriesById = new Map(
    categories.map((category) => [category.id, category])
  );

  const totalAmountByType = buildAmountByTypeMap(totalAmountByTypeRows);
  const currentMonthAmountByType = buildAmountByTypeMap(
    currentMonthAmountByTypeRows
  );

  const totalIncome = totalAmountByType[TransactionType.INCOME];
  const totalExpense = totalAmountByType[TransactionType.EXPENSE];
  const balance = totalIncome.minus(totalExpense);

  const incomeThisMonth = currentMonthAmountByType[TransactionType.INCOME];
  const expenseThisMonth = currentMonthAmountByType[TransactionType.EXPENSE];
  const balanceThisMonth = incomeThisMonth.minus(expenseThisMonth);

  const safeBalanceLimit = toDecimal(user?.safeBalanceLimit ?? 0);
  const isBelowSafeLimit = balance.lessThan(safeBalanceLimit);

  const categorySummaryItems = buildCategorySummaryItems({
    categoryAggregates,
    categoriesById
  });

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

  const aiFinancialContext = await aiFinancialContextPromise;
  const financialCheckup = buildFinancialCheckup(aiFinancialContext);

  return {
    totalIncome: decimalToString(totalIncome),
    totalExpense: decimalToString(totalExpense),
    balance: decimalToString(balance),
    safeBalanceLimit: decimalToString(safeBalanceLimit),
    isBelowSafeLimit,
    safeToSpend: aiFinancialContext.safeToSpend,
    financialCheckup,

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