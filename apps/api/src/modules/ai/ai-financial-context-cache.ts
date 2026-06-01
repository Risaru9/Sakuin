import type { AiFinancialContext } from "./ai-financial-context.js";

const financialContextCache = new Map<string, AiFinancialContext>();
let bypassTestCheck = false;

export function setBypassTestCheck(value: boolean): void {
  bypassTestCheck = value;
}

export function getCachedFinancialContext(userId: string): AiFinancialContext | null {
  if (process.env.NODE_ENV === "test" && !bypassTestCheck) {
    return null;
  }
  return financialContextCache.get(userId) ?? null;
}

export function setCachedFinancialContext(userId: string, context: AiFinancialContext): void {
  if (process.env.NODE_ENV === "test" && !bypassTestCheck) {
    return;
  }
  financialContextCache.set(userId, context);
}

export function invalidateCachedFinancialContext(userId: string): void {
  financialContextCache.delete(userId);
  console.log(`[FinancialContextCache] Cache invalidated for user: ${userId}`);
}

export function clearAllFinancialContextCaches(): void {
  financialContextCache.clear();
}

