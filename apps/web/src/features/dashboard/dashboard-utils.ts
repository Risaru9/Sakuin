import { ApiClientError } from "../../lib/api-client";
import type { Goal } from "../goals/goal.types";

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

export function getGoalProgress(goal: Goal) {
  const targetAmount = toNumber(goal.targetAmount);
  const currentAmount = toNumber(goal.currentAmount);

  if (targetAmount <= 0) {
    return 0;
  }

  return Math.min(100, Math.round((currentAmount / targetAmount) * 100));
}
