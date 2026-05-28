import { apiRequest } from "../../lib/api-client";
import type { CreateRecurringRuleInput, RecurringRule } from "./recurring.types";

export function getRecurringRules() {
  return apiRequest<RecurringRule[]>("/api/recurring");
}

export function createRecurringRule(input: CreateRecurringRuleInput) {
  return apiRequest<RecurringRule>("/api/recurring", {
    method: "POST",
    body: input
  });
}

export function deleteRecurringRule(recurringRuleId: string) {
  return apiRequest<RecurringRule>(`/api/recurring/${recurringRuleId}`, {
    method: "DELETE"
  });
}

export function runDueRecurringRules() {
  return apiRequest<{ generatedCount: number; processedRuleCount: number }>(
    "/api/recurring/run-due",
    {
      method: "POST"
    }
  );
}
