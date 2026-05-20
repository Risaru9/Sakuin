import { env } from "../../config/env.js";
import type { AiChatHistoryMessage, AiIntent } from "./ai.types.js";

export type AiModelRoute = "default" | "complex";

export type AiModelPlan = {
  route: AiModelRoute;
  primaryModel: string;
  fallbackModel: string;
  maxOutputTokens: number;
  temperature: number;
  reason: string;
};

const COMPLEX_FINANCIAL_KEYWORDS = [
  "realistis",
  "tidak realistis",
  "masuk akal",
  "worth it",
  "layak",
  "risiko",
  "risk",
  "low risk",
  "kredit",
  "cicilan",
  "tenor",
  "dp",
  "bunga",
  "angsuran",
  "deadline",
  "jangka waktu",
  "target",
  "membeli",
  "beli",
  "harga",
  "seharga",
  "motor",
  "mobil",
  "iphone",
  "android",
  "handphone",
  "hp",
  "laptop",
  "gaji",
  "pendapatan",
  "dana darurat",
  "pengeluaran mendadak",
  "prioritas",
  "skenario",
  "bandingkan opsi",
  "rekomendasi"
];

const SIMPLE_FINANCIAL_KEYWORDS = [
  "pengeluaran bulan ini",
  "pemasukan bulan ini",
  "saya boros di mana",
  "ringkasan keuangan",
  "kondisi keuangan",
  "lihat pengeluaran",
  "lihat pemasukan"
];

function normalizeText(value: string) {
  return value.toLowerCase();
}

function includesAnyKeyword(text: string, keywords: string[]) {
  return keywords.some((keyword) => text.includes(keyword));
}

function buildContextText(input: {
  userMessage: string;
  history?: AiChatHistoryMessage[];
}) {
  const historyText =
    input.history
      ?.slice(-6)
      .map((message) => message.content)
      .join("\n") ?? "";

  return normalizeText(`${historyText}\n${input.userMessage}`);
}

function hasMultipleMoneyValues(text: string) {
  const matches = text.match(
    /\b(rp\s*)?\d+([.,]\d+)?\s*(juta|jt|ribu|rb|k|miliar|m)?\b/gi
  );

  return (matches?.length ?? 0) >= 2;
}

function isComplexFinancialRequest(input: {
  intent: AiIntent;
  userMessage: string;
  history?: AiChatHistoryMessage[];
}) {
  const contextText = buildContextText(input);

  if (input.intent === "GOAL_ANALYSIS") {
    return true;
  }

  if (input.intent === "PERIOD_COMPARISON") {
    return true;
  }

  if (includesAnyKeyword(contextText, COMPLEX_FINANCIAL_KEYWORDS)) {
    return true;
  }

  if (hasMultipleMoneyValues(contextText)) {
    return true;
  }

  return false;
}

function isSimpleFinancialRequest(input: {
  intent: AiIntent;
  userMessage: string;
  history?: AiChatHistoryMessage[];
}) {
  const contextText = buildContextText(input);

  return (
    input.intent === "FINANCIAL_SUMMARY" ||
    input.intent === "SPENDING_ANALYSIS" ||
    input.intent === "INCOME_ANALYSIS" ||
    input.intent === "SAVING_ADVICE" ||
    includesAnyKeyword(contextText, SIMPLE_FINANCIAL_KEYWORDS)
  );
}

export function selectAiModelPlan(input: {
  intent: AiIntent;
  userMessage: string;
  history?: AiChatHistoryMessage[];
}): AiModelPlan {
  const complex = isComplexFinancialRequest(input);
  const simple = isSimpleFinancialRequest(input);

  if (complex) {
    return {
      route: "complex",
      primaryModel: env.GEMINI_MODEL_COMPLEX,
      fallbackModel: env.GEMINI_MODEL_FALLBACK,
      maxOutputTokens: 1200,
      temperature: 0.25,
      reason: "complex_financial_analysis"
    };
  }

  if (simple) {
    return {
      route: "default",
      primaryModel: env.GEMINI_MODEL_DEFAULT,
      fallbackModel: env.GEMINI_MODEL_FALLBACK,
      maxOutputTokens: 800,
      temperature: 0.35,
      reason: "simple_financial_assistant"
    };
  }

  return {
    route: "default",
    primaryModel: env.GEMINI_MODEL_DEFAULT,
    fallbackModel: env.GEMINI_MODEL_FALLBACK,
    maxOutputTokens: 700,
    temperature: 0.3,
    reason: "default_financial_assistant"
  };
}