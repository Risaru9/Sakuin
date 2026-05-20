import { GoogleGenAI } from "@google/genai";
import { env } from "../../config/env.js";

type GeminiGenerateContentInput = {
  model: string;
  contents: string;
  config: {
    systemInstruction: string;
    maxOutputTokens: number;
    temperature: number;
  };
};

type GeminiGenerateContentResponse = {
  text?: string | (() => string | Promise<string>) | null;
};

type GeminiClient = {
  models: {
    generateContent(
      input: GeminiGenerateContentInput
    ): Promise<GeminiGenerateContentResponse>;
  };
};

export type AiTextProviderInput = {
  systemInstruction: string;
  prompt: string;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export type AiTextProviderOutput = {
  text: string;
  model: string;
};

export type AiTextProvider = {
  generateText(input: AiTextProviderInput): Promise<AiTextProviderOutput>;
};

export type GeminiTextProviderOptions = {
  apiKey?: string;
  client?: GeminiClient;
  model?: string;
  maxOutputTokens?: number;
  temperature?: number;
};

export class AiProviderConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderConfigurationError";
  }
}

export class AiProviderResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiProviderResponseError";
  }
}

function resolveModel(model?: string) {
  const resolvedModel = model?.trim() || env.GEMINI_MODEL_DEFAULT;

  if (!resolvedModel) {
    throw new AiProviderConfigurationError("Model Gemini belum dikonfigurasi.");
  }

  return resolvedModel;
}

function resolveMaxOutputTokens(value?: number) {
  return value ?? 900;
}

function resolveTemperature(value?: number) {
  return value ?? 0.35;
}

function getGeminiApiKey(explicitApiKey?: string) {
  if (explicitApiKey !== undefined) {
    const trimmedApiKey = explicitApiKey.trim();

    if (!trimmedApiKey) {
      throw new AiProviderConfigurationError(
        "GEMINI_API_KEY belum dikonfigurasi."
      );
    }

    return trimmedApiKey;
  }

  const apiKey = env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new AiProviderConfigurationError("GEMINI_API_KEY belum dikonfigurasi.");
  }

  return apiKey;
}

function validateGenerateTextInput(input: AiTextProviderInput) {
  const systemInstruction = input.systemInstruction.trim();
  const prompt = input.prompt.trim();

  if (!systemInstruction) {
    throw new AiProviderResponseError("System instruction wajib diisi.");
  }

  if (!prompt) {
    throw new AiProviderResponseError("Prompt wajib diisi.");
  }

  return {
    systemInstruction,
    prompt
  };
}

async function extractResponseText(response: GeminiGenerateContentResponse) {
  if (typeof response.text === "function") {
    return (await response.text()).trim();
  }

  return response.text?.trim() ?? "";
}

function createDefaultGeminiClient(apiKey: string): GeminiClient {
  return new GoogleGenAI({
    apiKey
  }) as unknown as GeminiClient;
}

export function createGeminiTextProvider(
  options: GeminiTextProviderOptions = {}
): AiTextProvider {
  if (!options.client && options.apiKey !== undefined && !options.apiKey.trim()) {
    throw new AiProviderConfigurationError("GEMINI_API_KEY belum dikonfigurasi.");
  }

  return {
    async generateText(input) {
      const { systemInstruction, prompt } = validateGenerateTextInput(input);
      const model = resolveModel(input.model ?? options.model);

      try {
        const client =
          options.client ?? createDefaultGeminiClient(getGeminiApiKey(options.apiKey));

        const response = await client.models.generateContent({
          model,
          contents: prompt,
          config: {
            systemInstruction,
            maxOutputTokens: resolveMaxOutputTokens(
              input.maxOutputTokens ?? options.maxOutputTokens
            ),
            temperature: resolveTemperature(
              input.temperature ?? options.temperature
            )
          }
        });

        const text = await extractResponseText(response);

        if (!text) {
          throw new AiProviderResponseError("Gemini tidak mengembalikan teks.");
        }

        return {
          text,
          model
        };
      } catch (error) {
        if (
          error instanceof AiProviderConfigurationError ||
          error instanceof AiProviderResponseError
        ) {
          throw error;
        }

        const message =
          error instanceof Error
            ? error.message
            : "Gemini provider gagal membuat response.";

        throw new AiProviderResponseError(message);
      }
    }
  };
}