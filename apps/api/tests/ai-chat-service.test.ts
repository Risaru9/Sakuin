import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { getAiChatResponse } from "../src/modules/ai/ai.service.js";

function createUniqueEmail(label: string) {
  return `sakuin+ai-chat-service-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
}

function getCurrentMonthDate(day: number) {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 8, 0, 0, 0)
  );
}

function getPreviousMonthDate(day: number) {
  const now = new Date();

  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 8, 0, 0, 0)
  );
}

async function createTestUser(label: string) {
  return prisma.user.create({
    data: {
      name: "AI Chat Service User",
      email: createUniqueEmail(label),
      passwordHash: "hashed-password-for-ai-chat-service-test",
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
        contains: "sakuin+ai-chat-service-"
      }
    }
  });
});

describe("AI chat service contract", () => {
  it("menolak pertanyaan di luar finansial tanpa mengambil data user", async () => {
    const response = await getAiChatResponse({
      userId: "user-tidak-perlu-ada",
      message: "buatkan cerpen tentang kerajaan"
    });

    expect(response.intent).toBe("OUT_OF_SCOPE");
    expect(response.reply).toContain("Asisten Sakuin hanya bisa membantu");
    expect(response.cards).toEqual([]);
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  it("mengembalikan spending analysis dari data finansial user", async () => {
    const user = await createTestUser("spending");

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

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "1500000",
          note: "Gaji sensitif tidak boleh bocor",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "200000",
          note: "Makanan sensitif pertama",
          date: getCurrentMonthDate(5)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Makanan sensitif kedua",
          date: getCurrentMonthDate(10)
        },
        {
          userId: user.id,
          categoryId: transportCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Transport sensitif",
          date: getCurrentMonthDate(12)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "250000",
          note: "Makanan bulan lalu sensitif",
          date: getPreviousMonthDate(12)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "saya boros di mana bulan ini?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("Pengeluaranmu bulan ini");
    expect(response.reply).toContain("Makanan");
    expect(response.cards.some((card) => card.label === "Total Pengeluaran")).toBe(
      true
    );
    expect(response.cards.some((card) => card.value === "Makanan")).toBe(true);

    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
    expect(serializedResponse).not.toContain("Gaji sensitif tidak boleh bocor");
    expect(serializedResponse).not.toContain("Makanan sensitif pertama");
    expect(serializedResponse).not.toContain("Transport sensitif");
  });

  it("mengembalikan response aman jika user belum memiliki transaksi", async () => {
    const user = await createTestUser("empty");

    const response = await getAiChatResponse({
      userId: user.id,
      message: "pengeluaran saya bulan ini gimana?"
    });

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("Belum ada data pengeluaran");
    expect(response.cards.some((card) => card.label === "Total Pengeluaran")).toBe(
      true
    );
    expect(response.cards.some((card) => card.value === "Belum ada")).toBe(true);
  });

  it("mengembalikan transaction draft placeholder tanpa auto-save", async () => {
    const response = await getAiChatResponse({
      userId: "user-1",
      message: "catat makan ayam geprek 15000 tadi siang"
    });

    expect(response.intent).toBe("TRANSACTION_DRAFT");
    expect(response.reply).toContain("draft transaksi");
    expect(response.reply).toContain("review");
    expect(response.cards).toEqual([
      {
        label: "Status",
        value: "Draft transaksi belum diaktifkan"
      }
    ]);
  });

  it("tidak membocorkan userId pada response financial summary", async () => {
    const user = await createTestUser("no-leak");

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kondisi keuangan saya bulan ini gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
  });
});