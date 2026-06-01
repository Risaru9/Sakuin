import { env } from "../../config/env.js";
import {
  createGeminiTextProvider,
  type AiTextProvider
} from "./ai.provider.js";
import { selectAiModelPlan } from "./ai-model-router.js";
import { buildRuleBasedTransactionDrafts } from "./ai-transaction-draft.js";
import { classifyAiChatMessage } from "./ai-chat-classifier.js";
import {
  canPersistAiChat,
  getPersistedChatContext,
  saveAssistantResponse,
  saveUserChatMessage,
  selectChatContext
} from "./ai-chat-persistence.js";
import {
  analyzeFinancialScenario,
  type FinancialScenarioAnalysis
} from "./ai-financial-scenario.js";
import {
  analyzePurchaseDecision,
  type PurchaseDecisionAnalysis
} from "./ai-purchase-decision.js";
import { getAiFinancialContext } from "./ai-financial-context.js";
import type {
  AiChatHistoryMessage,
  AiChatResponse,
  AiChatServiceInput
} from "./ai.types.js";
import {
  buildFinancialSystemInstruction,
  buildFinancialPrompt
} from "./ai-prompt-builder.js";
import {
  buildOutOfScopeResponse,
  buildTransactionDraftResponse,
  buildFinancialResponse,
  enrichResponseWithScenario,
  enrichResponseWithPurchaseDecision,
  normalizeAiReply
} from "./ai-response-builder.js";

export { generateWeeklyProactiveInsight } from "./ai-weekly-insight.js";
export {
  clearAiChatHistory,
  getAiChatHistory
} from "./ai-chat-persistence.js";

type AiChatServiceOptions = {
  provider?: AiTextProvider;
};

function logAiProviderEvent(
  event: "ai.provider_used" | "ai.provider_fallback",
  metadata: Record<string, unknown>
) {
  console.log(
    JSON.stringify({
      level: "info",
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    })
  );
}

async function enhanceFinancialResponseWithAi(input: {
  provider?: AiTextProvider;
  userMessage: string;
  intent: Exclude<typeof classifyAiChatMessage extends (...args: any[]) => { intent: infer I } ? I : any, "OUT_OF_SCOPE" | "TRANSACTION_DRAFT">;
  context: Awaited<ReturnType<typeof getAiFinancialContext>>;
  baseResponse: AiChatResponse;
  history?: AiChatHistoryMessage[];
  scenario?: FinancialScenarioAnalysis;
  purchaseDecision?: PurchaseDecisionAnalysis;
}) {
  if (env.NODE_ENV === "test" && !input.provider) {
    return input.baseResponse;
  }

  const modelPlan = selectAiModelPlan({
    intent: input.intent,
    userMessage: input.userMessage,
    history: input.history
  });

  const provider = input.provider ?? createGeminiTextProvider();

  async function generateWithModel(model: string) {
    const result = await provider.generateText({
      systemInstruction: buildFinancialSystemInstruction(),
      prompt: buildFinancialPrompt({
        userMessage: input.userMessage,
        intent: input.intent,
        context: input.context,
        baseResponse: input.baseResponse,
        history: input.history,
        scenario: input.scenario,
        purchaseDecision: input.purchaseDecision
      }),
      model,
      maxOutputTokens: modelPlan.maxOutputTokens,
      temperature: modelPlan.temperature
    });

    const aiReply = normalizeAiReply(result.text);

    if (!aiReply) {
      throw new Error("EmptyAiReply");
    }

    return {
      reply: aiReply,
      model: result.model
    };
  }

  try {
    const result = await generateWithModel(modelPlan.primaryModel);

    logAiProviderEvent("ai.provider_used", {
      intent: input.intent,
      route: modelPlan.route,
      reason: modelPlan.reason,
      model: result.model,
      fallback: false
    });

    return {
      ...input.baseResponse,
      reply: result.reply
    };
  } catch (primaryError) {
    const shouldTryFallback =
      modelPlan.fallbackModel &&
      modelPlan.fallbackModel !== modelPlan.primaryModel;

    logAiProviderEvent("ai.provider_fallback", {
      intent: input.intent,
      route: modelPlan.route,
      reason:
        primaryError instanceof Error
          ? primaryError.name
          : "UnknownAiProviderError",
      model: modelPlan.primaryModel,
      fallbackModel: shouldTryFallback ? modelPlan.fallbackModel : null
    });

    if (!shouldTryFallback) {
      return input.baseResponse;
    }

    try {
      const fallbackResult = await generateWithModel(modelPlan.fallbackModel);

      logAiProviderEvent("ai.provider_used", {
        intent: input.intent,
        route: "default",
        reason: "fallback_model_used",
        model: fallbackResult.model,
        fallback: true
      });

      return {
        ...input.baseResponse,
        reply: fallbackResult.reply
      };
    } catch (fallbackError) {
      logAiProviderEvent("ai.provider_fallback", {
        intent: input.intent,
        route: "default",
        reason:
          fallbackError instanceof Error
            ? fallbackError.name
            : "UnknownAiProviderFallbackError",
        model: modelPlan.fallbackModel,
        fallbackModel: null
      });

      return input.baseResponse;
    }
  }
}

export async function getAiChatResponse(
  input: AiChatServiceInput,
  options: AiChatServiceOptions = {}
): Promise<AiChatResponse & { id?: string }> {
  const normalizedMessage = input.message.trim();

  if (normalizedMessage.length === 0) {
    throw new Error("Pesan tidak boleh kosong");
  }

  const shouldSaveToDb = await canPersistAiChat(input.userId);
  const dbHistory = shouldSaveToDb
    ? await getPersistedChatContext(input.userId)
    : [];
  const contextHistory = selectChatContext({
    dbHistory,
    requestHistory: input.history
  });

  await saveUserChatMessage(input.userId, normalizedMessage, shouldSaveToDb);

  const classification = classifyAiChatMessage(
    normalizedMessage,
    contextHistory
  );

  if (classification.intent === "OUT_OF_SCOPE") {
    const response = buildOutOfScopeResponse();
    return saveAssistantResponse(input.userId, response, shouldSaveToDb);
  }

  if (classification.intent === "TRANSACTION_DRAFT") {
    const drafts = await buildRuleBasedTransactionDrafts({
      userId: input.userId,
      message: input.message
    });

    const response = buildTransactionDraftResponse(drafts);
    return saveAssistantResponse(input.userId, response, shouldSaveToDb);
  }

  const financialContext = await getAiFinancialContext(input.userId);
  const scenario = analyzeFinancialScenario(
    normalizedMessage,
    contextHistory
  );
  const purchaseDecision = analyzePurchaseDecision(
    normalizedMessage,
    financialContext,
    contextHistory
  );

  const baseResponse = enrichResponseWithPurchaseDecision(
    enrichResponseWithScenario(
      buildFinancialResponse(classification.intent, financialContext),
      scenario
    ),
    purchaseDecision
  );

  const finalResponse = await enhanceFinancialResponseWithAi({
    provider: options.provider,
    userMessage: normalizedMessage,
    intent: classification.intent,
    context: financialContext,
    baseResponse,
    history: contextHistory,
    scenario,
    purchaseDecision
  });

  return saveAssistantResponse(input.userId, finalResponse, shouldSaveToDb);
}
