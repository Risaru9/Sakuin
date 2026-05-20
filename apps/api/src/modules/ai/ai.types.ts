export const AI_INTENTS = [
  "FINANCIAL_SUMMARY",
  "SPENDING_ANALYSIS",
  "INCOME_ANALYSIS",
  "PERIOD_COMPARISON",
  "SAVING_ADVICE",
  "GOAL_ANALYSIS",
  "TRANSACTION_DRAFT",
  "OUT_OF_SCOPE"
] as const;

export type AiIntent = (typeof AI_INTENTS)[number];

export type AiIntentConfidence = "low" | "medium" | "high";

export type AiIntentClassification = {
  intent: AiIntent;
  confidence: AiIntentConfidence;
  reason: string;
};

export type AiChatRequest = {
  message: string;
};

export type AiChatCard = {
  label: string;
  value: string;
};

export type AiChatResponse = {
  reply: string;
  intent: AiIntent;
  cards: AiChatCard[];
  suggestions: string[];
};

export type AiChatServiceInput = {
  userId: string;
  message: string;
};