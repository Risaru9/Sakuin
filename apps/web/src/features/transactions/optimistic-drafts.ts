import type { Category } from "../categories/category.types";
import type { QuickTransactionDraft } from "./quick-transaction-parser";
import { toIsoDate } from "./transaction-date";
import type { Transaction, TransactionType } from "./transaction.types";

// Builds temporary transactions from parsed drafts so lists and totals update before the API answers.

function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function findCategoryByName(
  categories: Category[],
  type: TransactionType,
  categoryName: string
) {
  const normalizedCategoryName = normalizeCategoryName(categoryName).toLowerCase();

  return categories.find(
    (category) =>
      category.type === type &&
      category.name.toLowerCase() === normalizedCategoryName
  );
}

function createOptimisticTransactionId(index: number) {
  return `optimistic-quick-${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function createOptimisticCategoryId(index: number) {
  return `optimistic-category-${Date.now()}-${index}-${Math.random()
    .toString(36)
    .slice(2)}`;
}

function mapCategoryToTransactionCategory(category: Category) {
  return {
    id: category.id,
    name: category.name,
    type: category.type,
    icon: category.icon,
    color: category.color,
    isDefault: category.isDefault
  };
}

function resolveOptimisticTransactionCategory(input: {
  draft: QuickTransactionDraft;
  categories: Category[];
  index: number;
}): Transaction["category"] | null {
  const directCategory = input.categories.find(
    (category) =>
      category.id === input.draft.categoryId &&
      category.type === input.draft.type
  );

  if (directCategory) {
    return mapCategoryToTransactionCategory(directCategory);
  }

  const customCategoryName = normalizeCategoryName(
    input.draft.customCategoryName || input.draft.categoryName || ""
  );

  if (input.draft.saveAsNewCategory && customCategoryName) {
    return {
      id: createOptimisticCategoryId(input.index),
      name: customCategoryName,
      type: input.draft.type,
      icon: null,
      color: null,
      isDefault: false
    };
  }

  const categoryName = normalizeCategoryName(input.draft.categoryName || "");

  if (categoryName) {
    const categoryByName = findCategoryByName(
      input.categories,
      input.draft.type,
      categoryName
    );

    if (categoryByName) {
      return mapCategoryToTransactionCategory(categoryByName);
    }
  }

  return null;
}

function buildOptimisticTransactionFromDraft(input: {
  draft: QuickTransactionDraft;
  categories: Category[];
  index: number;
}): Transaction | null {
  const category = resolveOptimisticTransactionCategory(input);

  if (!category) {
    return null;
  }

  const now = new Date(Date.now() + input.index).toISOString();

  return {
    id: createOptimisticTransactionId(input.index),
    type: input.draft.type,
    amount: input.draft.amount.trim(),
    categoryId: category.id,
    category,
    date: toIsoDate(input.draft.date),
    note: input.draft.note.trim() || null,
    createdAt: now,
    updatedAt: now
  };
}

export function buildOptimisticTransactionsFromDrafts(input: {
  drafts: QuickTransactionDraft[];
  categories: Category[];
}) {
  return input.drafts
    .map((draft, index) =>
      buildOptimisticTransactionFromDraft({
        draft,
        categories: input.categories,
        index
      })
    )
    .filter((transaction): transaction is Transaction => Boolean(transaction));
}
