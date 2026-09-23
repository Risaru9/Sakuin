import { TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { getCategoriesService } from "../categories/category.service.js";
import {
  describeBudgetAlert,
  describeWeeklySummary,
  getBudgetStatus,
  getCrossedBudgetLevel,
  getLocalPeriods,
  localDateKey,
  type BudgetAlertLevel,
  type BudgetStatus,
  type LocalRange,
  type NotificationCopy
} from "./glance-copy.js";

export type GlanceInput = {
  date: string;
  tzOffsetMinutes: number;
};

type CategoryAmount = {
  categoryName: string;
  amount: number;
};

export type GlanceResponse = {
  date: string;
  todayExpense: number;
  month: {
    label: string;
    income: number;
    expense: number;
    left: number;
  };
  /** The limited category closest to (or past) its limit. */
  budget: {
    categoryName: string;
    spent: number;
    limit: number;
    percent: number;
    status: BudgetStatus;
  } | null;
  /** Biggest expense category this month, for users without limits. */
  topCategory: CategoryAmount | null;
  lastTransaction: {
    name: string;
    amount: number;
    type: "INCOME" | "EXPENSE";
  } | null;
  week: {
    expense: number;
    count: number;
    topCategory: CategoryAmount | null;
    notification: NotificationCopy | null;
  };
};

export type BudgetAlert = NotificationCopy & {
  categoryId: string;
  categoryName: string;
  level: BudgetAlertLevel;
  spent: number;
  limit: number;
};

function inRange(range: LocalRange) {
  return { gte: range.start, lt: range.end };
}

async function sumByType(userId: string, range: LocalRange) {
  const rows = await prisma.transaction.groupBy({
    by: ["type"],
    where: { userId, date: inRange(range) },
    _sum: { amount: true },
    _count: { _all: true }
  });

  const pick = (type: TransactionType) => rows.find((row) => row.type === type);

  return {
    income: Number(pick(TransactionType.INCOME)?._sum.amount ?? 0),
    expense: Number(pick(TransactionType.EXPENSE)?._sum.amount ?? 0),
    expenseCount: pick(TransactionType.EXPENSE)?._count._all ?? 0
  };
}

async function expenseByCategory(userId: string, range: LocalRange, categoryIds?: string[]) {
  const rows = await prisma.transaction.groupBy({
    by: ["categoryId"],
    where: {
      userId,
      type: TransactionType.EXPENSE,
      date: inRange(range),
      ...(categoryIds ? { categoryId: { in: categoryIds } } : {})
    },
    _sum: { amount: true }
  });

  return new Map(rows.map((row) => [row.categoryId, Number(row._sum.amount ?? 0)]));
}

async function getExpenseCategories(userId: string) {
  const categories = await getCategoriesService({ userId, type: TransactionType.EXPENSE });

  return new Map(categories.map((category) => [category.id, category]));
}

function biggest(amounts: Map<string, number>, names: Map<string, { name: string }>): CategoryAmount | null {
  let top: CategoryAmount | null = null;

  for (const [categoryId, amount] of amounts) {
    if (amount > 0 && (!top || amount > top.amount)) {
      top = { categoryName: names.get(categoryId)?.name ?? "Lainnya", amount };
    }
  }

  return top;
}

/** Everything the home-screen widget and the weekly summary show, in one request. */
export async function getGlance(userId: string, input: GlanceInput): Promise<GlanceResponse> {
  const periods = getLocalPeriods(input.date, input.tzOffsetMinutes);
  const [today, month, week, categories, monthByCategory, weekByCategory, lastTransaction] =
    await Promise.all([
      sumByType(userId, periods.day),
      sumByType(userId, periods.month),
      sumByType(userId, periods.week),
      getExpenseCategories(userId),
      expenseByCategory(userId, periods.month),
      expenseByCategory(userId, periods.week),
      prisma.transaction.findFirst({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: { note: true, amount: true, type: true, category: { select: { name: true } } }
      })
    ]);

  let budget: GlanceResponse["budget"] = null;

  for (const category of categories.values()) {
    if (!category.limit || category.limit <= 0) {
      continue;
    }

    const spent = monthByCategory.get(category.id) ?? 0;
    const ratio = spent / category.limit;

    if (!budget || ratio > budget.spent / budget.limit) {
      budget = {
        categoryName: category.name,
        spent,
        limit: category.limit,
        percent: Math.round(ratio * 100),
        status: getBudgetStatus(spent, category.limit)
      };
    }
  }

  const weekTop = biggest(weekByCategory, categories);

  return {
    date: input.date,
    todayExpense: today.expense,
    month: {
      label: periods.monthLabel,
      income: month.income,
      expense: month.expense,
      left: month.income - month.expense
    },
    budget,
    topCategory: budget ? null : biggest(monthByCategory, categories),
    lastTransaction: lastTransaction
      ? {
          name: lastTransaction.note?.trim() || lastTransaction.category.name,
          amount: Number(lastTransaction.amount),
          type: lastTransaction.type
        }
      : null,
    week: {
      expense: week.expense,
      count: week.expenseCount,
      topCategory: weekTop,
      notification: describeWeeklySummary({
        expense: week.expense,
        count: week.expenseCount,
        topCategory: weekTop
      })
    }
  };
}

export async function getTodayExpense(userId: string, tzOffsetMinutes: number) {
  const periods = getLocalPeriods(localDateKey(new Date(), tzOffsetMinutes), tzOffsetMinutes);

  return (await sumByType(userId, periods.day)).expense;
}

/**
 * Categories that the given new expenses pushed past 80% or 100% of their monthly limit.
 * Only this month counts: back-dated entries never alert.
 */
export async function getBudgetAlerts(
  userId: string,
  transactionIds: string[],
  tzOffsetMinutes: number
): Promise<BudgetAlert[]> {
  if (transactionIds.length === 0) {
    return [];
  }

  const periods = getLocalPeriods(localDateKey(new Date(), tzOffsetMinutes), tzOffsetMinutes);
  const added = await prisma.transaction.findMany({
    where: {
      id: { in: transactionIds },
      userId,
      type: TransactionType.EXPENSE,
      date: inRange(periods.month)
    },
    select: { categoryId: true, amount: true }
  });

  if (added.length === 0) {
    return [];
  }

  const addedByCategory = new Map<string, number>();

  for (const transaction of added) {
    addedByCategory.set(
      transaction.categoryId,
      (addedByCategory.get(transaction.categoryId) ?? 0) + Number(transaction.amount)
    );
  }

  const categories = await getExpenseCategories(userId);
  const limitedIds = [...addedByCategory.keys()].filter((id) => (categories.get(id)?.limit ?? 0) > 0);

  if (limitedIds.length === 0) {
    return [];
  }

  const spentByCategory = await expenseByCategory(userId, periods.month, limitedIds);
  const alerts: BudgetAlert[] = [];

  for (const categoryId of limitedIds) {
    const category = categories.get(categoryId)!;
    const limit = category.limit!;
    const spent = spentByCategory.get(categoryId) ?? 0;
    const level = getCrossedBudgetLevel(spent - (addedByCategory.get(categoryId) ?? 0), spent, limit);

    if (level) {
      alerts.push({
        categoryId,
        categoryName: category.name,
        level,
        spent,
        limit,
        ...describeBudgetAlert({
          categoryName: category.name,
          level,
          spent,
          limit,
          daysLeftInMonth: periods.daysLeftInMonth
        })
      });
    }
  }

  return alerts;
}
