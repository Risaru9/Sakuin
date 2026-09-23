import type { SafeToSpendData } from "../summary/summary.types";
import type { Transaction } from "../transactions/transaction.types";
import {
  buildMonthView,
  describeSafeToSpend,
  formatCompactAmount,
  formatDayLabel,
  formatMonthLabel,
  getMonthListParams,
  offlineEntryToTransaction,
  parseMonthKey,
  searchMonthView
} from "./beranda-data";

function localIso(year: number, month: number, day: number, hour = 0) {
  return new Date(year, month - 1, day, hour).toISOString();
}

function tx(overrides: Partial<Transaction> & Pick<Transaction, "id">): Transaction {
  return {
    type: "EXPENSE",
    amount: "10000.00",
    note: null,
    date: localIso(2026, 9, 16),
    categoryId: "cat-food",
    category: { id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null },
    createdAt: localIso(2026, 9, 16, 8),
    updatedAt: localIso(2026, 9, 16, 8),
    ...overrides
  };
}

describe("month helpers", () => {
  it("accepts only valid month keys", () => {
    expect(parseMonthKey("2026-08", "2026-09")).toBe("2026-08");
    expect(parseMonthKey("2026-13", "2026-09")).toBe("2026-09");
    expect(parseMonthKey("agustus", "2026-09")).toBe("2026-09");
    expect(parseMonthKey(null, "2026-09")).toBe("2026-09");
  });

  it("labels months in Indonesian", () => {
    expect(formatMonthLabel("2026-09")).toBe("September 2026");
    expect(formatMonthLabel("2027-01")).toBe("Januari 2027");
  });

  it("asks the API for the whole local month", () => {
    const params = getMonthListParams("2026-02");

    expect(new Date(params.startDate).getTime()).toBe(new Date(2026, 1, 1).getTime());
    expect(new Date(params.endDate).getTime()).toBe(new Date(2026, 1, 28, 23, 59, 59, 999).getTime());
    expect(params).toMatchObject({ page: 1, limit: 100, sort: "date_desc" });
  });

  it("names today, yesterday and older days", () => {
    expect(formatDayLabel("2026-09-16", "2026-09-16")).toBe("Hari ini");
    expect(formatDayLabel("2026-09-15", "2026-09-16")).toBe("Kemarin");
    expect(formatDayLabel("2026-09-14", "2026-09-16")).toBe("Senin, 14 Sep");
    expect(formatDayLabel("2026-08-31", "2026-09-01")).toBe("Kemarin");
  });
});

describe("buildMonthView", () => {
  it("groups the month by day, newest first, with day and month totals", () => {
    const view = buildMonthView({
      items: [
        tx({
          id: "older",
          date: localIso(2026, 9, 14),
          amount: "200000.00",
          createdAt: localIso(2026, 9, 14, 7)
        }),
        tx({ id: "coffee", note: "Kopi", amount: "18000.00", createdAt: localIso(2026, 9, 16, 9) }),
        tx({ id: "fuel", note: "Bensin", amount: "30000.00", createdAt: localIso(2026, 9, 16, 7) }),
        tx({
          id: "gift",
          type: "INCOME",
          amount: "100000.00",
          date: localIso(2026, 9, 14),
          createdAt: localIso(2026, 9, 14, 20)
        }),
        tx({ id: "august", date: localIso(2026, 8, 31) })
      ],
      pending: [],
      monthKey: "2026-09",
      todayKey: "2026-09-16"
    });

    expect(view.groups.map((group) => group.label)).toEqual(["Hari ini", "Senin, 14 Sep"]);
    expect(view.groups[0].items.map((item) => item.id)).toEqual(["coffee", "fuel"]);
    expect(view.groups[0]).toMatchObject({ expense: 48000, income: 0 });
    expect(view.groups[1].items.map((item) => item.id)).toEqual(["gift", "older"]);
    expect(view.totals).toEqual({ expense: 248000, income: 100000, balance: -148000 });
    expect(view.count).toBe(4);
  });

  it("shows queued offline entries and drops cached ones that already synced", () => {
    const queued = tx({ id: "offline-1", note: "Parkir" });
    const view = buildMonthView({
      items: [
        tx({ id: "offline-1", category: { id: "cat-food", name: "Transaksi Offline", type: "EXPENSE", icon: null, color: null } }),
        tx({ id: "offline-synced" }),
        tx({ id: "server-1" })
      ],
      pending: [queued],
      monthKey: "2026-09",
      todayKey: "2026-09-16"
    });

    const ids = view.groups.flatMap((group) => group.items.map((item) => item.id));
    expect(ids.sort()).toEqual(["offline-1", "server-1"]);
    expect(view.groups[0].items.find((item) => item.id === "offline-1")?.note).toBe("Parkir");
  });

  it("finds entries by note or category name, type and category", () => {
    const view = buildMonthView({
      items: [
        tx({ id: "a", note: "Kopi susu" }),
        tx({
          id: "b",
          note: "Bensin",
          categoryId: "cat-car",
          category: { id: "cat-car", name: "Transportasi", type: "EXPENSE", icon: "car", color: null }
        }),
        tx({ id: "c", type: "INCOME", note: "Kopi dari teman" })
      ],
      pending: [],
      monthKey: "2026-09",
      todayKey: "2026-09-16"
    });

    const ids = (query: string, type: "ALL" | "INCOME" | "EXPENSE" = "ALL", categoryId: string | null = null) =>
      searchMonthView(view, { query, type, categoryId }).map((item) => item.id).sort();

    expect(ids("KOPI")).toEqual(["a", "c"]);
    expect(ids("kopi", "EXPENSE")).toEqual(["a"]);
    expect(ids("transport")).toEqual(["b"]);
    expect(ids("", "ALL", "cat-car")).toEqual(["b"]);
    expect(ids("martabak")).toEqual([]);
  });
});

describe("offlineEntryToTransaction", () => {
  it("uses the real category of a queued entry", () => {
    const transaction = offlineEntryToTransaction(
      {
        offlineId: "offline-9",
        queuedAt: "2026-09-16T01:00:00.000Z",
        ownerScope: "user-1",
        type: "EXPENSE",
        amount: "18000",
        categoryId: "cat-food",
        date: localIso(2026, 9, 16),
        note: "Kopi"
      },
      [{ id: "cat-food", name: "Makanan", type: "EXPENSE", icon: "utensils", color: null, isDefault: true, limit: null }],
    );

    expect(transaction).toMatchObject({
      id: "offline-9",
      note: "Kopi",
      category: { name: "Makanan", icon: "utensils" },
    });
  });
});

describe("header helpers", () => {
  const baseSafeToSpend = {
    spendingPaceStatus: "ON_TRACK",
    netCashflow: 0,
    safeBalanceLimit: 0,
    availableToSpend: 0,
    remainingDays: 10,
    expenseToIncomeRatio: null,
    monthProgressPercent: 50,
    expensePacePercent: null,
    projectedMonthEndExpense: 0,
    projectedNetCashflow: 0,
    topRiskCategoryName: null,
    topRiskCategoryAmount: 0,
    reason: "",
    action: "",
    warnings: []
  } satisfies Omit<SafeToSpendData, "status" | "suggestedDailyLimit">;

  it("summarises the spending status for the pill", () => {
    expect(describeSafeToSpend({ ...baseSafeToSpend, status: "SAFE", suggestedDailyLimit: 82_400 })).toEqual({
      tone: "safe",
      text: "Masih aman · ±82 rb/hari"
    });
    expect(describeSafeToSpend({ ...baseSafeToSpend, status: "WATCH", suggestedDailyLimit: 0 })).toEqual({
      tone: "watch",
      text: "Mulai hati-hati"
    });
    expect(describeSafeToSpend({ ...baseSafeToSpend, status: "HOLD", suggestedDailyLimit: null })).toEqual({
      tone: "hold",
      text: "Rem dulu, ya"
    });
    expect(describeSafeToSpend({ ...baseSafeToSpend, status: "UNKNOWN", suggestedDailyLimit: null })).toBeNull();
    expect(describeSafeToSpend(undefined)).toBeNull();
  });

  it("shortens amounts", () => {
    expect(formatCompactAmount(2_259_500)).toBe("2,26 jt");
    expect(formatCompactAmount(410_000)).toBe("410 rb");
    expect(formatCompactAmount(950)).toBe("950");
  });
});
