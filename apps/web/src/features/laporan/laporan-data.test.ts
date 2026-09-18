import type { Category } from "../categories/category.types";
import type { SummaryCategoryItem } from "../summary/summary.types";
import {
  buildBudgets,
  buildShares,
  compareWithPreviousMonth,
  describeBudget,
  getBudgetStatus,
  OTHER_SHARE_COLOR,
  previousMonthKey,
  SHARE_COLORS
} from "./laporan-data";

function item(categoryId: string, categoryName: string, totalAmount: number, categoryIcon: string | null = null): SummaryCategoryItem {
  return {
    categoryId,
    categoryName,
    categoryIcon,
    categoryColor: null,
    type: "EXPENSE",
    totalAmount: totalAmount.toFixed(2),
    transactionCount: 1,
    limit: null
  };
}

function category(id: string, name: string, limit: number | null, type: Category["type"] = "EXPENSE"): Category {
  return { id, name, type, icon: null, color: null, isDefault: true, limit };
}

const trend = [
  { month: "2026-08", income: "3200000.00", expense: "2567500.00", balance: "0.00" },
  { month: "2026-09", income: "3500000.00", expense: "2259500.00", balance: "0.00" }
];

describe("buildShares", () => {
  it("colours the three biggest categories and folds the rest into Lainnya", () => {
    const shares = buildShares([
      item("tagihan", "Tagihan", 520000, "receipt"),
      item("makan", "Makanan", 980000, "utensils"),
      item("transport", "Transportasi", 450000, "car"),
      item("belanja", "Belanja", 209500, "shopping-bag"),
      item("sehat", "Kesehatan", 100000, "heart-pulse"),
      item("kosong", "Pendidikan", 0, "book-open")
    ]);

    expect(shares.map((share) => share.name)).toEqual(["Makanan", "Tagihan", "Transportasi", "Lainnya"]);
    expect(shares.map((share) => share.color)).toEqual([
      SHARE_COLORS[1],
      SHARE_COLORS[2],
      SHARE_COLORS[0],
      OTHER_SHARE_COLOR
    ]);
    expect(shares[3]).toMatchObject({ amount: 309500, categoryCount: 2 });
    expect(shares.reduce((sum, share) => sum + share.percent, 0)).toBe(100);
    expect(shares[0].percent).toBe(43);
  });

  it("names a single folded category and gives clashing colours the next free slot", () => {
    const shares = buildShares([
      item("a", "Makanan", 400, "utensils"),
      item("b", "Kopi", 300, "coffee"),
      item("c", "Bensin", 200, "car"),
      item("d", "Pulsa", 100, "smartphone")
    ]);

    expect(shares.map((share) => [share.name, share.color])).toEqual([
      ["Makanan", SHARE_COLORS[1]],
      ["Kopi", SHARE_COLORS[0]],
      ["Bensin", SHARE_COLORS[2]],
      ["Pulsa", OTHER_SHARE_COLOR]
    ]);
  });

  it("returns nothing for an empty month", () => {
    expect(buildShares([item("a", "Makanan", 0)])).toEqual([]);
  });
});

describe("compareWithPreviousMonth", () => {
  it("describes spending against last month, hedged for the running month", () => {
    expect(
      compareWithPreviousMonth({ kind: "EXPENSE", current: 2259500, monthKey: "2026-09", currentMonthKey: "2026-09", trend })
    ).toEqual({ tone: "good", direction: "down", text: "Sejauh ini 12% lebih hemat dari Agustus" });

    expect(
      compareWithPreviousMonth({ kind: "EXPENSE", current: 2900000, monthKey: "2026-09", currentMonthKey: "2026-10", trend })
    ).toEqual({ tone: "bad", direction: "up", text: "13% lebih boros dari Agustus" });
  });

  it("describes income as an amount", () => {
    expect(
      compareWithPreviousMonth({ kind: "INCOME", current: 3500000, monthKey: "2026-09", currentMonthKey: "2026-10", trend })
    ).toEqual({ tone: "good", direction: "up", text: "300.000 lebih banyak dari Agustus" });
  });

  it("stays quiet without a usable previous month", () => {
    expect(
      compareWithPreviousMonth({ kind: "EXPENSE", current: 100, monthKey: "2026-08", currentMonthKey: "2026-09", trend })
    ).toBeNull();
    expect(previousMonthKey("2026-01")).toBe("2025-12");
  });
});

describe("budgets", () => {
  it("rates spending against the limit", () => {
    expect(getBudgetStatus(700_000, 1_000_000)).toBe("ok");
    expect(getBudgetStatus(800_000, 1_000_000)).toBe("watch");
    expect(getBudgetStatus(1_050_000, 1_000_000)).toBe("over");

    expect(describeBudget(520_000, 800_000)).toBe("Sisa 280.000");
    expect(describeBudget(980_000, 1_200_000)).toBe("Hampir batas · sisa 220.000");
    expect(describeBudget(450_000, 400_000)).toBe("Lewat batas 50.000");
    expect(describeBudget(400_000, 400_000)).toBe("Pas di batas");
  });

  it("lists limited expense categories, most urgent first, including unused ones", () => {
    const rows = buildBudgets(
      [
        category("makan", "Makanan", 1_200_000),
        category("tagihan", "Tagihan", 800_000),
        category("transport", "Transportasi", 400_000),
        category("belanja", "Belanja", null),
        category("gaji", "Gaji", 5_000_000, "INCOME"),
        category("buku", "Pendidikan", 200_000)
      ],
      [item("makan", "Makanan", 980_000), item("tagihan", "Tagihan", 520_000), item("transport", "Transportasi", 450_000)]
    );

    expect(rows.map((row) => [row.category.name, row.status, row.percent])).toEqual([
      ["Transportasi", "over", 100],
      ["Makanan", "watch", 82],
      ["Tagihan", "ok", 65],
      ["Pendidikan", "ok", 0]
    ]);
  });
});
