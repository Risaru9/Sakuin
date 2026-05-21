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

export type AiChatHistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

export type AiTransactionDraft = {
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string | null;
  categoryName: string | null;
  note: string | null;
  date: string;
  confidence: "low" | "medium" | "high";
  missingFields: string[];
  warnings: string[];
};

export type AiChatRequest = {
  message: string;
  history?: AiChatHistoryMessage[];
};

export type AiChatResponse = {
  reply: string;
  intent: AiIntent;
  cards: AiChatCard[];
  suggestions: string[];
  transactionDraft?: AiTransactionDraft;
};

export type AiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  intent?: AiIntent;
  cards?: AiChatCard[];
  suggestions?: string[];
  transactionDraft?: AiTransactionDraft;
  createdAt: string;
};