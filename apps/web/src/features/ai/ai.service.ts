import { apiRequest } from "../../lib/api-client";
import type { AiChatRequest, AiChatResponse, AiChatMessage } from "./ai.types";

export function sendAiChatMessage(input: AiChatRequest) {
  return apiRequest<AiChatResponse & { id?: string }>("/api/ai/chat", {
    method: "POST",
    body: input
  });
}

export function getAiChatHistory() {
  return apiRequest<AiChatMessage[]>("/api/ai/chat", {
    method: "GET"
  });
}

export function clearAiChatHistory() {
  return apiRequest<{ success: boolean }>("/api/ai/chat", {
    method: "DELETE"
  });
}