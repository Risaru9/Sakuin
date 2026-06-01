import type { AiChatHistoryMessage } from "./ai.types.js";

function sanitizeChatHistory(history: AiChatHistoryMessage[] = []) {
  return history
    .filter((message) => {
      const content = message.content.trim();

      return (
        content.length > 0 &&
        (message.role === "user" || message.role === "assistant")
      );
    })
    .slice(-12)
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 600)
    }));
}

export function buildConversationHistoryText(
  history: AiChatHistoryMessage[] = []
) {
  const sanitizedHistory = sanitizeChatHistory(history);

  if (sanitizedHistory.length === 0) {
    return "Tidak ada konteks percakapan sebelumnya.";
  }

  return sanitizedHistory
    .map((message, index) => {
      const speaker = message.role === "user" ? "USER" : "ASSISTANT";

      return `${index + 1}. ${speaker}: ${message.content}`;
    })
    .join("\n");
}
