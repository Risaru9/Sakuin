import { prisma } from "../../db/prisma.js";
import type {
  AiChatHistoryMessage,
  AiChatResponse
} from "./ai.types.js";

export async function canPersistAiChat(userId: string) {
  const userRecord = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true }
  });

  return Boolean(userRecord);
}

export async function getPersistedChatContext(
  userId: string
): Promise<AiChatHistoryMessage[]> {
  const dbHistory = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 12
  });

  return dbHistory
    .reverse()
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content
    }));
}

export function selectChatContext(input: {
  dbHistory: AiChatHistoryMessage[];
  requestHistory?: AiChatHistoryMessage[];
}) {
  if (input.dbHistory.length === 0) {
    return input.requestHistory ?? [];
  }

  if (
    input.requestHistory &&
    input.requestHistory.length > input.dbHistory.length
  ) {
    return input.requestHistory;
  }

  return input.dbHistory;
}

export async function saveUserChatMessage(
  userId: string,
  content: string,
  shouldSaveToDb: boolean
) {
  if (!shouldSaveToDb) {
    return;
  }

  await prisma.chatMessage.create({
    data: {
      userId,
      role: "user",
      content
    }
  });
}

export async function saveAssistantResponse(
  userId: string,
  response: AiChatResponse,
  shouldSaveToDb: boolean
): Promise<AiChatResponse & { id?: string }> {
  if (!shouldSaveToDb) {
    return response;
  }

  const assistantMessage = await prisma.chatMessage.create({
    data: {
      userId,
      role: "assistant",
      content: response.reply,
      intent: response.intent,
      cards: response.cards ? (response.cards as any) : undefined,
      suggestions: response.suggestions ? (response.suggestions as any) : undefined,
      transactionDraft: response.transactionDraft
        ? (response.transactionDraft as any)
        : undefined,
      transactionDrafts: response.transactionDrafts
        ? (response.transactionDrafts as any)
        : undefined
    }
  });

  return {
    ...response,
    id: assistantMessage.id
  };
}

export async function getAiChatHistory(userId: string) {
  const messages = await prisma.chatMessage.findMany({
    where: { userId },
    orderBy: { createdAt: "asc" },
    take: 80
  });

  return messages.map((message) => ({
    id: message.id,
    role: message.role as "user" | "assistant",
    content: message.content,
    intent: message.intent ?? undefined,
    cards: message.cards ? (message.cards as any) : undefined,
    suggestions: message.suggestions ? (message.suggestions as any) : undefined,
    transactionDraft: message.transactionDraft
      ? (message.transactionDraft as any)
      : undefined,
    transactionDrafts: message.transactionDrafts
      ? (message.transactionDrafts as any)
      : undefined,
    createdAt: message.createdAt.toISOString()
  }));
}

export async function clearAiChatHistory(userId: string): Promise<void> {
  await prisma.chatMessage.deleteMany({
    where: { userId }
  });
}
