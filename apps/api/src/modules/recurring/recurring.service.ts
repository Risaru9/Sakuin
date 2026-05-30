import { Prisma, TransactionType } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateRecurringRuleInput,
  RecurringRuleResponse,
  RunDueRecurringResult,
  UpdateRecurringRuleInput
} from "./recurring.types.js";

type RecurringRuleWithCategory = Prisma.RecurringRuleGetPayload<{
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
}>;

const recurringCategoryInclude = {
  category: {
    select: {
      id: true,
      name: true,
      type: true,
      icon: true,
      color: true
    }
  }
} satisfies Prisma.RecurringRuleInclude;

function normalizeStartOfDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
}

function toRecurringRuleResponse(rule: RecurringRuleWithCategory): RecurringRuleResponse {
  return {
    id: rule.id,
    categoryId: rule.categoryId,
    type: rule.type,
    amount: rule.amount.toString(),
    note: rule.note,
    frequency: rule.frequency as "WEEKLY" | "MONTHLY",
    interval: rule.interval,
    dayOfMonth: rule.dayOfMonth,
    dayOfWeek: rule.dayOfWeek,
    startDate: rule.startDate.toISOString(),
    endDate: rule.endDate ? rule.endDate.toISOString() : null,
    nextRunAt: rule.nextRunAt.toISOString(),
    autoPost: rule.autoPost,
    isActive: rule.isActive,
    lastRunAt: rule.lastRunAt ? rule.lastRunAt.toISOString() : null,
    createdAt: rule.createdAt.toISOString(),
    updatedAt: rule.updatedAt.toISOString(),
    category: {
      id: rule.category.id,
      name: rule.category.name,
      type: rule.category.type,
      icon: rule.category.icon,
      color: rule.category.color
    }
  };
}

function computeNextRunDate(input: {
  frequency: "WEEKLY" | "MONTHLY";
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
  fromDate: Date;
}) {
  const from = normalizeStartOfDay(input.fromDate);

  if (input.frequency === "WEEKLY") {
    const targetDay = input.dayOfWeek ?? 0;
    const currentDay = from.getDay();
    const delta = (targetDay - currentDay + 7) % 7;
    const result = new Date(from);
    result.setDate(from.getDate() + delta);
    return result;
  }

  const targetDay = input.dayOfMonth ?? 1;
  const result = new Date(from.getFullYear(), from.getMonth(), targetDay, 0, 0, 0, 0);
  if (result < from) {
    result.setMonth(result.getMonth() + 1);
  }
  return result;
}

function advanceOccurrenceDate(rule: {
  frequency: string;
  interval: number;
  dayOfWeek: number | null;
  dayOfMonth: number | null;
}, date: Date) {
  const base = normalizeStartOfDay(date);
  if (rule.frequency === "WEEKLY") {
    const next = new Date(base);
    next.setDate(next.getDate() + 7 * rule.interval);
    return next;
  }

  const next = new Date(base);
  next.setMonth(next.getMonth() + rule.interval);
  const targetDay = rule.dayOfMonth ?? 1;
  next.setDate(Math.min(targetDay, 28));
  return normalizeStartOfDay(next);
}

function isUniqueConstraintError(error: unknown) {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  );
}

async function ensureCategoryCanBeUsed(
  userId: string,
  categoryId: string,
  type: TransactionType
) {
  const category = await prisma.category.findFirst({
    where: {
      id: categoryId,
      type,
      OR: [{ userId }, { userId: null, isDefault: true }]
    },
    select: {
      id: true,
      type: true
    }
  });

  if (!category) {
    throw new HttpError("Kategori recurring tidak valid", 400);
  }

  return category;
}

async function getOwnedRuleOrThrow(userId: string, recurringRuleId: string) {
  const rule = await prisma.recurringRule.findFirst({
    where: { id: recurringRuleId, userId },
    include: recurringCategoryInclude
  });

  if (!rule) {
    throw new HttpError("Recurring rule tidak ditemukan", 404);
  }

  return rule;
}

export async function createRecurringRule(
  userId: string,
  input: CreateRecurringRuleInput
) {
  await ensureCategoryCanBeUsed(userId, input.categoryId, input.type as TransactionType);
  const startDate = normalizeStartOfDay(input.startDate);
  const nextRunAt = computeNextRunDate({
    frequency: input.frequency,
    interval: input.interval ?? 1,
    dayOfMonth: input.dayOfMonth ?? null,
    dayOfWeek: input.dayOfWeek ?? null,
    fromDate: startDate
  });

  const recurringRule = await prisma.recurringRule.create({
    data: {
      userId,
      categoryId: input.categoryId,
      type: input.type as TransactionType,
      amount: input.amount,
      note: input.note?.trim() || null,
      frequency: input.frequency,
      interval: input.interval ?? 1,
      dayOfMonth: input.dayOfMonth ?? null,
      dayOfWeek: input.dayOfWeek ?? null,
      startDate,
      endDate: input.endDate ?? null,
      nextRunAt,
      autoPost: input.autoPost ?? true,
      isActive: input.isActive ?? true
    },
    include: recurringCategoryInclude
  });

  return toRecurringRuleResponse(recurringRule);
}

export async function getRecurringRules(userId: string) {
  const recurringRules = await prisma.recurringRule.findMany({
    where: { userId },
    include: recurringCategoryInclude,
    orderBy: [{ isActive: "desc" }, { nextRunAt: "asc" }]
  });

  return recurringRules.map(toRecurringRuleResponse);
}

export async function updateRecurringRule(
  userId: string,
  recurringRuleId: string,
  input: UpdateRecurringRuleInput
) {
  const existingRule = await getOwnedRuleOrThrow(userId, recurringRuleId);
  const nextType = (input.type ?? existingRule.type) as TransactionType;
  const nextCategoryId = input.categoryId ?? existingRule.categoryId;
  await ensureCategoryCanBeUsed(userId, nextCategoryId, nextType);

  const mergedFrequency = input.frequency ?? (existingRule.frequency as "WEEKLY" | "MONTHLY");
  const mergedInterval = input.interval ?? existingRule.interval;
  const mergedStartDate = normalizeStartOfDay(input.startDate ?? existingRule.startDate);
  const mergedDayOfWeek = input.dayOfWeek ?? existingRule.dayOfWeek;
  const mergedDayOfMonth = input.dayOfMonth ?? existingRule.dayOfMonth;
  const shouldRecomputeNextRun =
    input.frequency !== undefined ||
    input.interval !== undefined ||
    input.startDate !== undefined ||
    input.dayOfWeek !== undefined ||
    input.dayOfMonth !== undefined;

  const recurringRule = await prisma.recurringRule.update({
    where: { id: existingRule.id },
    data: {
      categoryId: nextCategoryId,
      type: nextType,
      amount: input.amount ?? existingRule.amount,
      note: input.note !== undefined ? input.note?.trim() || null : existingRule.note,
      frequency: mergedFrequency,
      interval: mergedInterval,
      dayOfWeek: mergedDayOfWeek ?? null,
      dayOfMonth: mergedDayOfMonth ?? null,
      startDate: mergedStartDate,
      endDate: input.endDate !== undefined ? input.endDate : existingRule.endDate,
      autoPost: input.autoPost ?? existingRule.autoPost,
      isActive: input.isActive ?? existingRule.isActive,
      nextRunAt: shouldRecomputeNextRun
        ? computeNextRunDate({
            frequency: mergedFrequency,
            interval: mergedInterval,
            dayOfWeek: mergedDayOfWeek ?? null,
            dayOfMonth: mergedDayOfMonth ?? null,
            fromDate: mergedStartDate
          })
        : existingRule.nextRunAt
    },
    include: recurringCategoryInclude
  });

  return toRecurringRuleResponse(recurringRule);
}

export async function deleteRecurringRule(userId: string, recurringRuleId: string) {
  const existingRule = await getOwnedRuleOrThrow(userId, recurringRuleId);
  const deletedRule = await prisma.recurringRule.delete({
    where: { id: existingRule.id },
    include: recurringCategoryInclude
  });
  return toRecurringRuleResponse(deletedRule);
}

export async function runDueRecurringRules(
  userId: string,
  nowInput: Date = new Date()
): Promise<RunDueRecurringResult> {
  const now = normalizeStartOfDay(nowInput);
  const dueRules = await prisma.recurringRule.findMany({
    where: {
      userId,
      isActive: true,
      nextRunAt: { lte: now }
    },
    orderBy: { nextRunAt: "asc" }
  });

  let generatedCount = 0;
  let skippedCount = 0;

  for (const rule of dueRules) {
    let occurrenceDate = normalizeStartOfDay(rule.nextRunAt);
    let iterationGuard = 0;

    while (occurrenceDate <= now && iterationGuard < 60) {
      iterationGuard += 1;

      if (rule.endDate && occurrenceDate > normalizeStartOfDay(rule.endDate)) {
        break;
      }

      try {
        await prisma.$transaction(async (tx) => {
          const recurringRun = await tx.recurringRuleRun.create({
            data: {
              userId,
              recurringRuleId: rule.id,
              occurrenceDate,
              transactionId: null
            }
          });

          if (!rule.autoPost) {
            return;
          }

          const transaction = await tx.transaction.create({
            data: {
              userId,
              categoryId: rule.categoryId,
              type: rule.type,
              amount: rule.amount,
              note: rule.note,
              date: occurrenceDate
            }
          });

          await tx.recurringRuleRun.update({
            where: {
              id: recurringRun.id
            },
            data: {
              transactionId: transaction.id
            }
          });
        });
        generatedCount += 1;
      } catch (error) {
        if (!isUniqueConstraintError(error)) {
          throw error;
        }

        skippedCount += 1;
      }

      const nextOccurrence = advanceOccurrenceDate(rule, occurrenceDate);
      occurrenceDate = nextOccurrence;
    }

    await prisma.recurringRule.update({
      where: { id: rule.id },
      data: {
        lastRunAt: now,
        nextRunAt: occurrenceDate
      }
    });
  }

  return {
    generatedCount,
    skippedCount,
    processedRuleCount: dueRules.length
  };
}
