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
      text: "Pengeluaran bulan ini masih aman."
    });

    const provider = createGeminiTextProvider({
      model: "test-model",
      client: {
        models: {
          generateContent
        }
      }
    });

    const result = await provider.generateText({
      systemInstruction:
        "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
      prompt: "pengeluaran saya bulan ini gimana?"
    });

    expect(result).toEqual({
      text: "Pengeluaran bulan ini masih aman.",
      model: "test-model"
    });

    expect(generateContent).toHaveBeenCalledTimes(1);
    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: expect.stringContaining("SYSTEM INSTRUCTION:")
    });

    expect(generateContent).toHaveBeenCalledWith({
      model: "test-model",
      contents: expect.stringContaining("USER MESSAGE:")
    });
  });

  it("meneruskan model override dari input jika tersedia", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      text: "Model override aktif."
    });

    const provider = createGeminiTextProvider({
      model: "default-model",
      client: {
        models: {
          generateContent
        }
      }
    });

    const result = await provider.generateText({
      model: "override-model",
      systemInstruction:
        "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
      prompt: "ringkas keuangan saya"
    });

    expect(result.model).toBe("override-model");
    expect(generateContent).toHaveBeenCalledWith({
      model: "override-model",
      contents: expect.any(String)
    });
  });

  it("menolak prompt kosong", async () => {
    const provider = createGeminiTextProvider({
      model: "test-model",
      client: {
        models: {
          generateContent: vi.fn()
        }
      }
    });

    await expect(
      provider.generateText({
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        prompt: "   "
      })
    ).rejects.toThrow(AiProviderResponseError);
  });

  it("menolak system instruction kosong", async () => {
    const provider = createGeminiTextProvider({
      model: "test-model",
      client: {
        models: {
          generateContent: vi.fn()
        }
      }
    });

    await expect(
      provider.generateText({
        systemInstruction: "   ",
        prompt: "pengeluaran saya bulan ini gimana?"
      })
    ).rejects.toThrow(AiProviderResponseError);
  });

  it("menolak response kosong dari provider", async () => {
    const provider = createGeminiTextProvider({
      model: "test-model",
      client: {
        models: {
          generateContent: vi.fn().mockResolvedValue({
            text: "   "
          })
        }
      }
    });

    await expect(
      provider.generateText({
        systemInstruction:
          "Kamu adalah Asisten Sakuin yang hanya menjawab topik finansial.",
        prompt: "pengeluaran saya bulan ini gimana?"
      })
    ).rejects.toThrow(AiProviderResponseError);
  });
});