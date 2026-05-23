import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { getAiFinancialContext } from "../src/modules/ai/ai-financial-context.js";

function createUniqueEmail(label: string) {
  return `sakuin+ai-context-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
}

async function createTestUser(label: string) {
  return prisma.user.create({
    data: {
      name: "AI Context Test User",
      email: createUniqueEmail(label),
      passwordHash: "hashed-password-for-ai-context-test",
      safeBalanceLimit: "50000"
    }
  });
}

async function createCategory(input: {
  userId: string;
  name: string;
  type: "INCOME" | "EXPENSE";
}) {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      isDefault: false
    }
  });
}

afterEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: "sakuin+ai-context-"
      }
    }
  });
});

describe("AI financial context", () => {
  it("membuat ringkasan finansial user dari transaksi bulan ini dan bulan lalu", async () => {
    const user = await createTestUser("summary");
    const otherUser = await createTestUser("other-user");

    const incomeCategory = await createCategory({
      userId: user.id,
      name: "Gaji",
      type: "INCOME"
    });

    const foodCategory = await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    const transportCategory = await createCategory({
      userId: user.id,
      name: "Transport",
      type: "EXPENSE"
    });

    const otherUserCategory = await createCategory({
      userId: otherUser.id,
      name: "Kategori User Lain",
      type: "EXPENSE"
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "1500000",
          note: "Gaji rahasia bulan Mei",
          date: new Date("2026-05-02T08:00:00.000Z")
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "200000",
          note: "Makanan rahasia pertama",
          date: new Date("2026-05-05T08:00:00.000Z")
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Makanan rahasia kedua",
          date: new Date("2026-05-10T08:00:00.000Z")
        },
        {
          userId: user.id,
          categoryId: transportCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Transport rahasia",
          date: new Date("2026-05-12T08:00:00.000Z")
        },
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "1000000",
          note: "Gaji rahasia bulan April",
          date: new Date("2026-04-02T08:00:00.000Z")
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "250000",
          note: "Makanan rahasia bulan April",
          date: new Date("2026-04-12T08:00:00.000Z")
        },
        {
          userId: otherUser.id,
          categoryId: otherUserCategory.id,
          type: "EXPENSE",
          amount: "999999",
          note: "Transaksi user lain tidak boleh masuk",
          date: new Date("2026-05-12T08:00:00.000Z")
        }
      ]
    });

    await prisma.goal.createMany({
      data: [
        {
          userId: user.id,
          name: "Dana Darurat",
          targetAmount: "1000000",
          currentAmount: "300000",
          deadline: new Date("2026-06-30T00:00:00.000Z")
        },
        {
          userId: user.id,
          name: "Laptop",
          targetAmount: "2000000",
          currentAmount: "2000000",
          deadline: new Date("2026-05-30T00:00:00.000Z")
        },
        {
          userId: user.id,
          name: "Goal Telat",
          targetAmount: "1000000",
          currentAmount: "100000",
          deadline: new Date("2026-04-01T00:00:00.000Z")
        }
      ]
    });

    const context = await getAiFinancialContext(
      user.id,
      new Date("2026-05-20T12:00:00.000Z")
    );

    expect(context.currency).toBe("IDR");
    expect(context.safeBalanceLimit).toBe("50000.00");

    expect(context.currentMonth.totalIncome).toBe("1500000.00");
    expect(context.currentMonth.totalExpense).toBe("400000.00");
    expect(context.currentMonth.netCashflow).toBe("1100000.00");
    expect(context.currentMonth.transactionCount).toBe(4);

    expect(context.currentMonth.topExpenseCategories).toEqual([
      {
        name: "Makanan",
        amount: "300000.00",
        transactionCount: 2,
        percentageOfExpense: 75,
        percentageOfIncome: 20
      },
      {
        name: "Transport",
        amount: "100000.00",
        transactionCount: 1,
        percentageOfExpense: 25,
        percentageOfIncome: 6.67
      }
    ]);

    expect(context.previousMonth.totalIncome).toBe("1000000.00");
    expect(context.previousMonth.totalExpense).toBe("250000.00");
    expect(context.previousMonth.netCashflow).toBe("750000.00");
    expect(context.previousMonth.transactionCount).toBe(2);

    expect(context.monthComparison).toEqual({
      incomeChangePercent: 50,
      expenseChangePercent: 60
    });

    expect(context.goals).toEqual({
      totalGoals: 3,
      completedGoals: 1,
      activeGoals: 2,
      overdueGoals: 1
    });

    expect(context.safeToSpend.status).toBe("WATCH");
    expect(context.safeToSpend.spendingPaceStatus).toBe("ON_TRACK");
    expect(context.safeToSpend.availableToSpend).toBe(1050000);
    expect(context.safeToSpend.suggestedDailyLimit).toBe(87500);
    expect(context.safeToSpend.expenseToIncomeRatio).toBe(26.7);
    expect(context.safeToSpend.topRiskCategoryName).toBe("Makanan");
    expect(context.safeToSpend.topRiskCategoryAmount).toBe(300000);
    expect(context.safeToSpend.reason).toContain("kategori Makanan");
    expect(context.safeToSpend.action).toContain("Makanan");  

    const serializedContext = JSON.stringify(context);

    expect(serializedContext).not.toContain(user.id);
    expect(serializedContext).not.toContain(otherUser.id);
    expect(serializedContext).not.toContain(user.email);
    expect(serializedContext).not.toContain(otherUser.email);
    expect(serializedContext).not.toContain("Gaji rahasia bulan Mei");
    expect(serializedContext).not.toContain("Makanan rahasia pertama");
    expect(serializedContext).not.toContain("Transaksi user lain tidak boleh masuk");
    expect(serializedContext).not.toContain("999999");
    expect(serializedContext).not.toContain("Kategori User Lain");
  });

  it("menghasilkan context kosong yang aman jika user belum memiliki transaksi", async () => {
    const user = await createTestUser("empty");

    const context = await getAiFinancialContext(
      user.id,
      new Date("2026-05-20T12:00:00.000Z")
    );

    expect(context.currentMonth.totalIncome).toBe("0.00");
    expect(context.currentMonth.totalExpense).toBe("0.00");
    expect(context.currentMonth.netCashflow).toBe("0.00");
    expect(context.currentMonth.transactionCount).toBe(0);
    expect(context.currentMonth.topExpenseCategories).toEqual([]);

    expect(context.previousMonth.totalIncome).toBe("0.00");
    expect(context.previousMonth.totalExpense).toBe("0.00");

    expect(context.monthComparison).toEqual({
      incomeChangePercent: 0,
      expenseChangePercent: 0
    });

    expect(context.goals).toEqual({
      totalGoals: 0,
      completedGoals: 0,
      activeGoals: 0,
      overdueGoals: 0
    });

    expect(context.safeToSpend.status).toBe("UNKNOWN");
    expect(context.safeToSpend.spendingPaceStatus).toBe("UNKNOWN");
    expect(context.safeToSpend.availableToSpend).toBe(0);
    expect(context.safeToSpend.suggestedDailyLimit).toBeNull();
    expect(context.safeToSpend.expenseToIncomeRatio).toBeNull();
    expect(context.safeToSpend.topRiskCategoryName).toBeNull();
    expect(context.safeToSpend.warnings).toContain("Belum ada transaksi bulan ini.");
  });

  it("gagal jika user tidak ditemukan", async () => {
    await expect(
      getAiFinancialContext("missing-user-id", new Date("2026-05-20T12:00:00.000Z"))
    ).rejects.toThrow("User tidak ditemukan");
  });
});