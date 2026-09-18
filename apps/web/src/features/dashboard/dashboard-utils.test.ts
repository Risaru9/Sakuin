import { describe, expect, it } from "vitest";
import type { Goal } from "../goals/goal.types";
import { formatCompactRupiah, formatRupiah, getGoalProgress, toNumber } from "./dashboard-utils";

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
});
