import { describe, expect, it, vi } from "vitest";
import {
  AiProviderConfigurationError,
  AiProviderResponseError,
  createGeminiTextProvider
} from "../src/modules/ai/ai.provider.js";

describe("AI Gemini provider", () => {
  it("gagal dibuat jika API key belum dikonfigurasi dan client tidak disediakan", () => {
    expect(() =>
      createGeminiTextProvider({
        apiKey: ""
      })
    ).toThrow(AiProviderConfigurationError);
  });

  it("menghasilkan text dari Gemini client yang di-inject", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "Ringkasan pengeluaran berhasil dibuat."
    });

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "test-model"
    });

    const result = await provider.generateText({
      systemInstruction:
        "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
      prompt: "pengeluaran saya bulan ini gimana?"
    });

    expect(result).toEqual({
      text: "Ringkasan pengeluaran berhasil dibuat.",
      model: "test-model"
    });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: "pengeluaran saya bulan ini gimana?",
      config: {
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        maxOutputTokens: 900,
        temperature: 0.35
      }
    });
  });

  it("meneruskan model override dari input jika tersedia", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "Model override berhasil dipakai."
    });

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "default-test-model"
    });

    const result = await provider.generateText({
      systemInstruction:
        "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
      prompt: "ringkas keuangan saya",
      model: "override-model"
    });

    expect(result.model).toBe("override-model");
    expect(result.text).toBe("Model override berhasil dipakai.");

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent).toHaveBeenCalledWith({
      model: "override-model",
      contents: "ringkas keuangan saya",
      config: {
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        maxOutputTokens: 900,
        temperature: 0.35
      }
    });
  });

  it("meneruskan maxOutputTokens dan temperature override dari input", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "Override konfigurasi berhasil dipakai."
    });

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "test-model"
    });

    const result = await provider.generateText({
      systemInstruction:
        "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
      prompt: "buat analisis risiko ringan",
      maxOutputTokens: 1200,
      temperature: 0.25
    });

    expect(result.text).toBe("Override konfigurasi berhasil dipakai.");

    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: "buat analisis risiko ringan",
      config: {
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        maxOutputTokens: 1200,
        temperature: 0.25
      }
    });
  });

  it("menolak prompt kosong", async () => {
    const generateContent = vi.fn();

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "test-model"
    });

    await expect(
      provider.generateText({
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        prompt: "   "
      })
    ).rejects.toThrow(AiProviderResponseError);

    expect(generateContent).not.toHaveBeenCalled();
  });

  it("menolak system instruction kosong", async () => {
    const generateContent = vi.fn();

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "test-model"
    });

    await expect(
      provider.generateText({
        systemInstruction: "   ",
        prompt: "ringkas keuangan saya"
      })
    ).rejects.toThrow(AiProviderResponseError);

    expect(generateContent).not.toHaveBeenCalled();
  });

  it("menolak response kosong dari provider", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "   "
    });

    const provider = createGeminiTextProvider({
      client: {
        models: {
          generateContent
        }
      },
      model: "test-model"
    });

    await expect(
      provider.generateText({
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        prompt: "ringkas keuangan saya"
      })
    ).rejects.toThrow(AiProviderResponseError);

    expect(generateContent).toHaveBeenCalledTimes(1);
  });
});