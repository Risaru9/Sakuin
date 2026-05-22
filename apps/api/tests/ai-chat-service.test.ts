import { randomUUID } from "crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { prisma } from "../src/db/prisma.js";
import { getAiChatResponse } from "../src/modules/ai/ai.service.js";

type CategoryType = "INCOME" | "EXPENSE";

const createdUserIds = new Set<string>();

async function createTestUser(prefix: string) {
  const user = await prisma.user.create({
    data: {
      name: `AI Test User ${prefix}`,
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
}) {
  return prisma.category.create({
    data: {
      userId: input.userId,
      name: input.name,
      type: input.type,
      icon: null,
      color: null,
      isDefault: false
    }
  });
}

function getCurrentMonthDate(day: number) {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), day, 12));
}

function getPreviousMonthDate(day: number) {
  const now = new Date();

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, day, 12));
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

describe("AI chat service contract", () => {

    it("memahami permintaan lanjutan dari konteks finansial sebelumnya", async () => {
    const user = await createTestUser("financial-continuation-follow-up");

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

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "4000000",
          note: "Gaji sensitif tidak boleh bocor",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "2800000",
          note: "Makan sensitif tidak boleh bocor",
          date: getCurrentMonthDate(8)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Lanjutannya, kondisi ini masih perlu dijaga karena pengeluaran sudah cukup besar dibanding pemasukan. Fokus pertama adalah menahan kategori pengeluaran terbesar dan menjaga sisa cashflow tetap di atas batas aman.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "lanjutannya apa?",
        history: [
          {
            role: "user",
            content: "kondisi keuangan saya bulan ini gimana?"
          },
          {
            role: "assistant",
            content:
              "Status kesehatan keuanganmu bulan ini waspada ringan. Pengeluaranmu cukup besar dibanding pemasukan."
          }
        ]
      },
      {
        provider: {
          generateText
        }
      }
    );

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(response.reply).toContain("Lanjutannya");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(serializedResponse).not.toContain("Gaji sensitif tidak boleh bocor");
    expect(serializedResponse).not.toContain("Makan sensitif tidak boleh bocor");
  });
  
  it("memahami follow-up finansial dari chat history", async () => {
    const user = await createTestUser("context-follow-up");

    const generateText = vi.fn().mockResolvedValue({
      text: "Opsi Android Rp10 juta lebih ringan dibanding iPhone Rp16 juta. Dengan gaji Rp6 juta, risikonya lebih rendah karena kebutuhan tabungan relatif lebih kecil, tetapi tetap perlu menentukan deadline agar bisa dinilai lebih akurat.",
      model: "mock-complex-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message:
          "Bagaimana jika saya membeli handphone android seharga 10 juta saja apakah mungkin lebih realistis dan low risk?",
        history: [
          {
            role: "user",
            content:
              "Apa pendapat anda jika saya memiliki gaji 6 juta namun ingin membeli handphone iPhone yang seharga 16 jutaan, apa saran anda?"
          },
          {
            role: "assistant",
            content:
              "Butuh data tambahan seperti deadline, tetapi pembelian iPhone Rp16 juta dengan gaji Rp6 juta perlu direncanakan agar tidak mengganggu stabilitas keuangan."
          }
        ]
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("GOAL_ANALYSIS");
    expect(response.reply).toContain("Android");
    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("RECENT CONVERSATION CONTEXT");
    expect(serializedProviderInput).toContain("iPhone");
    expect(serializedProviderInput).toContain("Rp16 juta");
  });

  it("mengirim analisis skenario finansial deterministik ke AI provider", async () => {
    const user = await createTestUser("scenario-consultant");

    const generateText = vi.fn().mockResolvedValue({
      text: "Untuk motor Rp30 juta dengan gaji Rp8 juta, tenor 12 bulan cukup berisiko karena butuh sekitar Rp2,5 juta per bulan. Tenor 32 bulan lebih ringan, tetapi total biaya kredit bisa lebih besar jika ada bunga.",
      model: "mock-complex-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message:
          "Gaji saya 8 juta, ingin membeli motor harga 30 juta, tenor 12 sampai 32 bulan apakah realistis?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("GOAL_ANALYSIS");
    expect(response.cards.some((card) => card.label === "Target")).toBe(true);
    expect(response.cards.some((card) => card.label === "Pendapatan")).toBe(true);
    expect(response.cards.some((card) => card.label === "Termurah / Bulan")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Terberat / Bulan")).toBe(
      true
    );

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("FINANCIAL SCENARIO ANALYSIS");
    expect(serializedProviderInput).toContain("Pendapatan bulanan skenario user");
    expect(serializedProviderInput).toContain("8.000.000");
    expect(serializedProviderInput).toContain("30.000.000");
    expect(serializedProviderInput).toContain("12 bulan");
    expect(serializedProviderInput).toContain("32 bulan");
    expect(serializedProviderInput).toContain("Berisiko tinggi");
  });

  it("menggunakan AI provider untuk memperjelas financial response jika provider tersedia", async () => {
    const user = await createTestUser("ai-provider");

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
          amount: "300000",
          note: "Makanan sensitif tidak boleh bocor",
          date: getCurrentMonthDate(5)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Bulan ini pengeluaranmu masih terkendali, tetapi kategori Makanan menjadi pengeluaran utama. Coba tetapkan batas mingguan agar pengeluaran tetap stabil.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "saya boros di mana bulan ini?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("kategori Makanan");
    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("SAFE FINANCIAL CONTEXT");
    expect(serializedProviderInput).toContain("DETERMINISTIC BACKEND SUMMARY");
    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain("Gaji sensitif tidak boleh bocor");
    expect(serializedProviderInput).not.toContain(
      "Makanan sensitif tidak boleh bocor"
    );
  });

  it("fallback ke rule-based response jika AI provider gagal", async () => {
    const user = await createTestUser("ai-provider-fallback");

    const foodCategory = await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    await prisma.transaction.create({
      data: {
        userId: user.id,
        categoryId: foodCategory.id,
        type: "EXPENSE",
        amount: "100000",
        note: "Fallback note sensitif",
        date: getCurrentMonthDate(5)
      }
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "saya boros di mana bulan ini?"
      },
      {
        provider: {
          generateText: vi.fn().mockRejectedValue(new Error("AI provider down"))
        }
      }
    );

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("Pengeluaranmu bulan ini");
    expect(response.cards.some((card) => card.label === "Total Pengeluaran")).toBe(
      true
    );
    expect(serializedResponse).not.toContain("Fallback note sensitif");
  });

  it("menolak pertanyaan di luar finansial tanpa mengambil data user", async () => {
    const response = await getAiChatResponse({
      userId: "user-yang-tidak-ada",
      message: "buatkan cerpen tentang kerajaan"
    });

    expect(response.intent).toBe("OUT_OF_SCOPE");
    expect(response.reply).toContain("Asisten Sakuin hanya bisa membantu");
    expect(response.cards).toEqual([]);
  });

  it("mengembalikan spending analysis dari data finansial user", async () => {
    const user = await createTestUser("spending-analysis");

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

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "2000000",
          note: "Gaji bulanan",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "250000",
          note: "Makan siang",
          date: getCurrentMonthDate(4)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "150000",
          note: "Makan malam",
          date: getCurrentMonthDate(8)
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
    expect(response.cards.some((card) => card.label === "Total Pengeluaran")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Kategori Terbesar")).toBe(
      true
    );
    expect(serializedResponse).toContain("Makanan");
    expect(serializedResponse).not.toContain("Makan siang");
    expect(serializedResponse).not.toContain("Makan malam");
  });

  it("mengembalikan response aman jika user belum memiliki transaksi", async () => {
    const user = await createTestUser("empty-financial-data");

    const response = await getAiChatResponse({
      userId: user.id,
      message: "pengeluaran saya bulan ini gimana?"
    });

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("Belum ada data pengeluaran bulan ini");
    expect(response.cards.some((card) => card.label === "Total Pengeluaran")).toBe(
      true
    );
  });

  it("mengembalikan rule-based transaction draft tanpa auto-save", async () => {
  const user = await createTestUser("transaction-draft");

  const foodCategory = await createCategory({
    userId: user.id,
    name: "Makanan",
    type: "EXPENSE"
  });

  const beforeCount = await prisma.transaction.count({
    where: {
      userId: user.id
    }
  });

  const response = await getAiChatResponse({
    userId: user.id,
    message: "catat makan ayam geprek 15000 tadi siang"
  });

  const afterCount = await prisma.transaction.count({
    where: {
      userId: user.id
    }
  });

  expect(response.intent).toBe("TRANSACTION_DRAFT");
  expect(response.reply).toContain("draft transaksi");
  expect(response.transactionDraft).toBeTruthy();
  expect(response.transactionDraft?.type).toBe("EXPENSE");
  expect(response.transactionDraft?.amount).toBe("15000");
  expect(response.transactionDraft?.categoryId).toBe(foodCategory.id);
  expect(response.transactionDraft?.categoryName).toBe("Makanan");
  expect(response.transactionDraft?.note).toContain("ayam");
  expect(response.transactionDraft?.note).toContain("geprek");
  expect(response.cards.some((card) => card.label === "Status")).toBe(true);
  expect(beforeCount).toBe(0);
  expect(afterCount).toBe(0);
});

  it("tidak membocorkan userId pada response financial summary", async () => {
    const user = await createTestUser("safe-summary");

    const incomeCategory = await createCategory({
      userId: user.id,
      name: "Gaji",
      type: "INCOME"
    });

    const expenseCategory = await createCategory({
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
          amount: "2500000",
          note: "Catatan pemasukan sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "500000",
          note: "Catatan pengeluaran sensitif",
          date: getCurrentMonthDate(3)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "300000",
          note: "Catatan bulan lalu",
          date: getPreviousMonthDate(3)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kondisi keuangan saya bulan ini gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
    expect(serializedResponse).not.toContain("Catatan pemasukan sensitif");
    expect(serializedResponse).not.toContain("Catatan pengeluaran sensitif");
    expect(serializedResponse).not.toContain("Catatan bulan lalu");
  });
    it("mengembalikan financial health snapshot pada financial summary", async () => {
    const user = await createTestUser("financial-health-summary");

    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        safeBalanceLimit: "500000"
      }
    });

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

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "4000000",
          note: "Gaji sensitif tidak boleh bocor",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "2800000",
          note: "Pengeluaran sensitif tidak boleh bocor",
          date: getCurrentMonthDate(8)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kondisi keuangan saya bulan ini gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(response.reply).toContain("Status kesehatan keuanganmu");
    expect(response.cards.some((card) => card.label === "Status Finansial")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Rasio Pengeluaran")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Batas Aman")).toBe(true);
    expect(serializedResponse).not.toContain("Gaji sensitif tidak boleh bocor");
    expect(serializedResponse).not.toContain(
      "Pengeluaran sensitif tidak boleh bocor"
    );
  });

  it("menandai financial health berisiko saat pengeluaran melebihi pemasukan", async () => {
    const user = await createTestUser("financial-health-risk");

    const incomeCategory = await createCategory({
      userId: user.id,
      name: "Gaji",
      type: "INCOME"
    });

    const expenseCategory = await createCategory({
      userId: user.id,
      name: "Belanja",
      type: "EXPENSE"
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "1000000",
          note: "Income note sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "1500000",
          note: "Expense note sensitif",
          date: getCurrentMonthDate(9)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kondisi keuangan saya bulan ini gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(response.reply).toContain("Berisiko");
    expect(
      response.cards.some(
        (card) => card.label === "Status Finansial" && card.value === "Berisiko"
      )
    ).toBe(true);
    expect(serializedResponse).not.toContain("Income note sensitif");
    expect(serializedResponse).not.toContain("Expense note sensitif");
  });
});