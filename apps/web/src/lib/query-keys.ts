import type { GetTransactionsParams } from "../features/transactions/transaction.service";

export const queryKeys = {
  summary: ["summary"] as const,
  goals: ["goals"] as const,
  profile: ["profile"] as const,
  categories: ["categories"] as const,
  recurring: ["recurring"] as const,
  emailImports: {
    overview: ["email-imports", "overview"] as const
  },
  transactions: {
    all: ["transactions"] as const,
    list: (params: GetTransactionsParams) =>
      ["transactions", "list", params] as const
  }
};
