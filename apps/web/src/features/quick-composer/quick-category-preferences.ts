import { getActiveAccountScope } from "../../lib/auth-storage";

const QUICK_CATEGORY_PREFERENCES_PREFIX = "sakuin_quick_categories_v1";

function getStorageKey() {
  return `${QUICK_CATEGORY_PREFERENCES_PREFIX}:${getActiveAccountScope() ?? "guest"}`;
}

export function getQuickCategoryIds() {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const stored = window.localStorage.getItem(getStorageKey());
    const parsed: unknown = stored ? JSON.parse(stored) : null;

    return Array.isArray(parsed) && parsed.every((value) => typeof value === "string") ? parsed : [];
  } catch {
    return [];
  }
}

export function saveQuickCategoryIds(categoryIds: string[]) {
  if (typeof window === "undefined") {
    return;
  }

  try {
    window.localStorage.setItem(getStorageKey(), JSON.stringify(categoryIds));
  } catch {
    // A private/restricted browser can disable localStorage. The buttons still work for this render.
  }
}
