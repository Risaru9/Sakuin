import { randomUUID } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { buildRuleBasedTransactionDraft } from "../src/modules/ai/ai-transaction-draft.js";

type CategoryType = "INCOME" | "EXPENSE";

const createdUserIds = new Set<string>();

async function createTestUser(prefix: string) {
  const user = await prisma.user.create({
    data: {
      name: `AI Draft Test ${prefix}`,
      email: `${prefix}-${randomUUID()}@example.com`,
      passwordHash: "hashed-password"
    }
  });

  createdUserIds.add(user.id);

  return user;
}

async function createCategory(input: {
  userId: string;
  name: string;
  type: CategoryType;
  isDefault?: boolean;
}) {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      icon: null,
      color: null,
      isDefault: input.isDefault ?? false
    }
  });
}

afterEach(async () => {
  const userIds = [...createdUserIds];

  if (userIds.length === 0) {
    return;
  }

  await prisma.transaction.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  await prisma.goal.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  await prisma.category.deleteMany({
    where: {
      userId: {
        in: userIds
      }
    }
  });

  await prisma.user.deleteMany({
    where: {
      id: {
        in: userIds
      }
    }
  });

  createdUserIds.clear();
});

describe("AI rule-based transaction draft", () => {
  it("membuat draft pengeluaran makanan dari chat natural", async () => {
    const user = await createTestUser("expense-food");

    const foodCategory = await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "catat makan ayam geprek 15000 tadi siang"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("15000");
    expect(draft.categoryId).toBe(foodCategory.id);
    expect(draft.categoryName).toBe("Makanan");
    expect(draft.note).toContain("ayam");
    expect(draft.note).toContain("geprek");
    expect(draft.confidence).toBe("high");
    expect(draft.missingFields).toEqual([]);
  });

  it("membuat draft pemasukan dari variasi dikasih uang", async () => {
    const user = await createTestUser("income-gift");

    const giftCategory = await createCategory({
      userId: user.id,
      name: "Hadiah",
      type: "INCOME"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "catat dikasih kakak 100000"
    });

    expect(draft.type).toBe("INCOME");
    expect(draft.amount).toBe("100000");
    expect(draft.categoryId).toBe(giftCategory.id);
    expect(draft.categoryName).toBe("Hadiah");
    expect(draft.note).toContain("kakak");
  });

  it("mendukung nominal ribu dan juta", async () => {
    const user = await createTestUser("money-format");

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    await prisma.category.upsert({
  where: {
    id: "cat_expense_fuel"
  },
  update: {
    name: "Bensin",
    type: "EXPENSE",
    icon: "fuel",
    color: "#ef4444",
    isDefault: true,
    userId: null
  },
  create: {
    id: "cat_expense_fuel",
    userId: null,
    name: "Bensin",
    type: "EXPENSE",
    icon: "fuel",
    color: "#ef4444",
    isDefault: true
  }
});

    const smallDraft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "bensin 30rb kemarin"
    });

    expect(smallDraft.type).toBe("EXPENSE");
    expect(smallDraft.amount).toBe("30000");
    expect(smallDraft.categoryName).toBe("Bensin");

    const bigDraft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "bayar kos 1,5 juta tanggal 10"
    });

    expect(bigDraft.amount).toBe("1500000");
  });

  it("tidak menganggap tanggal sebagai nominal", async () => {
    const user = await createTestUser("date-not-money");

    await createCategory({
      userId: user.id,
      name: "Kos",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "bayar kos 500000 tanggal 10"
    });

    expect(draft.amount).toBe("500000");
    expect(draft.date.endsWith("-10")).toBe(true);
  });

  it("menghasilkan missingFields jika nominal tidak jelas", async () => {
    const user = await createTestUser("missing-amount");

    await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "catat makan ayam geprek"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("");
    expect(draft.categoryName).toBe("Makanan");
    expect(draft.confidence).toBe("low");
    expect(draft.missingFields).toContain("amount");
    expect(draft.warnings.length).toBeGreaterThan(0);
  });
});