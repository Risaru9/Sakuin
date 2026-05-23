import { describe, expect, it } from "vitest";
import { classifyAiIntent } from "../src/modules/ai/ai.intent.js";

describe("AI intent classifier", () => {
  it("mengklasifikasikan pertanyaan ringkasan keuangan", () => {
    const result = classifyAiIntent("kondisi keuangan saya bulan ini gimana?");

    expect(result.intent).toBe("FINANCIAL_SUMMARY");
    expect(result.reason).toBe("general_financial_context_detected");
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

  it("mengklasifikasikan perbandingan periode singkat tanpa kata pengeluaran eksplisit", () => {
    const result = classifyAiIntent("bandingkan bulan ini dan bulan lalu");

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

  it("mengklasifikasikan permintaan menekan pengeluaran sebagai saving advice", () => {
    const result = classifyAiIntent(
      "apa yang bisa saya lakukan untuk menekan pengeluaran saya?"
    );

    expect(result.intent).toBe("SAVING_ADVICE");
    expect(result.reason).toBe("saving_advice_detected");
  });

  it("mengklasifikasikan analisis goal", () => {
    const result = classifyAiIntent("goal tabungan saya progresnya gimana?");

    expect(result.intent).toBe("GOAL_ANALYSIS");
    expect(result.reason).toBe("goal_or_purchase_feasibility_detected");
  });

  it("mengklasifikasikan skenario target pembelian sebagai goal analysis", () => {
    const result = classifyAiIntent(
      "apakah realistis jika saya ingin membeli motor 20 juta dalam 12 bulan dengan gaji 6 juta?"
    );

    expect(result.intent).toBe("GOAL_ANALYSIS");
    expect(result.reason).toBe("goal_or_purchase_feasibility_detected");
  });

  it("mengklasifikasikan skenario pembelian handphone sebagai goal analysis", () => {
    const result = classifyAiIntent(
      "Bagaimana jika saya membeli handphone android seharga 10 juta saja apakah mungkin lebih realistis dan low risk?"
    );

    expect(result.intent).toBe("GOAL_ANALYSIS");
    expect(result.reason).toBe("goal_or_purchase_feasibility_detected");
  });

  it("mengklasifikasikan draft transaksi dari chat natural", () => {
    const result = classifyAiIntent("catat makan ayam geprek 15000 tadi siang");

    expect(result.intent).toBe("TRANSACTION_DRAFT");
    expect(result.reason).toBe("transaction_draft_detected");
  });

  it("mengklasifikasikan draft pemasukan dari chat natural", () => {
    const result = classifyAiIntent("catat dikasih kakak 100000");

    expect(result.intent).toBe("TRANSACTION_DRAFT");
    expect(result.reason).toBe("transaction_draft_detected");
  });
  
    it("mengklasifikasikan pertanyaan safe-to-spend sebagai saving advice", () => {
    const result = classifyAiIntent("hari ini saya masih aman belanja berapa?");

    expect(result.intent).toBe("SAVING_ADVICE");
    expect(result.reason).toBe("safe_to_spend_detected");
  });

  it("mengklasifikasikan pertanyaan batas harian aman sebagai saving advice", () => {
    const result = classifyAiIntent("batas harian aman saya berapa?");

    expect(result.intent).toBe("SAVING_ADVICE");
    expect(result.reason).toBe("safe_to_spend_detected");
  });

  it("menolak pertanyaan di luar finansial", () => {
    const result = classifyAiIntent("buatkan cerpen tentang kerajaan");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("no_financial_context_detected");
  });

  it("tetap menolak pertanyaan hiburan di luar finansial", () => {
    const result = classifyAiIntent("siapa istri naruto?");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("no_financial_context_detected");
  });

  it("menolak pertanyaan umum tanpa konteks finansial", () => {
    const result = classifyAiIntent("apa kabar hari ini?");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("no_financial_context_detected");
  });

  it("menolak pesan kosong", () => {
    const result = classifyAiIntent("   ");

    expect(result.intent).toBe("OUT_OF_SCOPE");
    expect(result.reason).toBe("empty_message");
  });
});