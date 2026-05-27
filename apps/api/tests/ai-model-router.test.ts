import { describe, expect, it } from "vitest";
import { selectAiModelPlan } from "../src/modules/ai/ai-model-router.js";

describe("AI model router", () => {
  it("memakai default route untuk ringkasan keuangan sederhana", () => {
    const plan = selectAiModelPlan({
      intent: "FINANCIAL_SUMMARY",
      userMessage: "pengeluaran bulan ini gimana?"
    });

    expect(plan.route).toBe("default");
    expect(plan.reason).toBe("simple_financial_assistant");
    expect(plan.maxOutputTokens).toBe(1200);
  });

  it("memakai complex route untuk analisis goal atau pembelian besar", () => {
    const plan = selectAiModelPlan({
      intent: "GOAL_ANALYSIS",
      userMessage:
        "apakah realistis membeli motor 30 juta dengan gaji 8 juta dan tenor 24 bulan?"
    });

    expect(plan.route).toBe("complex");
    expect(plan.reason).toBe("complex_financial_analysis");
    expect(plan.maxOutputTokens).toBe(2200);
  });

  it("memakai complex route untuk follow-up yang membahas tenor dan risiko", () => {
    const plan = selectAiModelPlan({
      intent: "SAVING_ADVICE",
      userMessage: "kalau tenor 32 bulan apakah lebih low risk?",
      history: [
        {
          role: "user",
          content:
            "Saya ingin membeli motor 30 juta dengan gaji 8 juta per bulan."
        },
        {
          role: "assistant",
          content:
            "Perlu membandingkan tenor, cicilan bulanan, dan risiko cashflow."
        }
      ]
    });

    expect(plan.route).toBe("complex");
    expect(plan.reason).toBe("complex_financial_analysis");
    expect(plan.maxOutputTokens).toBe(2200);
  });
});
