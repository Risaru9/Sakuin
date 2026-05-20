export type AiIntent =
  | "FINANCIAL_SUMMARY"
  | "SPENDING_ANALYSIS"
  | "INCOME_ANALYSIS"
  | "PERIOD_COMPARISON"
  | "SAVING_ADVICE"
  | "GOAL_ANALYSIS"
  | "TRANSACTION_DRAFT"
  | "OUT_OF_SCOPE";

export type AiChatCard = {
  label: string;
  value: string;
};

export type AiChatRequest = {
  message: string;
};

export type AiChatResponse = {
  reply: string;
  intent: AiIntent;
  cards: AiChatCard[];
  suggestions: string[];
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: AiIntent;
  cards?: AiChatCard[];
  suggestions?: string[];
  createdAt: string;
};