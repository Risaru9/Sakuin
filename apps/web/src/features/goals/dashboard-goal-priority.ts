const DASHBOARD_PRIORITY_GOAL_ID_KEY = "sakuin_dashboard_priority_goal_id";

function canUseLocalStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function getDashboardPriorityGoalId() {
  if (!canUseLocalStorage()) {
    return null;
  }

  try {
    return window.localStorage.getItem(DASHBOARD_PRIORITY_GOAL_ID_KEY);
  } catch {
    return null;
  }
}

export function setDashboardPriorityGoalId(goalId: string) {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.setItem(DASHBOARD_PRIORITY_GOAL_ID_KEY, goalId);
  } catch {
    // Abaikan error localStorage agar UI tetap berjalan.
  }
}

export function clearDashboardPriorityGoalId() {
  if (!canUseLocalStorage()) {
    return;
  }

  try {
    window.localStorage.removeItem(DASHBOARD_PRIORITY_GOAL_ID_KEY);
  } catch {
    // Abaikan error localStorage agar UI tetap berjalan.
  }
}