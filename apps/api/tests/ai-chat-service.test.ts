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

  it("mengembalikan mixed transactionDrafts dari chat service tanpa auto-save", async () => {
    const user = await createTestUser("mixed-draft-service");

    const giftCategory = await createCategory({
      userId: user.id,
      name: "Hadiah",
      type: "INCOME"
    });

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
      message: "dikasih ibu 100 ribu terus makan 15000"
    });

    const afterCount = await prisma.transaction.count({
      where: {
        userId: user.id
      }
    });

    const drafts = response.transactionDrafts ?? [];

    expect(response.intent).toBe("TRANSACTION_DRAFT");
    expect(response.reply).toContain("2 draft transaksi");
    expect(response.transactionDraft).toBeTruthy();
    expect(response.transactionDraft).toEqual(drafts[0]);
    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("100000");
    expect(drafts[0].categoryId).toBe(giftCategory.id);
    expect(drafts[0].categoryName).toBe("Hadiah");
    expect(drafts[0].note).toContain("ibu");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("15000");
    expect(drafts[1].categoryId).toBe(foodCategory.id);
    expect(drafts[1].categoryName).toBe("Makanan");
    expect(drafts[1].note).toContain("makan");

    expect(
      response.cards.some(
        (card) => card.label === "Jumlah Draft" && card.value === "2"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Siap Disimpan" && card.value === "2/2"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Total Nominal" && card.value.includes("115.000")
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Status" && card.value === "Siap direview"
      )
    ).toBe(true);

    expect(beforeCount).toBe(0);
    expect(afterCount).toBe(0);
  });

  it("mengembalikan mixed refund dan parkir sebagai transactionDrafts service", async () => {
    const user = await createTestUser("mixed-refund-parking-service");

    const refundCategory = await createCategory({
      userId: user.id,
      name: "Refund",
      type: "INCOME"
    });

    const transportCategory = await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const beforeCount = await prisma.transaction.count({
      where: {
        userId: user.id
      }
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "refund shopee 75000 sama bayar parkir 2000"
    });

    const afterCount = await prisma.transaction.count({
      where: {
        userId: user.id
      }
    });

    const drafts = response.transactionDrafts ?? [];
    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("TRANSACTION_DRAFT");
    expect(drafts).toHaveLength(2);
    expect(response.transactionDraft).toEqual(drafts[0]);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("75000");
    expect(drafts[0].categoryId).toBe(refundCategory.id);
    expect(drafts[0].categoryName).toBe("Refund");
    expect(drafts[0].note).toContain("refund");
    expect(drafts[0].note).toContain("shopee");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("2000");
    expect(drafts[1].categoryId).toBe(transportCategory.id);
    expect(drafts[1].categoryName).toBe("Transportasi");
    expect(drafts[1].note).toContain("parkir");

    expect(response.cards.some((card) => card.label === "Jumlah Draft")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Siap Disimpan")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Total Nominal")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Status")).toBe(true);

    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
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

    it("menambahkan consultant action plan pada financial summary berisiko", async () => {
    const user = await createTestUser("consultant-action-risk");

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
          note: "Income consultant note sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "1500000",
          note: "Expense consultant note sensitif",
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
    expect(response.reply).toContain("Prioritas:");
    expect(response.reply).toContain("Alasan:");
    expect(response.reply).toContain("Aksi:");
    expect(response.reply).toContain("Tahan pengeluaran non-prioritas");
    expect(
      response.cards.some(
        (card) => card.label === "Prioritas Aksi" && card.value === "Tahan"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) =>
          card.label === "Langkah Utama" &&
          card.value.includes("Tahan pengeluaran non-prioritas")
      )
    ).toBe(true);
    expect(serializedResponse).not.toContain("Income consultant note sensitif");
    expect(serializedResponse).not.toContain("Expense consultant note sensitif");
  });

  it("mengirim consultant action plan aman ke AI provider untuk saran hemat", async () => {
    const user = await createTestUser("consultant-action-provider");

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
          amount: "3000000",
          note: "Provider consultant income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Provider consultant food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Langkah paling aman sekarang adalah mengurangi kategori Makanan terlebih dahulu dan memasang batas mingguan yang realistis.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "apa yang harus saya lakukan sekarang agar lebih hemat?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(response.reply).toContain("Langkah paling aman");
    expect(
      response.cards.some((card) => card.label === "Prioritas Aksi")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Langkah Utama")
    ).toBe(true);
    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("CONSULTANT ACTION PLAN");
    expect(serializedProviderInput).toContain("Prioritas aksi");
    expect(serializedProviderInput).toContain("Langkah utama");
    expect(serializedProviderInput).toContain("Makanan");
    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain(
      "Provider consultant income note sensitif"
    );
    expect(serializedProviderInput).not.toContain(
      "Provider consultant food note sensitif"
    );
  });

    it("mengirim answer style guideline ke AI provider", async () => {
    const user = await createTestUser("answer-style-guideline");

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
          amount: "3000000",
          note: "Style guideline income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Style guideline food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Prioritas bulan ini adalah mengurangi kategori Makanan. Alasannya, kategori ini menjadi pengeluaran yang paling perlu dikontrol. Aksi praktisnya, buat batas mingguan dan evaluasi lagi setelah beberapa transaksi berikutnya.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "apa yang harus saya lakukan sekarang agar lebih hemat?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain(
      "PRIORITAS - ALASAN - AKSI"
    );
    expect(serializedProviderInput).toContain(
      "Gunakan struktur jawaban: PRIORITAS - ALASAN - AKSI sebagai default"
    );

    expect(serializedProviderInput).toContain("jangan terlalu kaku");

    expect(serializedProviderInput).toContain(
      "Jangan menakut-nakuti user saat status financial health aman"
    );

    expect(serializedProviderInput).toContain(
      "Jika kategori terbesar belum material"
    );

    expect(serializedProviderInput).toContain(
      "1 sampai 3 aksi konkret"
    );
    expect(serializedProviderInput).toContain(
      "Hindari jawaban terlalu panjang"
    );
    expect(serializedProviderInput).toContain(
      "Hindari saran generik"
    );
    expect(serializedProviderInput).toContain("CONSULTANT ACTION PLAN");

    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain(
      "Style guideline income note sensitif"
    );
    expect(serializedProviderInput).not.toContain(
      "Style guideline food note sensitif"
    );
  });

    it("menghasilkan deterministic financial summary dengan pola prioritas alasan aksi", async () => {
    const user = await createTestUser("deterministic-summary-copy");

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
          note: "Summary copy income note sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "1500000",
          note: "Summary copy expense note sensitif",
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
    expect(response.reply).toContain("Status kesehatan keuanganmu");
    expect(response.reply).toContain("Prioritas:");
    expect(response.reply).toContain("Alasan:");
    expect(response.reply).toContain("Aksi:");
    expect(
      response.cards.some((card) => card.label === "Prioritas Aksi")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Langkah Utama")
    ).toBe(true);
    expect(serializedResponse).not.toContain("Summary copy income note sensitif");
    expect(serializedResponse).not.toContain("Summary copy expense note sensitif");
  });

  it("menghasilkan deterministic spending analysis dengan prioritas kategori dan aksi", async () => {
    const user = await createTestUser("deterministic-spending-copy");

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
          amount: "3000000",
          note: "Spending copy income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Spending copy food note sensitif",
          date: getCurrentMonthDate(6)
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
    expect(response.reply).toContain("Prioritas:");
    expect(response.reply).toContain("Alasan:");
    expect(response.reply).toContain("Aksi:");
    expect(response.reply).toContain("Makanan");
    expect(
      response.cards.some((card) => card.label === "Prioritas Aksi")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Langkah Utama")
    ).toBe(true);
    expect(serializedResponse).not.toContain("Spending copy income note sensitif");
    expect(serializedResponse).not.toContain("Spending copy food note sensitif");
  });

    it("menghasilkan dynamic suggestions saat financial summary berisiko", async () => {
    const user = await createTestUser("dynamic-suggestions-risk");

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
          note: "Dynamic suggestion income note sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "1500000",
          note: "Dynamic suggestion expense note sensitif",
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
    expect(response.suggestions).toHaveLength(4);
    expect(response.suggestions).toContain("Saya harus kurangi apa dulu?");
    expect(response.suggestions).toContain("Berapa batas harian yang aman?");
    expect(response.suggestions).toContain("Bandingkan dengan bulan lalu");
    expect(serializedResponse).not.toContain("Dynamic suggestion income note sensitif");
    expect(serializedResponse).not.toContain("Dynamic suggestion expense note sensitif");
  });

  it("menghasilkan dynamic suggestions sesuai kategori spending analysis", async () => {
    const user = await createTestUser("dynamic-suggestions-spending");

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
          amount: "3000000",
          note: "Dynamic spending income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Dynamic spending food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "saya boros di mana bulan ini?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.suggestions).toHaveLength(4);
    expect(response.suggestions).toContain("Kasih saran hemat");
    expect(response.suggestions).toContain("Kenapa Makanan besar?");
    expect(response.suggestions).toContain("Bandingkan bulan ini dan bulan lalu");
    expect(response.suggestions).toContain("Berapa batas harian yang aman?");
    expect(serializedResponse).not.toContain("Dynamic spending income note sensitif");
    expect(serializedResponse).not.toContain("Dynamic spending food note sensitif");
  });

    it("menjawab pertanyaan safe-to-spend dengan sisa aman dan batas harian", async () => {
    const user = await createTestUser("safe-to-spend-response");

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
          amount: "3000000",
          note: "Safe spend income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Safe spend food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "hari ini saya masih aman belanja berapa?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(response.reply).toContain("Status aman pakai");
    expect(response.reply).toContain("Sisa aman bulan ini");
    expect(response.reply).toContain("Batas harian aman");
    expect(response.cards.some((card) => card.label === "Status Aman Pakai")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Sisa Aman Pakai")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Limit Harian Aman")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Ritme Pengeluaran")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Kategori Risiko")).toBe(
      true
    );
    expect(serializedResponse).not.toContain("Safe spend income note sensitif");
    expect(serializedResponse).not.toContain("Safe spend food note sensitif");
  });

  it("mengirim safe-to-spend snapshot aman ke AI provider", async () => {
    const user = await createTestUser("safe-to-spend-provider");

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
          amount: "3000000",
          note: "Safe provider income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Safe provider food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Prioritas: belanja masih perlu dibatasi. Alasan: safe-to-spend menunjukkan masih ada sisa aman, tetapi kategori Makanan menjadi risiko utama. Aksi: ikuti batas harian aman dan hindari transaksi jajan berulang.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "batas harian aman saya berapa?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(response.cards.some((card) => card.label === "Status Aman Pakai")).toBe(
      true
    );
    expect(response.cards.some((card) => card.label === "Sisa Aman Pakai")).toBe(
      true
    );

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("SAFE-TO-SPEND SNAPSHOT");
    expect(serializedProviderInput).toContain("Status safe-to-spend");
    expect(serializedProviderInput).toContain("Sisa aman untuk dipakai bulan ini");
    expect(serializedProviderInput).toContain("Batas harian aman");
    expect(serializedProviderInput).toContain("Aksi safe-to-spend");
    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain("Safe provider income note sensitif");
    expect(serializedProviderInput).not.toContain("Safe provider food note sensitif");
  });

    it("menjawab keputusan pembelian langsung memakai safe-to-spend impact", async () => {
    const user = await createTestUser("purchase-decision-impact");

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

    const shoppingCategory = await createCategory({
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
          note: "Purchase decision income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: shoppingCategory.id,
          type: "EXPENSE",
          amount: "700000",
          note: "Purchase decision expense note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kalau saya beli sepatu 500 ribu sekarang aman nggak?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("GOAL_ANALYSIS");
    expect(response.reply).toContain("Prioritas:");
    expect(response.reply).toContain("Alasan:");
    expect(response.reply).toContain("Aksi:");
    expect(response.reply).toContain("tahan pembelian");

    expect(
      response.cards.some(
        (card) =>
          card.label === "Keputusan Pembelian" && card.value === "Tahan dulu"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) =>
          card.label === "Nominal Pembelian" && card.value.includes("500.000")
      )
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Sisa Setelah Beli")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Status Aman Pakai")
    ).toBe(true);

    expect(serializedResponse).not.toContain("Purchase decision income note sensitif");
    expect(serializedResponse).not.toContain("Purchase decision expense note sensitif");
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
  });

  it("mengirim purchase decision impact ke AI provider", async () => {
    const user = await createTestUser("purchase-decision-provider");

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
          amount: "3000000",
          note: "Purchase provider income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1000000",
          note: "Purchase provider food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Prioritas: pembelian ini boleh dipertimbangkan secara terbatas. Alasan: nominalnya masih di bawah sisa aman, tetapi melebihi limit harian aman. Aksi: tunda sebagian pengeluaran lain atau turunkan nominal pembelian.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "boleh beli jaket 300 ribu hari ini?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).not.toBe("TRANSACTION_DRAFT");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(
      response.cards.some((card) => card.label === "Keputusan Pembelian")
    ).toBe(true);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("PURCHASE DECISION IMPACT");
    expect(serializedProviderInput).toContain("Item pembelian");
    expect(serializedProviderInput).toContain("Nominal pembelian");
    expect(serializedProviderInput).toContain("Keputusan deterministik");
    expect(serializedProviderInput).toContain("Sisa aman setelah pembelian");
    expect(serializedProviderInput).toContain("Aksi pembelian");
    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain("Purchase provider income note sensitif");
    expect(serializedProviderInput).not.toContain("Purchase provider food note sensitif");
  });

    it("menghasilkan reply purchase decision yang lebih natural dan actionable", async () => {
    const user = await createTestUser("purchase-decision-reply-polish");

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

    const shoppingCategory = await createCategory({
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
          note: "Purchase reply income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: shoppingCategory.id,
          type: "EXPENSE",
          amount: "700000",
          note: "Purchase reply expense note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kalau saya beli sepatu 500 ribu sekarang aman nggak?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(["GOAL_ANALYSIS", "SAVING_ADVICE"]).toContain(response.intent);
    expect(response.intent).not.toBe("TRANSACTION_DRAFT");

    expect(response.reply).toContain("Prioritas:");
    expect(response.reply).toContain("Alasan:");
    expect(response.reply).toContain("Aksi:");
    expect(response.reply).toContain("tahan pembelian");
    expect(response.reply).toContain("nominalnya");
    expect(response.reply).toContain("Sisa aman setelah pembelian");
    expect(response.reply).toContain("Limit harian aman");
    expect(response.reply).toContain("Fokus risiko");

    expect(
      response.cards.some((card) => card.label === "Keputusan Pembelian")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Sisa Setelah Beli")
    ).toBe(true);

    expect(serializedResponse).not.toContain("Purchase reply income note sensitif");
    expect(serializedResponse).not.toContain("Purchase reply expense note sensitif");
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
  });

    it("menjawab financial checkup dengan status, fokus, alasan, dan aksi", async () => {
    const user = await createTestUser("financial-checkup-service");

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
          amount: "3000000",
          note: "Checkup service income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Checkup service food note sensitif",
          date: getCurrentMonthDate(7)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "checkup keuangan saya gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(response.reply).toContain("Checkup keuangan");
    expect(response.reply).toContain("Fokus");
    expect(response.reply).toContain("Aksi");

    expect(
      response.cards.some((card) => card.label === "Status Checkup")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Prioritas Checkup")
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Fokus Checkup" && card.value === "Makanan"
      )
    ).toBe(true);
    expect(response.cards.some((card) => card.label === "Cashflow")).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Rasio Expense")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Sisa Aman")
    ).toBe(true);

    expect(serializedResponse).not.toContain("Checkup service income note sensitif");
    expect(serializedResponse).not.toContain("Checkup service food note sensitif");
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
  });

  it("mengirim financial checkup snapshot aman ke AI provider", async () => {
    const user = await createTestUser("financial-checkup-provider");

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
          amount: "3000000",
          note: "Checkup provider income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "Checkup provider food note sensitif",
          date: getCurrentMonthDate(7)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Prioritas: kurangi kategori Makanan dulu. Alasan: checkup keuangan menunjukkan status waspada karena Makanan menjadi fokus pengeluaran. Aksi: batasi pengeluaran harian dan pantau kategori Makanan sampai akhir bulan.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "keuangan saya aman atau berisiko?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(generateText).toHaveBeenCalledTimes(1);
    expect(
      response.cards.some((card) => card.label === "Status Checkup")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Fokus Checkup")
    ).toBe(true);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("FINANCIAL CHECKUP SNAPSHOT");
    expect(serializedProviderInput).toContain("Status checkup");
    expect(serializedProviderInput).toContain("Prioritas checkup");
    expect(serializedProviderInput).toContain("Fokus kategori");
    expect(serializedProviderInput).toContain("Alasan checkup");
    expect(serializedProviderInput).toContain("Aksi checkup");
    expect(serializedProviderInput).toContain("Warning checkup");

    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain(
      "Checkup provider income note sensitif"
    );
    expect(serializedProviderInput).not.toContain(
      "Checkup provider food note sensitif"
    );
  });

  it("tidak over-warning saat kategori dominan tetapi expense masih kecil", async () => {
  const user = await createTestUser("low-expense-dominant-category");

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
        amount: "350000",
        note: "Income kecil sensitif",
        date: getCurrentMonthDate(1)
      },
      {
        userId: user.id,
        categoryId: foodCategory.id,
        type: "EXPENSE",
        amount: "10000",
        note: "Makanan kecil sensitif",
        date: getCurrentMonthDate(5)
      }
    ]
  });

  const response = await getAiChatResponse({
    userId: user.id,
    message: "saya boros di mana bulan ini?"
  });

  const serializedResponse = JSON.stringify(response);

  expect(response.intent).toBe("SPENDING_ANALYSIS");
  expect(
    response.cards.some(
      (card) => card.label === "Pola Pengeluaran" && card.value === "Terkendali"
    )
  ).toBe(true);
  expect(
    response.cards.some(
      (card) => card.label === "Prioritas Kontrol" && card.value === "Makanan"
    )
  ).toBe(true);
  expect(serializedResponse).toContain("Makanan");
  expect(serializedResponse).toContain("belum terlihat sebagai risiko besar");
  expect(serializedResponse).not.toContain("Makanan kecil sensitif");
  expect(serializedResponse).not.toContain("Income kecil sensitif");
});
});