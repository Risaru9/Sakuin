import { describe, expect, it } from "vitest";
import {
  analyzeFinancialScenario,
  buildFinancialScenarioPromptContext
} from "../src/modules/ai/ai-financial-scenario.js";

describe("AI financial scenario analyzer", () => {
  it("menganalisis skenario gaji, target pembelian, dan range tenor", () => {
    const scenario = analyzeFinancialScenario(
      "Gaji saya 8 juta, ingin membeli motor harga 30 juta, tenor 12 sampai 32 bulan apakah realistis?"
    );

    expect(scenario.detected).toBe(true);
    expect(scenario.itemName).toBe("motor");
    expect(scenario.monthlyIncome).toBe(8_000_000);
    expect(scenario.targetAmount).toBe(30_000_000);
    expect(scenario.durationsMonths).toEqual([12, 32]);

    expect(scenario.options).toEqual([
      {
        months: 12,
        monthlyRequired: 2_500_000,
        incomeRatioPercent: 31.3,
        verdict: "Berisiko tinggi"
      },
      {
        months: 32,
        monthlyRequired: 937_500,
        incomeRatioPercent: 11.7,
        verdict: "Cukup realistis"
      }
    ]);

    expect(scenario.verdictSummary).toContain("12 bulan: Berisiko tinggi");
    expect(scenario.verdictSummary).toContain("32 bulan: Cukup realistis");
  });

  it("memakai history untuk memahami follow-up skenario pembelian", () => {
    const scenario = analyzeFinancialScenario(
      "Kalau android 10 juta apakah lebih low risk?",
      [
        {
          role: "user",
          content:
            "Gaji saya 6 juta dan saya ingin membeli iPhone seharga 16 juta dalam 12 bulan."
        },
        {
          role: "assistant",
          content:
            "Butuh alokasi sekitar Rp1,33 juta per bulan atau 22% dari pendapatan."
        }
      ]
    );

    expect(scenario.detected).toBe(true);
    expect(scenario.monthlyIncome).toBe(6_000_000);
    expect(scenario.targetAmount).toBe(10_000_000);
    expect(scenario.durationsMonths).toEqual([12]);
    expect(scenario.options[0]).toEqual({
      months: 12,
      monthlyRequired: 833_334,
      incomeRatioPercent: 13.9,
      verdict: "Cukup realistis"
    });
  });

  it("menandai data kurang jika tenor belum disebutkan", () => {
    const scenario = analyzeFinancialScenario(
      "Dengan gaji 8 juta apakah membeli motor 30 juta realistis?"
    );

    expect(scenario.detected).toBe(true);
    expect(scenario.monthlyIncome).toBe(8_000_000);
    expect(scenario.targetAmount).toBe(30_000_000);
    expect(scenario.missingFields).toContain("deadline/tenor");
    expect(scenario.options).toEqual([]);
  });

  it("membuat prompt context tanpa data sensitif mentah", () => {
    const scenario = analyzeFinancialScenario(
      "Gaji saya 8 juta, ingin membeli motor 30 juta dalam 24 bulan"
    );

    const promptContext = buildFinancialScenarioPromptContext(scenario);

    expect(promptContext).toContain("Pendapatan bulanan skenario user");
    expect(promptContext).toContain("Target nominal/harga");
    expect(promptContext).toContain("24 bulan");
    expect(promptContext).toContain("verdict");
  });
});