import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { getAiFinancialContext } from "../ai/ai-financial-context.js";
import { buildFinancialCheckup } from "../finance/financial-checkup.js";
import { runDueRecurringRules } from "../recurring/recurring.service.js";
import type {
  CategorySummaryItem,
  GetSummaryQuery,
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

const SUMMARY_MONTHLY_TREND_MONTHS = 12;
const SUMMARY_MONTH_NAMES = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember"
];

function getLastMonths(currentDate: Date, monthCount: number) {
  const months: {
    key: string;
    startDate: Date;
    endDate: Date;
  }[] = [];

  for (let index = monthCount - 1; index >= 0; index -= 1) {
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

function getPeriodDateRange(query: GetSummaryQuery, currentDate: Date) {
  if (!query.month && !query.year) {
    return null;
  }

  const year = query.year ?? currentDate.getFullYear();

  if (query.month) {
    return {
      month: query.month,
      year,
      label: `${SUMMARY_MONTH_NAMES[query.month - 1]} ${year}`,
      startDate: new Date(year, query.month - 1, 1, 0, 0, 0, 0),
      endDate: new Date(year, query.month, 0, 23, 59, 59, 999)
    };
  }

  return {
    month: null,
    year,
    label: `Tahun ${year}`,
    startDate: new Date(year, 0, 1, 0, 0, 0, 0),
    endDate: new Date(year, 11, 31, 23, 59, 59, 999)
  };
}

function buildPeriodWhere(
  userId: string,
  period: ReturnType<typeof getPeriodDateRange>
) {
  const where: Prisma.TransactionWhereInput = {
    userId
  };

  if (period) {
    where.date = {
      gte: period.startDate,
      lte: period.endDate
    };
  }

  return where;
}

function mapRecentTransaction(
  transaction: Prisma.TransactionGetPayload<{
    include: {
      category: {
        select: {
          id: true;
          name: true;
          type: true;
          icon: true;
          color: true;
        };
      };
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
      transactionCount: getGroupByCount(aggregate._count),
      limit: null
    });
  }

  return items.sort((firstItem, secondItem) => {
    return Number(secondItem.totalAmount) - Number(firstItem.totalAmount);
  });
}

export async function getSummary(
  userId: string,
  query: GetSummaryQuery = {}
): Promise<SummaryResponse> {
  const now = new Date();
  
  // Run recurring rules with error handling - don't let it break summary
  let recurringRunResult = { generatedCount: 0, processedRuleCount: 0 };
  try {
    recurringRunResult = await runDueRecurringRules(userId, now);
  } catch (error) {
    console.error("[Summary] Error running recurring rules");
    // Continue with default values - recurring rules failure shouldn't break summary
  }
  
  const startOfCurrentMonth = getStartOfMonth(now);
  const endOfCurrentMonth = getEndOfMonth(now);
  const monthlyTrendMonths = getLastMonths(now, SUMMARY_MONTHLY_TREND_MONTHS);
  const selectedPeriod = getPeriodDateRange(query, now);
  const selectedPeriodWhere = buildPeriodWhere(userId, selectedPeriod);

  // Get AI financial context with error handling.
  const aiFinancialContextPromise = getAiFinancialContext(userId, now).catch((error) => {
    console.error("[Summary] Error getting AI financial context");
    // Re-throw to handle it later with fallback
    throw error;
  });

  const [
    user,
    totalAmountByTypeRows,
    currentMonthAmountByTypeRows,
    transactionCount,
    recentTransactions,
    categoryAggregates,
    monthlyTransactions,
    transactionDateRows
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
      where: selectedPeriodWhere,
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
      where: selectedPeriodWhere
    }),

    prisma.transaction.findMany({
      where: selectedPeriodWhere,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            type: true,
            icon: true,
            color: true
          }
        }
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
      where: selectedPeriodWhere,
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
          gte: monthlyTrendMonths[0].startDate,
          lte: monthlyTrendMonths[monthlyTrendMonths.length - 1].endDate
        }
      },
      select: {
        type: true,
        amount: true,
        date: true
      }
    }),

    prisma.transaction.findMany({
      where: {
        userId
      },
      select: {
        date: true
      },
      orderBy: {
        date: "desc"
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

  const availableYears = [
    ...new Set([
      now.getFullYear(),
      ...transactionDateRows.map((row) => row.date.getFullYear())
    ])
  ].sort((firstYear, secondYear) => secondYear - firstYear);

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

  for (const month of monthlyTrendMonths) {
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

  const monthlyTrend: MonthlyTrendItem[] = monthlyTrendMonths.map((month) => {
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

  // Get AI financial context with fallback if it fails
  let aiFinancialContext;
  let financialCheckup;
  let safeToSpend;
  let habit = null;
  
  try {
    aiFinancialContext = await aiFinancialContextPromise;
    financialCheckup = buildFinancialCheckup(aiFinancialContext);
    safeToSpend = aiFinancialContext.safeToSpend;
    habit = aiFinancialContext.habit ?? null;
  } catch (error) {
    console.error("[Summary] Error building financial checkup, using fallback");
    
    // Provide safe fallback values
    const totalIncome = totalAmountByType[TransactionType.INCOME];
    const totalExpense = totalAmountByType[TransactionType.EXPENSE];
    const netCashflow = totalIncome.minus(totalExpense);

    safeToSpend = {
      status: "UNKNOWN" as const,
      spendingPaceStatus: "UNKNOWN" as const,
      netCashflow: Number(decimalToString(netCashflow)),
      safeBalanceLimit: Number(decimalToString(safeBalanceLimit)),
      availableToSpend: Math.max(0, Number(decimalToString(balance.minus(safeBalanceLimit)))),
      remainingDays: Math.max(1, Math.ceil((endOfCurrentMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))),
      suggestedDailyLimit: null,
      expenseToIncomeRatio: null,
      monthProgressPercent: 0,
      expensePacePercent: null,
      projectedMonthEndExpense: Number(decimalToString(expenseThisMonth)),
      projectedNetCashflow: Number(decimalToString(netCashflow)),
      topRiskCategoryName: null,
      topRiskCategoryAmount: 0,
      reason: "Data belum lengkap untuk analisis mendalam.",
      action: "Catat transaksi rutin agar insight lebih akurat.",
      warnings: []
    };
    
    financialCheckup = {
      status: "UNKNOWN" as const,
      priority: "COLLECT_DATA" as const,
      title: "Checkup Keuangan Belum Lengkap",
      headline: "Belum cukup data untuk membuat checkup keuangan yang akurat.",
      focusCategoryName: null,
      focusCategoryAmount: 0,
      reason: "Sistem sedang mengalami kendala dalam menganalisis data keuangan.",
      action: "Catat transaksi utama beberapa hari ke depan agar checkup berikutnya lebih akurat.",
      warnings: [],
      metrics: {
        totalIncome: Number(decimalToString(incomeThisMonth)),
        totalExpense: Number(decimalToString(expenseThisMonth)),
        netCashflow: Number(decimalToString(balanceThisMonth)),
        expenseToIncomeRatio: null,
        expenseChangePercent: null,
        safeToSpendStatus: "UNKNOWN" as const,
        spendingPaceStatus: "UNKNOWN" as const,
        availableToSpend: Math.max(0, Number(decimalToString(balance.minus(safeBalanceLimit)))),
        suggestedDailyLimit: null,
        projectedNetCashflow: Number(decimalToString(balanceThisMonth))
      }
    };
  }
  
  return {
    period: {
      month: selectedPeriod?.month ?? null,
      year: selectedPeriod?.year ?? null,
      label: selectedPeriod?.label ?? "Semua waktu",
      startDate: selectedPeriod?.startDate.toISOString() ?? null,
      endDate: selectedPeriod?.endDate.toISOString() ?? null
    },
    availablePeriods: {
      years: availableYears
    },
    totalIncome: decimalToString(totalIncome),
    totalExpense: decimalToString(totalExpense),
    balance: decimalToString(balance),
    safeBalanceLimit: decimalToString(safeBalanceLimit),
    isBelowSafeLimit,
    safeToSpend,
    financialCheckup,
    habit,

    incomeThisMonth: decimalToString(incomeThisMonth),
    expenseThisMonth: decimalToString(expenseThisMonth),
    balanceThisMonth: decimalToString(balanceThisMonth),

    transactionCount,
    recentTransactions: recentTransactions.map(mapRecentTransaction),

    expenseByCategory,
    incomeByCategory,
    monthlyTrend,
    recurringStatus: {
      generatedCount: recurringRunResult.generatedCount,
      processedRuleCount: recurringRunResult.processedRuleCount
    }
  };
}
