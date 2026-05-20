import { describe, expect, it } from "vitest";
import {
  classifyAiIntent,
  isAiIntentAllowed
} from "../src/modules/ai/ai.intent.js";

describe("AI intent classifier", () => {
  it("mengklasifikasikan pertanyaan ringkasan keuangan", () => {
    const result = classifyAiIntent("kondisi keuangan saya bulan ini gimana?");

    expect(result.intent).toBe("FINANCIAL_SUMMARY");
    expect(result.reason).toBe("financial_summary_detected");
    expect(isAiIntentAllowed("kondisi keuangan saya bulan ini gimana?")).toBe(
      true
    );
  });

  it("mengklasifikasikan analisis pengeluaran", () => {
    const result = classifyAiIntent("saya boros di mana bulan ini?");

    expect(result.intent).toBe("SPENDING_ANALYSIS");
    expect(result.reason).toBe("spending_analysis_detected");
  });

  it("mengklasifikasikan analisis pemasukan", () => {
    const result = classifyAiIntent("pemasukan saya bulan ini berapa?");

    expect(result.intent).toBe("INCOME_ANALYSIS");
    expect(result.reason).toBe("income_analysis_detected");
  });

  it("mengklasifikasikan perbandingan periode", () => {
    const result = classifyAiIntent(
      "bandingkan pengeluaran bulan ini dengan bulan lalu"
    );

    expect(result.intent).toBe("PERIOD_COMPARISON");
    expect(result.reason).toBe("period_comparison_detected");
  });

  it("mengklasifikasikan saran hemat", () => {
    const result = classifyAiIntent(
      "kasih saran hemat dari pengeluaran saya bulan ini"
    );

    expect(result.intent).toBe("SAVING_ADVICE");
    expect(result.reason).toBe("saving_advice_detected");
  });

  it("mengklasifikasikan analisis goal", () => {
    const result = classifyAiIntent("goal tabungan saya progresnya gimana?");

    expect(result.intent).toBe("GOAL_ANALYSIS");
    expect(result.reason).toBe("goal_analysis_detected");
  });

  it("mengklasifikasikan draft transaksi dari chat natural", () => {
    const result = classifyAiIntent("catat makan ayam geprek 15000 tadi siang");

    expect(result.intent).toBe("TRANSACTION_DRAFT");
    expect(result.reason).toBe("transaction_verb_and_amount_detected");
  });

  it("menolak pertanyaan di luar finansial", () => {
    const result = classifyAiIntent("buatkan cerpen tentang kerajaan");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("non_financial_topic");
    expect(isAiIntentAllowed("buatkan cerpen tentang kerajaan")).toBe(false);
  });

    it("menolak pertanyaan umum tanpa konteks finansial", () => {
    const result = classifyAiIntent("apa kabar hari ini?");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("missing_financial_context");
    });

  it("menolak pesan kosong", () => {
    const result = classifyAiIntent("   ");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("empty_message");
  });
});