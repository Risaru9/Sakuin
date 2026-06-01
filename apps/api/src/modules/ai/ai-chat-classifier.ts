import { classifyAiIntent } from "./ai.intent.js";
import { buildConversationHistoryText } from "./ai-chat-history.js";
import type { AiChatHistoryMessage, AiIntent } from "./ai.types.js";

export { buildConversationHistoryText } from "./ai-chat-history.js";

const CONTEXTUAL_FOLLOW_UP_KEYWORDS = [
  "kalau",
  "kalo",
  "bagaimana jika",
  "gimana jika",
  "jika",
  "berarti",
  "itu",
  "tersebut",
  "opsi",
  "alternatif",
  "lebih realistis",
  "lebih aman",
  "low risk",
  "risiko",
  "risk",
  "bulan",
  "tahun",
  "deadline",
  "target",
  "harga",
  "seharga",
  "beli",
  "membeli",
  "android",
  "iphone",
  "handphone",
  "hp",
  "motor",
  "mobil",
  "laptop"
];

const CONTINUATION_FOLLOW_UP_KEYWORDS = [
  "lanjut",
  "lanjutannya",
  "lanjutkan",
  "terus",
  "teruskan",
  "sambung",
  "sambungkan",
  "detailnya",
  "jelaskan lagi",
  "penjelasan lanjut",
  "apa lanjutannya",
  "bagian lanjutannya",
  "next",
  "continue"
];

function looksLikeContextualFinancialFollowUp(message: string) {
  const normalizedMessage = message.toLowerCase();

  return (
    CONTEXTUAL_FOLLOW_UP_KEYWORDS.some((keyword) =>
      normalizedMessage.includes(keyword)
    ) || /\d/.test(normalizedMessage)
  );
}

function looksLikeContinuationFollowUp(message: string) {
  const normalizedMessage = message.toLowerCase().trim();

  if (!normalizedMessage || normalizedMessage.length > 120) {
    return false;
  }

  return CONTINUATION_FOLLOW_UP_KEYWORDS.some((keyword) =>
    normalizedMessage.includes(keyword)
  );
}

function inferRecentFinancialIntentFromHistory(
  history: AiChatHistoryMessage[] = []
): AiIntent | null {
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const historyMessage = history[index];

    if (historyMessage.role !== "user") {
      continue;
    }

    const content = historyMessage.content.trim();

    if (!content) {
      continue;
    }

    const classification = classifyAiIntent(content);

    if (
      classification.intent !== "OUT_OF_SCOPE" &&
      classification.intent !== "TRANSACTION_DRAFT"
    ) {
      return classification.intent;
    }
  }

  return null;
}

export function classifyAiChatMessage(
  message: string,
  history: AiChatHistoryMessage[] = []
) {
  const directClassification = classifyAiIntent(message);

  if (directClassification.intent !== "OUT_OF_SCOPE") {
    return directClassification;
  }

  if (history.length === 0) {
    return directClassification;
  }

  const isContextualFollowUp = looksLikeContextualFinancialFollowUp(message);
  const isContinuationFollowUp = looksLikeContinuationFollowUp(message);

  if (!isContextualFollowUp && !isContinuationFollowUp) {
    return directClassification;
  }

  const recentFinancialIntent = inferRecentFinancialIntentFromHistory(history);

  if (isContinuationFollowUp && recentFinancialIntent) {
    return {
      intent: recentFinancialIntent,
      confidence: "medium" as const,
      reason: "contextual_continuation_follow_up"
    };
  }

  const recentContext = buildConversationHistoryText(history);

  const contextualClassification = classifyAiIntent(
    `${recentContext}\nFOLLOW UP USER MESSAGE:\n${message}`
  );

  if (contextualClassification.intent !== "OUT_OF_SCOPE") {
    return {
      ...contextualClassification,
      reason: `contextual_${contextualClassification.reason}`
    };
  }

  if (recentFinancialIntent) {
    return {
      intent: recentFinancialIntent,
      confidence: "medium" as const,
      reason: "contextual_recent_financial_intent"
    };
  }

  return directClassification;
}
