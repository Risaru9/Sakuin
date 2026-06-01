import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/db/prisma.js";
import {
  getCachedFinancialContext,
  setCachedFinancialContext,
  invalidateCachedFinancialContext,
  clearAllFinancialContextCaches,
  setBypassTestCheck
} from "../src/modules/ai/ai-financial-context-cache.js";
import { getAiFinancialContext, type AiFinancialContext } from "../src/modules/ai/ai-financial-context.js";
import { createTransaction } from "../src/modules/transactions/transaction.service.js";
import { createGoal } from "../src/modules/goals/goal.service.js";
import { updateUserProfile } from "../src/modules/users/user.service.js";
import {
  createCategoryService,
  deleteCategoryService,
  updateCategoryService
} from "../src/modules/categories/category.service.js";
import { runDueRecurringRules } from "../src/modules/recurring/recurring.service.js";

function createUniqueEmail(label: string) {
  return `sakuin+ai-cache-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
}

async function createTestUser(label: string) {
  return prisma.user.create({
    data: {
      name: "AI Cache Test User",
      email: createUniqueEmail(label),
      passwordHash: "hashed-password-for-ai-cache-test",
      safeBalanceLimit: "50000"
    }
  });
}

describe("AI Financial Context Caching & Invalidation", () => {
  beforeEach(() => {
    setBypassTestCheck(true);
    clearAllFinancialContextCaches();
  });

  afterEach(async () => {
    vi.useRealTimers();
    setBypassTestCheck(false);
    clearAllFinancialContextCaches();
    await prisma.user.deleteMany({
      where: {
        email: {
          contains: "sakuin+ai-cache-"
        }
      }
    });
  });

  it("should get and set cache correctly when bypassTestCheck is enabled", async () => {
    const userId = "test-user-id";
    const mockContext = {
      currency: "IDR" as const,
      generatedAt: new Date().toISOString(),
      safeBalanceLimit: "100.00",
      currentMonth: {
        periodLabel: "Mei 2026",
        startDate: "",
        endDate: "",
        totalIncome: "0",
        totalExpense: "0",
        netCashflow: "0",
        transactionCount: 0,
        topExpenseCategories: []
      },
      previousMonth: {
        periodLabel: "April 2026",
        startDate: "",
        endDate: "",
        totalIncome: "0",
        totalExpense: "0",
        netCashflow: "0",
        transactionCount: 0,
        topExpenseCategories: []
      },
      monthComparison: {
        incomeChangePercent: 0,
        expenseChangePercent: 0
      },
      goals: {
        totalGoals: 0,
        completedGoals: 0,
        activeGoals: 0,
        overdueGoals: 0
      },
      safeToSpend: {
        status: "UNKNOWN" as const,
        spendingPaceStatus: "UNKNOWN" as const,
        netCashflow: 0,
        safeBalanceLimit: 0,
        availableToSpend: 0,
        remainingDays: 0,
        suggestedDailyLimit: null,
        expenseToIncomeRatio: null,
        monthProgressPercent: 0,
        expensePacePercent: 0,
        projectedMonthEndExpense: 0,
        projectedNetCashflow: 0,
        topRiskCategoryName: null,
        topRiskCategoryAmount: null,
        reason: "",
        action: "",
        warnings: []
      }
    };

    setCachedFinancialContext(userId, mockContext as unknown as AiFinancialContext);
    const cached = getCachedFinancialContext(userId);
    expect(cached).toEqual(mockContext);

    invalidateCachedFinancialContext(userId);
    expect(getCachedFinancialContext(userId)).toBeNull();
  });

  it("should invalidate cache when a new transaction is created", async () => {
    const user = await createTestUser("tx-create");
    
    // Hit database to generate and cache context
    await getAiFinancialContext(user.id);
    expect(getCachedFinancialContext(user.id)).toBeDefined();

    // Create a transaction, which should trigger cache invalidation
    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name: "Makanan",
        type: "EXPENSE",
        isDefault: false
      }
    });

    await createTransaction(user.id, {
      categoryId: category.id,
      amount: "10000",
      type: "EXPENSE",
      date: new Date()
    });

    // Cache must be invalidated (should be null)
    expect(getCachedFinancialContext(user.id)).toBeNull();
  });

  it("should expire cached context after TTL and when the calendar day changes", () => {
    const userId = "cache-expiry-user";
    const referenceDate = new Date("2026-06-01T10:00:00.000Z");
    const mockContext = {
      generatedAt: referenceDate.toISOString()
    } as AiFinancialContext;

    vi.useFakeTimers();
    vi.setSystemTime(referenceDate);

    setCachedFinancialContext(userId, mockContext, referenceDate, {
      ttlMs: 1000
    });

    expect(
      getCachedFinancialContext(userId, new Date("2026-06-01T10:00:00.500Z"))
    ).toBe(mockContext);

    vi.setSystemTime(new Date("2026-06-01T10:00:01.000Z"));

    expect(
      getCachedFinancialContext(userId, new Date("2026-06-01T10:00:01.000Z"))
    ).toBeNull();

    vi.setSystemTime(referenceDate);
    setCachedFinancialContext(userId, mockContext, referenceDate, {
      ttlMs: 24 * 60 * 60 * 1000
    });

    expect(
      getCachedFinancialContext(userId, new Date("2026-06-02T00:00:00.000Z"))
    ).toBeNull();
  });

  it("should invalidate cache when a goal is created", async () => {
    const user = await createTestUser("goal-create");
    
    await getAiFinancialContext(user.id);
    expect(getCachedFinancialContext(user.id)).toBeDefined();

    await createGoal(user.id, {
      name: "Tabungan Laptop",
      targetAmount: "10000000",
      currentAmount: "1000000"
    });

    expect(getCachedFinancialContext(user.id)).toBeNull();
  });

  it("should invalidate cache when user profile is updated", async () => {
    const user = await createTestUser("profile-update");
    
    await getAiFinancialContext(user.id);
    expect(getCachedFinancialContext(user.id)).toBeDefined();

    await updateUserProfile(user.id, {
      safeBalanceLimit: "100000"
    });

    expect(getCachedFinancialContext(user.id)).toBeNull();
  });

  it("should invalidate cache when a category is created, updated, or deleted", async () => {
    const user = await createTestUser("category-create");

    await getAiFinancialContext(user.id);
    expect(getCachedFinancialContext(user.id)).toBeDefined();

    const category = await createCategoryService(user.id, {
      name: `Cache Category ${Date.now()}`,
      type: "EXPENSE"
    });

    expect(getCachedFinancialContext(user.id)).toBeNull();

    await getAiFinancialContext(user.id);
    await updateCategoryService(user.id, category.id, {
      name: `${category.name} Updated`
    });

    expect(getCachedFinancialContext(user.id)).toBeNull();

    await getAiFinancialContext(user.id);
    await deleteCategoryService(user.id, category.id);

    expect(getCachedFinancialContext(user.id)).toBeNull();
  });

  it("should invalidate cache when recurring rules generate transactions", async () => {
    const user = await createTestUser("recurring-run");
    const category = await prisma.category.create({
      data: {
        userId: user.id,
        name: "Langganan",
        type: "EXPENSE",
        isDefault: false
      }
    });
    const occurrenceDate = new Date("2026-06-01T00:00:00.000Z");
    const runDate = new Date("2026-06-02T00:00:00.000Z");

    await prisma.recurringRule.create({
      data: {
        userId: user.id,
        categoryId: category.id,
        type: "EXPENSE",
        amount: "15000",
        frequency: "MONTHLY",
        interval: 1,
        dayOfMonth: 1,
        startDate: occurrenceDate,
        nextRunAt: occurrenceDate,
        autoPost: true,
        isActive: true
      }
    });

    await getAiFinancialContext(user.id, runDate);
    expect(getCachedFinancialContext(user.id, runDate)).toBeDefined();

    await runDueRecurringRules(user.id, runDate);

    expect(getCachedFinancialContext(user.id, runDate)).toBeNull();
  });
});
