import { apiRequest } from "../../lib/api-client";
import type { AiChatRequest, AiChatResponse } from "./ai.types";

export function sendAiChatMessage(input: AiChatRequest) {
  return apiRequest<AiChatResponse>("/api/ai/chat", {
    method: "POST",
    body: input
  });
}