import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

export type AiGenerateTextInput = {
  systemInstruction: string;
  prompt: string;
  model?: string;
};

export type AiGenerateTextResult = {
  text: string;
  model: string;
};

export type AiTextProvider = {
  generateText(input: AiGenerateTextInput): Promise<AiGenerateTextResult>;
};

type GeminiGenerateContentResponse = {
  text?: string;
};

type GeminiClient = {
  models: {
    generateContent(input: {
      model: string;
      contents: string;
    }): Promise<GeminiGenerateContentResponse>;
  };
};

type GeminiProviderOptions = {
  apiKey?: string;
  model?: string;
  client?: GeminiClient;
};

export class AiProviderConfigurationError extends Error {
  constructor(message = "AI provider belum dikonfigurasi") {
    super(message);
    this.name = "AiProviderConfigurationError";
  }
}

export class AiProviderResponseError extends Error {
  constructor(message = "AI provider mengembalikan response tidak valid") {
    super(message);
    this.name = "AiProviderResponseError";
  }
}

function buildGeminiPrompt(input: AiGenerateTextInput) {
  return [
    "SYSTEM INSTRUCTION:",
    input.systemInstruction.trim(),
    "",
    "USER MESSAGE:",
    input.prompt.trim()
  ].join("\n");
}

export function createGeminiTextProvider(
  options: GeminiProviderOptions = {}
): AiTextProvider {
  const apiKey = options.apiKey ?? env.GEMINI_API_KEY;
  const model = options.model ?? env.GEMINI_MODEL;

  const client =
    options.client ??
    (() => {
      if (!apiKey) {
        throw new AiProviderConfigurationError(
          "GEMINI_API_KEY belum dikonfigurasi"
        );
      }

      return new GoogleGenAI({
        apiKey
      }) as GeminiClient;
    })();

  return {
    async generateText(input: AiGenerateTextInput) {
      const normalizedPrompt = input.prompt.trim();
      const normalizedSystemInstruction = input.systemInstruction.trim();

      if (!normalizedPrompt) {
        throw new AiProviderResponseError("Prompt AI tidak boleh kosong");
      }

      if (!normalizedSystemInstruction) {
        throw new AiProviderResponseError(
          "System instruction AI tidak boleh kosong"
        );
      }

      const selectedModel = input.model ?? model;

      const response = await client.models.generateContent({
        model: selectedModel,
        contents: buildGeminiPrompt({
          ...input,
          model: selectedModel
        })
      });

      const text = response.text?.trim();

      if (!text) {
        throw new AiProviderResponseError(
          "AI provider mengembalikan teks kosong"
        );
      }

      return {
        text,
        model: selectedModel
      };
    }
  };
}