import { HttpError } from "../../utils/http-error.js";
import { getCategoriesService } from "../categories/category.service.js";
import {
  DEFAULT_TZ_OFFSET_MINUTES,
  localDateKey,
  localDayStart
} from "../summary/glance-copy.js";
import {
  getBudgetAlerts,
  getTodayExpense,
  type BudgetAlert
} from "../summary/glance.service.js";
import { parseQuickTransactionInput } from "./quick-transaction-parser.js";
import { createTransactionsBulk } from "./transaction.service.js";
import type { QuickTransactionInput, TransactionResponse } from "./transaction.types.js";

const MAX_NOTE_LENGTH = 255;

export type QuickTransactionResult = {
  transactions: TransactionResponse[];
  budgetAlerts: BudgetAlert[];
  todayExpense: number;
  /** Pieces of text without an amount, e.g. "beli sesuatu". */
  skippedCount: number;
};

/**
 * Saves a typed line the way the in-app composer does: the same parser guesses the type and
 * category, and the entry goes to the default account on the given local day.
 */
export async function createQuickTransactions(
  userId: string,
  input: QuickTransactionInput
): Promise<QuickTransactionResult> {
  const tzOffsetMinutes = input.tzOffsetMinutes ?? DEFAULT_TZ_OFFSET_MINUTES;
  const categories = await getCategoriesService({ userId });
  const parsed = parseQuickTransactionInput({
    input: input.text,
    categories,
    defaultDate: input.date ?? localDateKey(new Date(), tzOffsetMinutes)
  });

  if (parsed.drafts.length === 0) {
    throw new HttpError("Nominalnya belum ketemu. Coba tulis seperti: kopi 18rb", 400);
  }

  const transactions = await createTransactionsBulk(userId, {
    transactions: parsed.drafts.map((draft) => ({
      type: draft.type,
      amount: draft.amount,
      categoryId: draft.categoryId,
      date: localDayStart(draft.date, tzOffsetMinutes),
      note: draft.note.trim().slice(0, MAX_NOTE_LENGTH) || undefined
    }))
  }, input.requestId);

  const [budgetAlerts, todayExpense] = await Promise.all([
    getBudgetAlerts(
      userId,
      transactions.map((transaction) => transaction.id),
      tzOffsetMinutes
    ),
    getTodayExpense(userId, tzOffsetMinutes)
  ]);

  return {
    transactions,
    budgetAlerts,
    todayExpense,
    skippedCount: parsed.skippedItems.length
  };
}
