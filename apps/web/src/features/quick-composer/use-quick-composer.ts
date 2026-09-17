import { useCallback, useMemo, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { showSnack } from "../../components/saku";
import { useToast } from "../../components/toast/ToastProvider";
import { ApiClientError } from "../../lib/api-client";
import { removeFromOfflineQueue } from "../../lib/offline-queue";
import { queryKeys } from "../../lib/query-keys";
import { markTodayReviewed } from "../reminders/daily-review-completion";
import { buildOptimisticTransactionsFromDrafts } from "../transactions/optimistic-drafts";
import type { QuickTransactionDraft } from "../transactions/quick-transaction-parser";
import {
  addTransactionsToListCaches,
  addTransactionsToSummaryCache,
  getSummaryCacheSnapshot,
  getTransactionListCacheSnapshot,
  markTransactionDerivedDataStale,
  removeTransactionFromListCaches,
  removeTransactionFromSummaryCache,
  restoreSummaryCacheSnapshot,
  restoreTransactionListCacheSnapshot
} from "../transactions/transaction-cache";
import { getTodayInputValue } from "../transactions/transaction-date";
import { createTransactionsBulk, deleteTransaction } from "../transactions/transaction.service";
import type { Transaction, TransactionType } from "../transactions/transaction.types";
import { useReferenceData } from "../transactions/use-reference-data";
import {
  buildComposerGuess,
  formatAmount,
  formatSignedAmount,
  toCreateTransactionInputs,
  type ComposerOverrides
} from "./composer-logic";

export type ComposerHint = {
  message: string;
  canRetry: boolean;
};

type SavedMessage = {
  title: string;
  detail: string;
  offline: boolean;
};

type SaveVariables = {
  drafts: QuickTransactionDraft[];
  accountId?: string;
  sourceText: string;
};

function isOfflineTransaction(transaction: Transaction) {
  return transaction.id.startsWith("offline-");
}

function buildSavedMessage(saved: Transaction[], drafts: QuickTransactionDraft[]): SavedMessage {
  const offline = saved.some(isOfflineTransaction);

  if (offline) {
    return {
      title: "Tersimpan di HP dulu",
      detail: "Otomatis dikirim begitu ada sinyal.",
      offline
    };
  }

  if (drafts.length > 1) {
    const total = drafts.reduce((sum, draft) => sum + Number(draft.amount), 0);

    return {
      title: `Yay, ${drafts.length} transaksi tercatat!`,
      detail: `Total ${formatAmount(total)}`,
      offline
    };
  }

  const [draft] = drafts;

  return {
    title: `Yay, ${draft.note.toLowerCase()} tercatat!`,
    detail: `${draft.categoryName} · ${formatSignedAmount(draft.amount, draft.type)}`,
    offline
  };
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function useQuickComposer() {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  const { categories, accounts, categoriesQuery } = useReferenceData();

  const [text, setText] = useState("");
  const [overrides, setOverrides] = useState<ComposerOverrides>({});
  const [hint, setHint] = useState<ComposerHint | null>(null);

  const todayKey = getTodayInputValue();

  const guess = useMemo(
    () => buildComposerGuess({ input: text, categories, todayKey, overrides }),
    [text, categories, todayKey, overrides]
  );

  // The API files transactions without an account under the first (default) account.
  const selectedAccount =
    accounts.find((account) => account.id === overrides.accountId) ?? accounts[0] ?? null;

  const saveMutation = useMutation({
    mutationFn: ({ drafts, accountId }: SaveVariables) =>
      createTransactionsBulk({ transactions: toCreateTransactionInputs(drafts, accountId) }),

    onMutate: async ({ drafts }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

      const previousTransactionQueries = getTransactionListCacheSnapshot(queryClient);
      const previousSummary = getSummaryCacheSnapshot(queryClient);
      const optimisticTransactions = buildOptimisticTransactionsFromDrafts({ drafts, categories });

      addTransactionsToListCaches(queryClient, optimisticTransactions);
      addTransactionsToSummaryCache(queryClient, optimisticTransactions);

      return {
        previousTransactionQueries,
        previousSummary,
        optimisticTransactionIds: optimisticTransactions.map((transaction) => transaction.id)
      };
    },

    onSuccess: (saved, { drafts }, context) => {
      for (const optimisticId of context?.optimisticTransactionIds ?? []) {
        removeTransactionFromListCaches(queryClient, optimisticId);
      }

      restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);
      addTransactionsToListCaches(queryClient, saved);
      addTransactionsToSummaryCache(queryClient, saved);
      markTransactionDerivedDataStale(queryClient);

      const message = buildSavedMessage(saved, drafts);

      if (!message.offline) {
        markTodayReviewed();
      }

      showSnack({
        ...message,
        mood: message.offline ? "worried" : "wow",
        actionLabel: "Batalkan",
        onAction: () => undoMutation.mutate(saved),
        highlightIds: saved.map((transaction) => transaction.id)
      });
    },

    onError: (error, { sourceText }, context) => {
      restoreTransactionListCacheSnapshot(queryClient, context?.previousTransactionQueries);
      restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);
      // Give the text back so nothing typed is lost, unless the user already started a new entry.
      setText((current) => current || sourceText);
      addToast({
        variant: "error",
        title: "Catatan belum tersimpan",
        description: getErrorMessage(error)
      });
    }
  });

  const undoMutation = useMutation({
    mutationFn: async (transactions: Transaction[]) => {
      for (const transaction of transactions) {
        if (isOfflineTransaction(transaction)) {
          removeFromOfflineQueue(transaction.id);
        } else {
          await deleteTransaction(transaction.id);
        }
      }
    },

    onMutate: (transactions) => {
      for (const transaction of transactions) {
        removeTransactionFromListCaches(queryClient, transaction.id);
        removeTransactionFromSummaryCache(queryClient, transaction);
      }
    },

    onSettled: () => {
      markTransactionDerivedDataStale(queryClient);
    },

    onError: (error) => {
      addToast({
        variant: "error",
        title: "Gagal membatalkan",
        description: getErrorMessage(error)
      });
    }
  });

  const changeText = useCallback((value: string) => {
    setText(value);
    setHint(null);
  }, []);

  function updateOverrides(patch: ComposerOverrides) {
    setOverrides((current) => ({ ...current, ...patch }));
  }

  function toggleType() {
    const nextType: TransactionType = guess?.type === "INCOME" ? "EXPENSE" : "INCOME";
    // The previous category belongs to the old type, so let the guess pick a new one.
    setOverrides((current) => ({ ...current, type: nextType, categoryId: undefined }));
  }

  function submit() {
    if (!text.trim()) {
      return false;
    }

    if (categoriesQuery.isLoading) {
      setHint({ message: "Sebentar, kategori sedang dimuat.", canRetry: false });
      return false;
    }

    if (!guess) {
      setHint(
        categoriesQuery.isError
          ? { message: "Kategori gagal dimuat. Periksa koneksi lalu coba lagi.", canRetry: true }
          : { message: "Tambahkan nominal, misalnya kopi 18rb.", canRetry: false }
      );
      return false;
    }

    saveMutation.mutate({
      drafts: guess.drafts,
      accountId: overrides.accountId,
      sourceText: text
    });

    setText("");
    setHint(null);
    // Keep the chosen account for the next entry; reset the per-entry choices.
    setOverrides((current) => ({ accountId: current.accountId }));
    return true;
  }

  return {
    text,
    changeText,
    guess,
    hint,
    todayKey,
    categories,
    accounts,
    selectedAccount,
    overrides,
    updateOverrides,
    toggleType,
    submit,
    retryCategories: () => void categoriesQuery.refetch()
  };
}
