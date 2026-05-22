import { randomUUID } from "crypto";
import { afterEach, describe, expect, it } from "vitest";
import { prisma } from "../src/db/prisma.js";
import {
  buildRuleBasedTransactionDraft,
  buildRuleBasedTransactionDrafts
} from "../src/modules/ai/ai-transaction-draft.js";

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
  it("membuat beberapa draft dari satu prompt multi transaksi", async () => {
  const user = await createTestUser("multi-expense");

  await createCategory({
    userId: user.id,
    name: "Makanan",
    type: "EXPENSE"
  });

  await createCategory({
    userId: user.id,
    name: "Minuman",
    type: "EXPENSE"
  });

  const drafts = await buildRuleBasedTransactionDrafts({
    userId: user.id,
    message: "catat makan 12000 minum 4000 cimol 4000 cireng 5000"
  });

  expect(drafts).toHaveLength(4);

  expect(drafts[0].amount).toBe("12000");
  expect(drafts[0].categoryName).toBe("Makanan");
  expect(drafts[0].note).toContain("makan");

  expect(drafts[1].amount).toBe("4000");
  expect(drafts[1].categoryName).toBe("Minuman");
  expect(drafts[1].note).toContain("minum");

  expect(drafts[2].amount).toBe("4000");
  expect(drafts[2].categoryName).toBe("Makanan");
  expect(drafts[2].note).toContain("cimol");

  expect(drafts[3].amount).toBe("5000");
  expect(drafts[3].categoryName).toBe("Makanan");
  expect(drafts[3].note).toContain("cireng");

  for (const draft of drafts) {
    expect(draft.type).toBe("EXPENSE");
    expect(draft.missingFields).toEqual([]);
  }
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

    it("menurunkan confidence dan memberi warning untuk input tipe ambigu", async () => {
    const user = await createTestUser("ambiguous-type");

    await createCategory({
      userId: user.id,
      name: "Lainnya",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "transfer 100 ribu"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("100000");
    expect(draft.categoryName).toBe("Lainnya");
    expect(draft.confidence).toBe("low");
    expect(draft.warnings.join(" ")).toContain("ambigu");
  });

    it("tidak asal memilih kategori spesifik jika tidak cocok dengan yakin", async () => {
    const user = await createTestUser("no-random-category");

    await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "bayar sesuatu 100000"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("100000");
    expect(draft.categoryId).toBeNull();
    expect(draft.categoryName).toBeNull();
    expect(draft.missingFields).toContain("categoryId");
    expect(draft.confidence).toBe("low");
  });

    it("membuat multi draft natural untuk jajan dan minuman", async () => {
    const user = await createTestUser("multi-natural-food-drink");

    await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    await createCategory({
      userId: user.id,
      name: "Minuman",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "jajan cilok 5rb, es teh 4rb, gorengan 6rb"
    });

    expect(drafts).toHaveLength(3);

    expect(drafts[0].type).toBe("EXPENSE");
    expect(drafts[0].amount).toBe("5000");
    expect(drafts[0].categoryName).toBe("Makanan");
    expect(drafts[0].note).toContain("cilok");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("4000");
    expect(drafts[1].categoryName).toBe("Minuman");
    expect(drafts[1].note).toContain("es teh");

    expect(drafts[2].type).toBe("EXPENSE");
    expect(drafts[2].amount).toBe("6000");
    expect(drafts[2].categoryName).toBe("Makanan");
    expect(drafts[2].note).toContain("gorengan");
  });

  it("membuat multi draft natural untuk kopi dan parkir", async () => {
    const user = await createTestUser("multi-natural-coffee-parking");

    await createCategory({
      userId: user.id,
      name: "Kopi",
      type: "EXPENSE"
    });

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "habis beli kopi 18 ribu sama parkir 2 ribu"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("EXPENSE");
    expect(drafts[0].amount).toBe("18000");
    expect(drafts[0].categoryName).toBe("Kopi");
    expect(drafts[0].note).toContain("kopi");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("2000");
    expect(drafts[1].categoryName).toBe("Transportasi");
    expect(drafts[1].note).toContain("parkir");
  });

    it("memakai kategori custom kos untuk bayar kos", async () => {
    const user = await createTestUser("custom-kos");

    const kosCategory = await createCategory({
      userId: user.id,
      name: "Kos",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "bayar kos 750 ribu tanggal 1"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("750000");
    expect(draft.categoryId).toBe(kosCategory.id);
    expect(draft.categoryName).toBe("Kos");
    expect(draft.missingFields).toEqual([]);
  });

  it("mendeteksi transport dan tagihan dengan kategori yang tepat", async () => {
    const user = await createTestUser("expense-category-precision");

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    await createCategory({
      userId: user.id,
      name: "Tagihan",
      type: "EXPENSE"
    });

    const parkingDraft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "parkir 2000"
    });

    const electricityDraft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "token listrik 100 ribu"
    });

    expect(parkingDraft.type).toBe("EXPENSE");
    expect(parkingDraft.amount).toBe("2000");
    expect(parkingDraft.categoryName).toBe("Transportasi");

    expect(electricityDraft.type).toBe("EXPENSE");
    expect(electricityDraft.amount).toBe("100000");
    expect(electricityDraft.categoryName).toBe("Tagihan");
  });

  it("membuat multi draft natural untuk makan dan bensin kemarin", async () => {
    const user = await createTestUser("multi-natural-yesterday");

    await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "kemarin makan 20k terus bensin 30k"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("EXPENSE");
    expect(drafts[0].amount).toBe("20000");
    expect(drafts[0].categoryName).toBe("Makanan");
    expect(drafts[0].note).toContain("makan");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("30000");
    expect(["Transportasi", "Bensin"]).toContain(drafts[1].categoryName);
    expect(drafts[1].note).toContain("bensin");

    for (const draft of drafts) {
      expect(draft.date).not.toBe("");
      expect(draft.missingFields).toEqual([]);
    }
  });

    it("membuat mixed draft untuk pemasukan dan pengeluaran dalam satu prompt", async () => {
    const user = await createTestUser("mixed-income-expense");

    await createCategory({
      userId: user.id,
      name: "Hadiah",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Makanan",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "dikasih ibu 100 ribu terus makan 15000"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("100000");
    expect(drafts[0].categoryName).toBe("Hadiah");
    expect(drafts[0].note).toContain("ibu");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("15000");
    expect(drafts[1].categoryName).toBe("Makanan");
    expect(drafts[1].note).toContain("makan");
  });

  it("membuat mixed draft untuk gaji freelance dan beli kopi", async () => {
    const user = await createTestUser("mixed-freelance-coffee");

    await createCategory({
      userId: user.id,
      name: "Freelance",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Kopi",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "gaji freelance 1 juta, beli kopi 18000"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("1000000");
    expect(drafts[0].categoryName).toBe("Freelance");
    expect(drafts[0].note).toContain("freelance");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("18000");
    expect(drafts[1].categoryName).toBe("Kopi");
    expect(drafts[1].note).toContain("kopi");
  });

    it("membuat mixed draft untuk refund dan parkir", async () => {
    const user = await createTestUser("mixed-refund-parking");

    await createCategory({
      userId: user.id,
      name: "Refund",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "refund shopee 75000 sama bayar parkir 2000"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("75000");
    expect(drafts[0].categoryName).toBe("Refund");
    expect(drafts[0].note).toContain("refund");
    expect(drafts[0].note).toContain("shopee");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("2000");
    expect(drafts[1].categoryName).toBe("Transportasi");
    expect(drafts[1].note).toContain("parkir");
  });

  it("membuat mixed draft untuk transfer keluarga dan bensin", async () => {
    const user = await createTestUser("mixed-transfer-fuel");

    await createCategory({
      userId: user.id,
      name: "Hadiah",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "transfer dari kakak 150k terus bensin 30k"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("150000");
    expect(drafts[0].categoryName).toBe("Hadiah");
    expect(drafts[0].note).toContain("kakak");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("30000");
    expect(["Transportasi", "Bensin"]).toContain(drafts[1].categoryName);
    expect(drafts[1].note).toContain("bensin");
  });

  it("membuat pure income multi draft jika connector jelas", async () => {
    const user = await createTestUser("multi-income-clear-connector");

    await createCategory({
      userId: user.id,
      name: "Gaji",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Bonus",
      type: "INCOME"
    });

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "gaji 4 juta, bonus 500 ribu"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("4000000");
    expect(drafts[0].categoryName).toBe("Gaji");
    expect(drafts[0].note).toContain("gaji");

    expect(drafts[1].type).toBe("INCOME");
    expect(drafts[1].amount).toBe("500000");
    expect(drafts[1].categoryName).toBe("Bonus");
    expect(drafts[1].note).toContain("bonus");
  });

  it("menerapkan konteks tanggal global pada mixed multi draft", async () => {
    const user = await createTestUser("mixed-global-date");

    await createCategory({
      userId: user.id,
      name: "Hadiah",
      type: "INCOME"
    });

    await createCategory({
      userId: user.id,
      name: "Transportasi",
      type: "EXPENSE"
    });

    const today = new Date().toISOString().slice(0, 10);

    const drafts = await buildRuleBasedTransactionDrafts({
      userId: user.id,
      message: "kemarin transfer dari kakak 150k terus bensin 30k"
    });

    expect(drafts).toHaveLength(2);

    expect(drafts[0].type).toBe("INCOME");
    expect(drafts[0].amount).toBe("150000");
    expect(drafts[0].categoryName).toBe("Hadiah");

    expect(drafts[1].type).toBe("EXPENSE");
    expect(drafts[1].amount).toBe("30000");
    expect(["Transportasi", "Bensin"]).toContain(drafts[1].categoryName);

    expect(drafts[0].date).not.toBe(today);
    expect(drafts[1].date).not.toBe(today);
    expect(drafts[0].date).toBe(drafts[1].date);
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

    it("memprioritaskan custom category user dibanding kategori umum jika cocok jelas", async () => {
    const user = await createTestUser("custom-category-priority");

    const customCoffeeCategory = await createCategory({
      userId: user.id,
      name: "Kopi",
      type: "EXPENSE"
    });

    await createCategory({
      userId: user.id,
      name: "Minuman",
      type: "EXPENSE"
    });

    const draft = await buildRuleBasedTransactionDraft({
      userId: user.id,
      message: "beli kopi kenangan 18000"
    });

    expect(draft.type).toBe("EXPENSE");
    expect(draft.amount).toBe("18000");
    expect(draft.categoryId).toBe(customCoffeeCategory.id);
    expect(draft.categoryName).toBe("Kopi");
    expect(draft.note).toContain("kenangan");
    expect(draft.missingFields).toEqual([]);
  });
});