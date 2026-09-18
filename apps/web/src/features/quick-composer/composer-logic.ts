import { getLocalDateKey } from "../../lib/daily-review";
import type { Category } from "../categories/category.types";
import {
  parseQuickTransactionInput,
  type QuickTransactionDraft
} from "../transactions/quick-transaction-parser";
import { toIsoDate } from "../transactions/transaction-date";
import type { CreateTransactionInput, TransactionType } from "../transactions/transaction.types";

/** Choices the user made in the detail sheet; they win over the parser's guess. */
export type ComposerOverrides = {
  type?: TransactionType;
  categoryId?: string;
  accountId?: string;
  dateKey?: string;
};

export type ComposerGuess = {
  drafts: QuickTransactionDraft[];
  /** Pieces of text without an amount (e.g. "beli sesuatu"). */
  skippedCount: number;
  isMultiple: boolean;
  type: TransactionType;
  dateKey: string;
  /** Present only for a single transaction. */
  category: Category | null;
  needsCheck: boolean;
  totalAmount: number;
};

function isOtherCategory(category: Category) {
  const name = category.name.toLowerCase();

  return name.includes("lain") || name.includes("other");
}

/** Category to use when the user flips the type and the old category no longer fits. */
export function pickFallbackCategory(categories: Category[], type: TransactionType) {
  const sameType = categories.filter((category) => category.type === type);

  return sameType.find(isOtherCategory) ?? sameType[0] ?? null;
}

function applyOverrides(
  draft: QuickTransactionDraft,
  categories: Category[],
  overrides: ComposerOverrides,
  allowCategoryOverride: boolean
): QuickTransactionDraft {
  const type = overrides.type ?? draft.type;
  const dateKey = overrides.dateKey ?? draft.date;

  let category =
    (allowCategoryOverride && overrides.categoryId
      ? categories.find((item) => item.id === overrides.categoryId && item.type === type)
      : undefined) ??
    categories.find((item) => item.id === draft.categoryId && item.type === type);

  if (!category) {
    category = pickFallbackCategory(categories, type) ?? undefined;
  }

  return {
    ...draft,
    type,
    date: dateKey,
    categoryId: category?.id ?? draft.categoryId,
    categoryName: category?.name ?? draft.categoryName
  };
}

export function buildComposerGuess({
  input,
  categories,
  todayKey,
  overrides = {}
}: {
  input: string;
  categories: Category[];
  todayKey: string;
  overrides?: ComposerOverrides;
}): ComposerGuess | null {
  if (!input.trim() || categories.length === 0) {
    return null;
  }

  const parsed = parseQuickTransactionInput({
    input,
    categories,
    defaultDate: overrides.dateKey ?? todayKey
  });

  if (parsed.drafts.length === 0) {
    return null;
  }

  const isMultiple = parsed.drafts.length > 1;
  const drafts = parsed.drafts.map((draft) =>
    applyOverrides(draft, categories, overrides, !isMultiple)
  );
  const first = drafts[0];

  return {
    drafts,
    skippedCount: parsed.skippedItems.length,
    isMultiple,
    type: first.type,
    dateKey: first.date,
    category: isMultiple
      ? null
      : categories.find((category) => category.id === first.categoryId) ?? null,
    needsCheck:
      !overrides.categoryId && drafts.some((draft) => draft.confidence === "low"),
    totalAmount: drafts.reduce((total, draft) => total + Number(draft.amount), 0)
  };
}

export function toCreateTransactionInputs(
  drafts: QuickTransactionDraft[],
  accountId?: string
): CreateTransactionInput[] {
  return drafts.map((draft) => ({
    type: draft.type,
    amount: draft.amount,
    categoryId: draft.categoryId,
    ...(accountId ? { accountId } : {}),
    date: toIsoDate(draft.date),
    note: draft.note.trim()
  }));
}

export function shiftDateKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);

  return getLocalDateKey(new Date(year, month - 1, day + days));
}

const shortDateFormatter = new Intl.DateTimeFormat("id-ID", {
  day: "numeric",
  month: "short"
});

export function describeDateKey(dateKey: string, todayKey: string) {
  if (dateKey === todayKey) {
    return "Hari ini";
  }

  if (dateKey === shiftDateKey(todayKey, -1)) {
    return "Kemarin";
  }

  const [year, month, day] = dateKey.split("-").map(Number);

  return shortDateFormatter.format(new Date(year, month - 1, day));
}

const amountFormatter = new Intl.NumberFormat("id-ID", {
  maximumFractionDigits: 2
});

export function formatAmount(value: number | string) {
  return amountFormatter.format(Number(value));
}

export function formatSignedAmount(value: number | string, type: TransactionType) {
  return `${type === "INCOME" ? "+" : "−"}${formatAmount(value)}`;
}
