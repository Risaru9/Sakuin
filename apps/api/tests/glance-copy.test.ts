import { describe, expect, it } from "vitest";
import {
  describeBudgetAlert,
  describeWeeklySummary,
  formatShortRupiah,
  getBudgetStatus,
  getCrossedBudgetLevel,
  getLocalPeriods,
  localDateKey,
  localDayStart
} from "../src/modules/summary/glance-copy.js";

const WIB = -420;

describe("glance local calendar", () => {
  it("puts a WIB day at 17.00 UTC of the day before", () => {
    expect(localDayStart("2026-09-20", WIB).toISOString()).toBe("2026-09-19T17:00:00.000Z");
  });

  it("reads the local day of an instant", () => {
    expect(localDateKey(new Date("2026-09-19T17:30:00.000Z"), WIB)).toBe("2026-09-20");
    expect(localDateKey(new Date("2026-09-19T16:59:00.000Z"), WIB)).toBe("2026-09-19");
  });

  it("builds Monday-to-Sunday weeks and whole months", () => {
    // 20 September 2026 is a Sunday.
    const periods = getLocalPeriods("2026-09-20", WIB);

    expect(periods.week.start.toISOString()).toBe("2026-09-13T17:00:00.000Z");
    expect(periods.week.end.toISOString()).toBe("2026-09-20T17:00:00.000Z");
    expect(periods.month.start.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(periods.month.end.toISOString()).toBe("2026-09-30T17:00:00.000Z");
    expect(periods.day.end.toISOString()).toBe("2026-09-20T17:00:00.000Z");
    expect(periods.monthLabel).toBe("September");
    expect(periods.daysLeftInMonth).toBe(10);
  });

  it("starts the week on the same Monday", () => {
    expect(getLocalPeriods("2026-09-14", WIB).week.start.toISOString()).toBe("2026-09-13T17:00:00.000Z");
  });
});

describe("glance copy", () => {
  it("shortens amounts the way Saku talks", () => {
    expect(formatShortRupiah(18_000)).toBe("18 rb");
    expect(formatShortRupiah(820_400)).toBe("820 rb");
    expect(formatShortRupiah(1_240_500)).toBe("1,2 jt");
    expect(formatShortRupiah(5_000_000)).toBe("5 jt");
    expect(formatShortRupiah(500)).toBe("500");
  });

  it("uses the Laporan thresholds", () => {
    expect(getBudgetStatus(79, 100)).toBe("ok");
    expect(getBudgetStatus(80, 100)).toBe("watch");
    expect(getBudgetStatus(100, 100)).toBe("watch");
    expect(getBudgetStatus(101, 100)).toBe("over");
  });

  it("alerts only when a threshold is crossed", () => {
    expect(getCrossedBudgetLevel(0, 50, 100)).toBeNull();
    expect(getCrossedBudgetLevel(70, 85, 100)).toBe(80);
    expect(getCrossedBudgetLevel(85, 90, 100)).toBeNull();
    expect(getCrossedBudgetLevel(90, 100, 100)).toBe(100);
    expect(getCrossedBudgetLevel(50, 130, 100)).toBe(100);
    expect(getCrossedBudgetLevel(110, 120, 100)).toBeNull();
    expect(getCrossedBudgetLevel(0, 90, 0)).toBeNull();
  });

  it("writes the budget notifications", () => {
    expect(
      describeBudgetAlert({ categoryName: "Makanan", level: 80, spent: 400_000, limit: 500_000, daysLeftInMonth: 10 })
    ).toEqual({
      title: "Makanan sudah 80% dari batas",
      body: "Sisa 100 rb untuk 10 hari lagi. Pelan-pelan, ya."
    });
    expect(
      describeBudgetAlert({ categoryName: "Belanja", level: 100, spent: 512_000, limit: 500_000, daysLeftInMonth: 3 })
    ).toEqual({
      title: "Batas Belanja sudah habis",
      body: "Bulan ini 512 rb dari batas 500 rb."
    });
  });

  it("writes the weekly summary and skips empty weeks", () => {
    expect(
      describeWeeklySummary({ expense: 820_000, count: 12, topCategory: { categoryName: "Makanan", amount: 310_000 } })
    ).toEqual({
      title: "Minggu ini keluar 820 rb",
      body: "Paling banyak buat Makanan: 310 rb. Ketuk untuk lihat laporan."
    });
    expect(describeWeeklySummary({ expense: 0, count: 0, topCategory: null })).toBeNull();
  });
});
