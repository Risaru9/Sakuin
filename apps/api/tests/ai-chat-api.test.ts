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
    expect(serializedProviderInput).toContain("SPENDING PATTERN INSIGHT");
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

  it("mengembalikan spending pattern cards dan prioritas kontrol", async () => {
    const user = await createTestUser("spending-pattern-cards");

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
          amount: "4000000",
          note: "Gaji utama tidak boleh bocor",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "300000",
          note: "Makan pagi sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "250000",
          note: "Makan siang sensitif",
          date: getCurrentMonthDate(5)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "250000",
          note: "Makan malam sensitif",
          date: getCurrentMonthDate(8)
        },
        {
          userId: user.id,
          categoryId: transportCategory.id,
          type: "EXPENSE",
          amount: "200000",
          note: "Transport sensitif",
          date: getCurrentMonthDate(9)
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
      response.cards.some((card) => card.label === "Pola Pengeluaran")
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Prioritas Kontrol" && card.value === "Makanan"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Frekuensi" && card.value === "3 transaksi"
      )
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Nominal Prioritas")
    ).toBe(true);
    expect(serializedResponse).toContain("Makanan");
    expect(serializedResponse).not.toContain("Gaji utama tidak boleh bocor");
    expect(serializedResponse).not.toContain("Makan pagi sensitif");
    expect(serializedResponse).not.toContain("Makan siang sensitif");
    expect(serializedResponse).not.toContain("Makan malam sensitif");
    expect(serializedResponse).not.toContain("Transport sensitif");
  });

  it("menandai spending pattern perlu dikontrol saat satu kategori dominan", async () => {
    const user = await createTestUser("spending-pattern-control");

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

    const otherCategory = await createCategory({
      userId: user.id,
      name: "Lainnya",
      type: "EXPENSE"
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: user.id,
          categoryId: incomeCategory.id,
          type: "INCOME",
          amount: "3000000",
          note: "Income sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "700000",
          note: "Kategori dominan sensitif 1",
          date: getCurrentMonthDate(4)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "500000",
          note: "Kategori dominan sensitif 2",
          date: getCurrentMonthDate(7)
        },
        {
          userId: user.id,
          categoryId: otherCategory.id,
          type: "EXPENSE",
          amount: "300000",
          note: "Kategori lain sensitif",
          date: getCurrentMonthDate(9)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "kategori mana yang harus saya kurangi?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(
      response.cards.some(
        (card) =>
          card.label === "Pola Pengeluaran" && card.value === "Perlu dikontrol"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Prioritas Kontrol" && card.value === "Makanan"
      )
    ).toBe(true);
    expect(response.reply).toContain("Makanan");
    expect(serializedResponse).not.toContain("Income sensitif");
    expect(serializedResponse).not.toContain("Kategori dominan sensitif 1");
    expect(serializedResponse).not.toContain("Kategori dominan sensitif 2");
    expect(serializedResponse).not.toContain("Kategori lain sensitif");
  });

  it("menandai spending pattern meningkat tajam saat kategori terbesar naik besar", async () => {
    const user = await createTestUser("spending-pattern-increase");

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
          amount: "5000000",
          note: "Gaji bulan ini sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1000000",
          note: "Makanan bulan ini sensitif",
          date: getCurrentMonthDate(5)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Makanan bulan lalu sensitif",
          date: getPreviousMonthDate(5)
        }
      ]
    });

    const response = await getAiChatResponse({
      userId: user.id,
      message: "pengeluaran saya naik karena apa?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(
      response.cards.some(
        (card) =>
          card.label === "Pola Pengeluaran" && card.value === "Meningkat tajam"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Prioritas Kontrol" && card.value === "Makanan"
      )
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Tren Kategori" && card.value === "+900%"
      )
    ).toBe(true);
    expect(response.reply).toContain("Makanan");
    expect(serializedResponse).not.toContain("Gaji bulan ini sensitif");
    expect(serializedResponse).not.toContain("Makanan bulan ini sensitif");
    expect(serializedResponse).not.toContain("Makanan bulan lalu sensitif");
  });

  it("mengirim spending pattern insight aman ke AI provider", async () => {
    const user = await createTestUser("spending-pattern-provider");

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
          note: "Provider income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "900000",
          note: "Provider food note sensitif",
          date: getCurrentMonthDate(6)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "100000",
          note: "Provider previous food note sensitif",
          date: getPreviousMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Kategori yang paling perlu dikontrol adalah Makanan karena porsinya paling besar dan naik dibanding bulan lalu.",
      model: "mock-default-model"
    });

    const response = await getAiChatResponse(
      {
        userId: user.id,
        message: "apa pengeluaran yang paling perlu dikontrol?"
      },
      {
        provider: {
          generateText
        }
      }
    );

    expect(response.intent).toBe("SAVING_ADVICE");
    expect(response.reply).toContain("Makanan");
    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("SPENDING PATTERN INSIGHT");
    expect(serializedProviderInput).toContain("Kategori prioritas kontrol");
    expect(serializedProviderInput).toContain("Makanan");
    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain("Provider income note sensitif");
    expect(serializedProviderInput).not.toContain("Provider food note sensitif");
    expect(serializedProviderInput).not.toContain(
      "Provider previous food note sensitif"
    );
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
    expect(
      response.cards.some((card) => card.label === "Pola Pengeluaran")
    ).toBe(true);
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

    it("mengembalikan mixed transactionDrafts dari AI chat API contract tanpa auto-save", async () => {
    const user = await createTestUser("mixed-draft-api-contract");

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

  it("mengembalikan mixed transfer keluarga dan bensin dari AI chat API contract", async () => {
    const user = await createTestUser("mixed-transfer-fuel-api-contract");

    const giftCategory = await createCategory({
      userId: user.id,
      name: "Hadiah",
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
      message: "transfer dari kakak 150k terus bensin 30k"
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
    expect(drafts[0].amount).toBe("150000");
    expect(drafts[0].categoryId).toBe(giftCategory.id);
    expect(drafts[0].categoryName).toBe("Hadiah");
    expect(drafts[0].note).toContain("kakak");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("30000");
    expect(["Transportasi", "Bensin"]).toContain(drafts[1].categoryName);
    expect(drafts[1].categoryId).toBeTruthy();
    expect(drafts[1].note).toContain("bensin");

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

    it("mengembalikan consultant action plan pada API contract financial summary berisiko", async () => {
    const user = await createTestUser("api-consultant-action-risk");

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
          note: "API income consultant note sensitif",
          date: getCurrentMonthDate(2)
        },
        {
          userId: user.id,
          categoryId: expenseCategory.id,
          type: "EXPENSE",
          amount: "1500000",
          note: "API expense consultant note sensitif",
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

    expect(
      response.cards.some(
        (card) => card.label === "Fokus Kategori" && card.value === "Belanja"
      )
    ).toBe(true);

    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
    expect(serializedResponse).not.toContain("API income consultant note sensitif");
    expect(serializedResponse).not.toContain("API expense consultant note sensitif");
  });

  it("mengirim consultant action plan aman ke AI provider dari API contract", async () => {
    const user = await createTestUser("api-consultant-action-provider");

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
          note: "API provider consultant income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "API provider consultant food note sensitif",
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

    expect(
      response.cards.some(
        (card) => card.label === "Fokus Kategori" && card.value === "Makanan"
      )
    ).toBe(true);

    expect(generateText).toHaveBeenCalledTimes(1);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("CONSULTANT ACTION PLAN");
    expect(serializedProviderInput).toContain("Prioritas aksi");
    expect(serializedProviderInput).toContain("Langkah utama");
    expect(serializedProviderInput).toContain("Guardrail");
    expect(serializedProviderInput).toContain("Makanan");

    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain(
      "API provider consultant income note sensitif"
    );
    expect(serializedProviderInput).not.toContain(
      "API provider consultant food note sensitif"
    );
  });

    it("mengembalikan safe-to-spend cards dari AI chat API contract", async () => {
    const user = await createTestUser("api-safe-to-spend-response");

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
          note: "API safe spend income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "API safe spend food note sensitif",
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

    expect(
      response.cards.some((card) => card.label === "Status Aman Pakai")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Sisa Aman Pakai")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Limit Harian Aman")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Ritme Pengeluaran")
    ).toBe(true);
    expect(
      response.cards.some(
        (card) => card.label === "Kategori Risiko" && card.value === "Makanan"
      )
    ).toBe(true);

    expect(response.suggestions.length).toBeLessThanOrEqual(4);
    expect(serializedResponse).not.toContain(user.id);
    expect(serializedResponse).not.toContain(user.email);
    expect(serializedResponse).not.toContain("API safe spend income note sensitif");
    expect(serializedResponse).not.toContain("API safe spend food note sensitif");
  });

  it("mengirim safe-to-spend snapshot aman ke AI provider dari API contract", async () => {
    const user = await createTestUser("api-safe-to-spend-provider");

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
          note: "API safe provider income note sensitif",
          date: getCurrentMonthDate(1)
        },
        {
          userId: user.id,
          categoryId: foodCategory.id,
          type: "EXPENSE",
          amount: "1200000",
          note: "API safe provider food note sensitif",
          date: getCurrentMonthDate(6)
        }
      ]
    });

    const generateText = vi.fn().mockResolvedValue({
      text: "Prioritas: batasi belanja hari ini mengikuti limit harian aman. Alasan: safe-to-spend masih memiliki sisa aman, tetapi kategori Makanan menjadi risiko utama. Aksi: gunakan batas harian sebagai patokan dan hindari jajan berulang.",
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

    expect(
      response.cards.some((card) => card.label === "Status Aman Pakai")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Sisa Aman Pakai")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Limit Harian Aman")
    ).toBe(true);
    expect(
      response.cards.some((card) => card.label === "Ritme Pengeluaran")
    ).toBe(true);

    const providerInput = generateText.mock.calls[0]?.[0];
    const serializedProviderInput = JSON.stringify(providerInput);

    expect(serializedProviderInput).toContain("SAFE-TO-SPEND SNAPSHOT");
    expect(serializedProviderInput).toContain("Status safe-to-spend");
    expect(serializedProviderInput).toContain("Status ritme pengeluaran");
    expect(serializedProviderInput).toContain("Sisa aman untuk dipakai bulan ini");
    expect(serializedProviderInput).toContain("Batas harian aman");
    expect(serializedProviderInput).toContain("Aksi safe-to-spend");
    expect(serializedProviderInput).toContain("Kategori risiko utama");

    expect(serializedProviderInput).not.toContain(user.id);
    expect(serializedProviderInput).not.toContain(user.email);
    expect(serializedProviderInput).not.toContain(
      "API safe provider income note sensitif"
    );
    expect(serializedProviderInput).not.toContain(
      "API safe provider food note sensitif"
    );
  });
});