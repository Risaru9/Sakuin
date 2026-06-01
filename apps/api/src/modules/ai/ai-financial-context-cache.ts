import type { AiFinancialContext } from "./ai-financial-context.js";

const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000;
const MAX_CACHE_ENTRIES = 500;

type FinancialContextCacheEntry = {
  context: AiFinancialContext;
  expiresAt: number;
  periodKey: string;
};

type SetCachedFinancialContextOptions = {
  ttlMs?: number;
};

const financialContextCache = new Map<string, FinancialContextCacheEntry>();
let bypassTestCheck = false;

export function setBypassTestCheck(value: boolean): void {
  bypassTestCheck = value;
}

function getPeriodKey(referenceDate: Date) {
  return referenceDate.toISOString().slice(0, 10);
}

function pruneOldestCacheEntry() {
  if (financialContextCache.size < MAX_CACHE_ENTRIES) {
    return;
  }

  const oldestKey = financialContextCache.keys().next().value;

  if (oldestKey) {
    financialContextCache.delete(oldestKey);
  }
}

export function getCachedFinancialContext(
  userId: string,
  referenceDate = new Date()
): AiFinancialContext | null {
  if (process.env.NODE_ENV === "test" && !bypassTestCheck) {
    return null;
  }

  const entry = financialContextCache.get(userId);

  if (
    !entry ||
    entry.expiresAt <= Date.now() ||
    entry.periodKey !== getPeriodKey(referenceDate)
  ) {
    if (entry) {
      financialContextCache.delete(userId);
    }

    return null;
  }

  return entry.context;
}

export function setCachedFinancialContext(
  userId: string,
  context: AiFinancialContext,
  referenceDate = new Date(),
  options: SetCachedFinancialContextOptions = {}
): void {
  if (process.env.NODE_ENV === "test" && !bypassTestCheck) {
    return;
  }

  if (!financialContextCache.has(userId)) {
    pruneOldestCacheEntry();
  }
  financialContextCache.set(userId, {
    context,
    expiresAt: Date.now() + (options.ttlMs ?? DEFAULT_CACHE_TTL_MS),
    periodKey: getPeriodKey(referenceDate)
  });
}

export function invalidateCachedFinancialContext(userId: string): void {
  financialContextCache.delete(userId);
  console.log(
    JSON.stringify({
      level: "info",
      event: "ai.financial_context_cache_invalidated"
    })
  );
}

export function clearAllFinancialContextCaches(): void {
  financialContextCache.clear();
}
