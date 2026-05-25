const DAILY_REVIEW_STORAGE_PREFIX = "sakuin_daily_review_completed_v1";

export function getLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function getDailyReviewStorageKey(userId: string | null | undefined) {
  return `${DAILY_REVIEW_STORAGE_PREFIX}:${userId ?? "anonymous"}`;
}

export function getStoredDailyReviewDate(storageKey: string) {
  try {
    return localStorage.getItem(storageKey);
  } catch {
    return null;
  }
}

export function setStoredDailyReviewDate(storageKey: string, dateKey: string) {
  try {
    localStorage.setItem(storageKey, dateKey);
  } catch {
    // localStorage can be unavailable in restricted browser modes.
  }
}

export function isDailyReviewCompletedToday(userId: string | null | undefined) {
  const storageKey = getDailyReviewStorageKey(userId);

  return getStoredDailyReviewDate(storageKey) === getLocalDateKey();
}
