import { describe, expect, it } from "vitest";
import type { Goal } from "../goals/goal.types";
import {
  formatCompactRupiah,
  formatFinancialCheckupStatus,
  formatGoalDeadline,
  formatRupiah,
  getGoalProgress,
  getMonthNet,
  getPriorityGoal,
  toNumber
} from "./dashboard-utils";

function createGoal(override: Partial<Goal> = {}): Goal {
  return {
    id: "goal-1",
    name: "Dana darurat",
    targetAmount: "1000000.00",
    currentAmount: "250000.00",
    deadline: "2026-08-01T00:00:00.000Z",
    description: null,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
    ...override
  };
}

describe("dashboard-utils", () => {
  it("mengubah nilai numerik tidak valid menjadi 0", () => {
    expect(toNumber("12500")).toBe(12500);
    expect(toNumber("bukan-angka")).toBe(0);
    expect(toNumber(null)).toBe(0);
  });

  it("memformat rupiah dan compact rupiah", () => {
    expect(formatRupiah("15000")).toContain("15.000");
    expect(formatCompactRupiah("1500000")).toBe("Rp 1,5 jt");
    expect(formatCompactRupiah("25000")).toBe("Rp 25 rb");
  });

  it("memformat status financial checkup", () => {
    expect(formatFinancialCheckupStatus("GOOD")).toBe("Baik");
    expect(formatFinancialCheckupStatus("WATCH")).toBe("Waspada");
    expect(formatFinancialCheckupStatus("RISK")).toBe("Berisiko");
    expect(formatFinancialCheckupStatus("UNKNOWN")).toBe("Belum lengkap");
  });

  it("memformat deadline goal dengan fallback aman", () => {
    expect(formatGoalDeadline(null)).toBe("Tanpa deadline");
    expect(formatGoalDeadline("tanggal-rusak")).toBe("Tanpa deadline");
    expect(formatGoalDeadline("2026-08-01T00:00:00.000Z")).toContain("2026");
  });

  it("menghitung progress goal dan membatasi di 100 persen", () => {
    expect(getGoalProgress(createGoal())).toBe(25);
    expect(
      getGoalProgress(
        createGoal({
          currentAmount: "1500000.00"
        })
      )
    ).toBe(100);
    expect(
      getGoalProgress(
        createGoal({
          targetAmount: "0.00"
        })
      )
    ).toBe(0);
  });

  it("memilih goal prioritas eksplisit jika tersedia", () => {
    const goals = [
      createGoal({ id: "goal-a", deadline: "2026-09-01T00:00:00.000Z" }),
      createGoal({ id: "goal-b", deadline: "2026-07-01T00:00:00.000Z" })
    ];

    expect(getPriorityGoal(goals, "goal-a")?.id).toBe("goal-a");
  });

  it("memilih goal unfinished dengan deadline terdekat jika tidak ada prioritas", () => {
    const goals = [
      createGoal({ id: "goal-a", deadline: "2026-09-01T00:00:00.000Z" }),
      createGoal({ id: "goal-b", deadline: "2026-07-01T00:00:00.000Z" })
    ];

    expect(getPriorityGoal(goals, null)?.id).toBe("goal-b");
  });

  it("menghitung net bulanan", () => {
    expect(
      getMonthNet({
        month: "2026-06",
        income: "3000000.00",
        expense: "750000.00",
        balance: "2250000.00"
      })
    ).toBe(2250000);
  });
});
