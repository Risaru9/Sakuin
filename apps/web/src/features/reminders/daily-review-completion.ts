import { getActiveAccountScope } from "../../lib/auth-storage";
import {
  getDailyReviewStorageKey,
  getLocalDateKey,
  setStoredDailyReviewDate
} from "../../lib/daily-review";
import { completeRemoteDailyReview } from "./reminder.service";

/**
 * Marks today as reviewed after the user records something, so neither the local nor the
 * server reminder nags about an already-filled day.
 */
export function markTodayReviewed() {
  const todayKey = getLocalDateKey();

  setStoredDailyReviewDate(getDailyReviewStorageKey(getActiveAccountScope()), todayKey);
  window.dispatchEvent(new Event("sakuin:daily-review-completed"));
  completeRemoteDailyReview(todayKey).catch(() => {
    // The local flag already stops today's reminder; the server copy is best effort.
  });
}
