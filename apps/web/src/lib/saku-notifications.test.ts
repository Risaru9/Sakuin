import { describe, expect, it } from "vitest";
import type { RecurringRule } from "../features/recurring/recurring.types";
import { formatShortRupiah, planBillReminders } from "./saku-notifications";

const rule: RecurringRule = {
  id: "rent", categoryId: "home", type: "EXPENSE", amount: "750000", note: "Bayar kos",
  frequency: "MONTHLY", interval: 1, dayOfMonth: 20, dayOfWeek: null,
  startDate: "2026-09-20T00:00:00", endDate: null, nextRunAt: "2026-09-20T00:00:00",
  autoPost: true, isActive: true, lastRunAt: null, createdAt: "", updatedAt: "",
  category: { id: "home", name: "Rumah", type: "EXPENSE", icon: null, color: null }
};
const now = new Date(2026, 8, 18, 12);

describe("planBillReminders", () => {
  it("schedules 09.00 the previous day and monthly occurrences", () => {
    const result = planBillReminders([rule], now);
    expect(result.map((r) => r.at)).toEqual([new Date(2026, 8, 19, 9), new Date(2026, 9, 19, 9), new Date(2026, 10, 19, 9)]);
    expect(result[0].title).toBe("Besok: Bayar kos 750 rb");
    expect(result[0].body).toContain("otomatis");
  });
  it("skips inactive and income rules", () => {
    expect(planBillReminders([{ ...rule, isActive: false }, { ...rule, type: "INCOME" }], now)).toEqual([]);
  });
  it("skips past reminders and respects the inclusive end date", () => {
    const result = planBillReminders([{ ...rule, endDate: "2026-10-20T00:00:00" }], new Date(2026, 8, 19, 10));
    expect(result.map((r) => r.at)).toEqual([new Date(2026, 9, 19, 9)]);
  });
  it("steps weekly intervals and uses manual payment copy", () => {
    const result = planBillReminders([{ ...rule, frequency: "WEEKLY", interval: 2, autoPost: false }], now);
    expect(result.map((r) => r.at)).toEqual([new Date(2026, 8, 19, 9), new Date(2026, 9, 3, 9), new Date(2026, 9, 17, 9)]);
    expect(result[0].body).toContain("Jangan lupa dibayar");
  });
  it("clamps monthly dates to the 28th and respects the horizon", () => {
    const result = planBillReminders([{ ...rule, dayOfMonth: 31, interval: 2 }], now);
    expect(result).toHaveLength(1);
    const monthly = planBillReminders([{ ...rule, dayOfMonth: 31 }], now);
    expect(monthly[1].at).toEqual(new Date(2026, 9, 27, 9));
  });
});

it.each([[18000, "18 rb"], [1200000, "1,2 jt"], [5000000, "5 jt"], [999, "999"], [-10, "0"], [15500, "16 rb"]])("formats %s", (amount, expected) => {
  expect(formatShortRupiah(Number(amount))).toBe(expected);
});
