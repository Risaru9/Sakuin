import { describe, expect, it } from "vitest";
import { getAiChatResponse } from "../src/modules/ai/ai.service.js";

describe("AI chat service contract", () => {
  it("menolak pertanyaan di luar finansial", async () => {
    const response = await getAiChatResponse({
      userId: "user-1",
      message: "buatkan cerpen tentang kerajaan"
    });

    expect(response.intent).toBe("OUT_OF_SCOPE");
    expect(response.reply).toContain("Asisten Sakuin hanya bisa membantu");
    expect(response.cards).toEqual([]);
    expect(response.suggestions.length).toBeGreaterThan(0);
  });

  it("mengembalikan response kontrak untuk financial summary", async () => {
    const response = await getAiChatResponse({
      userId: "user-1",
      message: "kondisi keuangan saya bulan ini gimana?"
    });

    expect(response.intent).toBe("FINANCIAL_SUMMARY");
    expect(response.reply).toContain("merangkum kondisi keuangan");
    expect(response.cards).toEqual([
      {
        label: "Topik",
        value: "Ringkasan Keuangan"
      },
      {
        label: "Status",
        value: "Siap dihubungkan ke data Sakuin"
      }
    ]);
    expect(response.suggestions).toContain("Saya boros di mana?");
  });

  it("mengembalikan response kontrak untuk spending analysis", async () => {
    const response = await getAiChatResponse({
      userId: "user-1",
      message: "saya boros di mana bulan ini?"
    });

    expect(response.intent).toBe("SPENDING_ANALYSIS");
    expect(response.reply).toContain("menganalisis pengeluaran");
    expect(response.cards[0]).toEqual({
      label: "Topik",
      value: "Analisis Pengeluaran"
    });
  });

  it("mengembalikan response kontrak untuk transaction draft", async () => {
    const response = await getAiChatResponse({
      userId: "user-1",
      message: "catat makan ayam geprek 15000 tadi siang"
    });

    expect(response.intent).toBe("TRANSACTION_DRAFT");
    expect(response.reply).toContain("draft transaksi");
    expect(response.reply).toContain("review");
    expect(response.suggestions).toContain("Catat bensin 30000 kemarin");
  });

  it("tidak membocorkan userId pada response", async () => {
    const response = await getAiChatResponse({
      userId: "secret-user-id",
      message: "pengeluaran saya bulan ini gimana?"
    });

    const serializedResponse = JSON.stringify(response);

    expect(serializedResponse).not.toContain("secret-user-id");
  });
});