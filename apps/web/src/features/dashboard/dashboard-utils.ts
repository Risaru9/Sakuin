import { ApiClientError } from "../../lib/api-client";
import type { Goal } from "../goals/goal.types";
import type { FinancialCheckupData, MonthlyTrendItem } from "../summary/summary.types";

export function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan.";
}

export function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

export function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

export function formatCompactRupiah(value: string | number | null | undefined) {
  const numberValue = toNumber(value);

  if (numberValue >= 1_000_000) {
    return `Rp ${(numberValue / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1
    })} jt`;
  }

  if (numberValue >= 1_000) {
    return `Rp ${(numberValue / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 0
    })} rb`;
  }

  return formatRupiah(numberValue);
}

export function formatFinancialCheckupStatus(
  status: FinancialCheckupData["status"]
) {
  if (status === "GOOD") {
    return "Baik";
  }

  if (status === "WATCH") {
    return "Waspada";
  }

  if (status === "RISK") {
    return "Berisiko";
  }

  return "Belum lengkap";
}

export function getFinancialCheckupStatusStyle(
  status: FinancialCheckupData["status"]
) {
  if (status === "GOOD") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-emerald-100 text-emerald-700 ring-emerald-200",
      icon: "bg-emerald-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "WATCH") {
    return {
      card: "border-[var(--sakuin-border)] bg-white",
      badge: "bg-amber-100 text-amber-800 ring-amber-200",
      icon: "bg-[var(--sakuin-amber)] text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  if (status === "RISK") {
    return {
      card: "border-rose-200 bg-white",
      badge: "bg-rose-100 text-rose-700 ring-rose-200",
      icon: "bg-rose-600 text-white",
      text: "text-[var(--sakuin-text)]",
      muted: "text-zinc-600"
    };
  }

  return {
    card: "border-[var(--sakuin-border)] bg-white",
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    icon: "bg-slate-700 text-white",
    text: "text-[var(--sakuin-text)]",
    muted: "text-zinc-600"
  };
}

export function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function formatGoalDeadline(value: string | null) {
  if (!value) {
    return "Tanpa deadline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanpa deadline";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function getMonthLabel(value: string) {
  const date = new Date(`${value}-01T00:00:00.000Z`);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("id-ID", {
    month: "short"
  }).format(date);
}

export function getGoalProgress(goal: Goal) {
  const targetAmount = toNumber(goal.targetAmount);
  const currentAmount = toNumber(goal.currentAmount);

  if (targetAmount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}

export function getPriorityGoal(goals: Goal[], priorityGoalId: string | null) {
  if (goals.length === 0) {
    return null;
  }

  if (priorityGoalId) {
    const selectedGoal = goals.find((goal) => goal.id === priorityGoalId);

    if (selectedGoal) {
      return selectedGoal;
    }
  }

  const unfinishedGoals = goals.filter((goal) => getGoalProgress(goal) < 100);
  const candidateGoals = unfinishedGoals.length > 0 ? unfinishedGoals : goals;

  return [...candidateGoals].sort((firstGoal, secondGoal) => {
    const firstDeadline = firstGoal.deadline
      ? new Date(firstGoal.deadline).getTime()
      : Number.POSITIVE_INFINITY;

    const secondDeadline = secondGoal.deadline
      ? new Date(secondGoal.deadline).getTime()
      : Number.POSITIVE_INFINITY;

    if (firstDeadline !== secondDeadline) {
      return firstDeadline - secondDeadline;
    }

    return getGoalProgress(secondGoal) - getGoalProgress(firstGoal);
  })[0];
}

export function getMonthNet(item: MonthlyTrendItem) {
  return toNumber(item.income) - toNumber(item.expense);
}
