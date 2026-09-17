import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dismissSnack, showSnack } from "../../components/saku";
import { useToast } from "../../components/toast/ToastProvider";
import { ApiClientError } from "../../lib/api-client";
import { addToOfflineQueue, removeFromOfflineQueue } from "../../lib/offline-queue";
import { queryKeys } from "../../lib/query-keys";
import type { FinanceAccount } from "../accounts/account.types";
import type { Category } from "../categories/category.types";
import { formatSignedAmount } from "../quick-composer/composer-logic";
import {
  addTransactionToListCaches,
  addTransactionToSummaryCache,
  getSummaryCacheSnapshot,
  getTransactionListCacheSnapshot,
  markTransactionDerivedDataStale,
  removeTransactionFromListCaches,
  removeTransactionFromSummaryCache,
  restoreSummaryCacheSnapshot,
  restoreTransactionListCacheSnapshot,
  updateTransactionInListCaches,
  updateTransactionInSummaryCache
} from "../transactions/transaction-cache";
import {
  createTransaction,
  deleteTransaction,
  updateTransaction
} from "../transactions/transaction.service";
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType
} from "../transactions/transaction.types";
import { isPendingTransaction } from "./beranda-data";

export type TransactionEdit = {
  note: string | null;
  amount: string;
  type: TransactionType;
  categoryId: string;
  /** Only set when the user picked another account. */
  accountId?: string;
  /** ISO date; only set when the user picked another day. */
  date?: string;
};

type UpdateVariables = {
  transaction: Transaction;
  edit: TransactionEdit;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError || error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function getTransactionName(transaction: Transaction) {
  return transaction.note?.trim() || transaction.category.name;
}

function describeForSnack(transaction: Transaction) {
  return `${transaction.category.name} · ${formatSignedAmount(transaction.amount, transaction.type)}`;
}

function applyEdit(
  transaction: Transaction,
  edit: TransactionEdit,
  categories: Category[],
  accounts: FinanceAccount[]
): Transaction {
  const category = categories.find((item) => item.id === edit.categoryId);
  const account = edit.accountId
    ? accounts.find((item) => item.id === edit.accountId)
    : undefined;

  return {
    ...transaction,
    type: edit.type,
    amount: edit.amount,
    note: edit.note,
    date: edit.date ?? transaction.date,
    categoryId: edit.categoryId,
    category: category
      ? {
          id: category.id,
          name: category.name,
          type: category.type,
          icon: category.icon,
          color: category.color,
          isDefault: category.isDefault
        }
      : transaction.category,
    account: account
      ? { id: account.id, name: account.name, type: account.type, icon: account.icon, color: account.color }
      : transaction.account ?? null,
    updatedAt: new Date().toISOString()
  };
}

function toCreateInput(transaction: Transaction): CreateTransactionInput {
  return {
    type: transaction.type,
    amount: String(Number(transaction.amount)),
    categoryId: transaction.categoryId || transaction.category.id,
    ...(transaction.account?.id ? { accountId: transaction.account.id } : {}),
    date: transaction.date,
    ...(transaction.note ? { note: transaction.note } : {})
  };
}

/** Edit, delete and undo-delete for rows in the Beranda and search lists. */
export function useTransactionActions({
  categories,
  accounts
}: {
  categories: Category[];
  accounts: FinanceAccount[];
}) {
  const queryClient = useQueryClient();
  const { addToast } = useToast();

  async function snapshotCaches() {
    await queryClient.cancelQueries({ queryKey: queryKeys.transactions.all });

    return {
      previousLists: getTransactionListCacheSnapshot(queryClient),
      previousSummary: getSummaryCacheSnapshot(queryClient)
    };
  }

  function restoreCaches(
    context: Awaited<ReturnType<typeof snapshotCaches>> | undefined
  ) {
    restoreTransactionListCacheSnapshot(queryClient, context?.previousLists);
    restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);
  }

  const updateMutation = useMutation({
    mutationFn: ({ transaction, edit }: UpdateVariables) =>
      updateTransaction(transaction.id, {
        type: edit.type,
        amount: edit.amount,
        categoryId: edit.categoryId,
        // The API stores an empty note as null.
        note: edit.note ?? "",
        ...(edit.accountId ? { accountId: edit.accountId } : {}),
        ...(edit.date ? { date: edit.date } : {})
      }),

    onMutate: async ({ transaction, edit }) => {
      const context = await snapshotCaches();
      const next = applyEdit(transaction, edit, categories, accounts);

      updateTransactionInListCaches(queryClient, next);
      updateTransactionInSummaryCache(queryClient, {
        previousTransaction: transaction,
        nextTransaction: next
      });

      return context;
    },

    onSuccess: (saved) => {
      updateTransactionInListCaches(queryClient, saved);
      showSnack({
        title: "Perubahan tersimpan",
        detail: `${getTransactionName(saved)} · ${formatSignedAmount(saved.amount, saved.type)}`,
        mood: "happy",
        highlightIds: [saved.id],
        highlightTag: "Diubah"
      });
    },

    onError: (error, _variables, context) => {
      restoreCaches(context);
      addToast({
        variant: "error",
        title: "Perubahan belum tersimpan",
        description: getErrorMessage(error)
      });
    },

    onSettled: () => markTransactionDerivedDataStale(queryClient)
  });

  const restoreMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (isPendingTransaction(transaction)) {
        addToOfflineQueue(toCreateInput(transaction));
        return null;
      }

      return createTransaction(toCreateInput(transaction));
    },

    onMutate: (transaction) => {
      if (!isPendingTransaction(transaction)) {
        addTransactionToListCaches(queryClient, transaction);
        addTransactionToSummaryCache(queryClient, transaction);
      }
    },

    onSuccess: (saved, transaction) => {
      if (!saved) {
        return;
      }

      // Same amounts as the optimistic row, so only the list needs the new id.
      removeTransactionFromListCaches(queryClient, transaction.id);
      addTransactionToListCaches(queryClient, saved);
    },

    onError: (error, transaction) => {
      removeTransactionFromListCaches(queryClient, transaction.id);
      removeTransactionFromSummaryCache(queryClient, transaction);
      addToast({
        variant: "error",
        title: "Catatan belum kembali",
        description: getErrorMessage(error)
      });
    },

    onSettled: () => markTransactionDerivedDataStale(queryClient)
  });

  const deleteMutation = useMutation({
    mutationFn: async (transaction: Transaction) => {
      if (isPendingTransaction(transaction)) {
        removeFromOfflineQueue(transaction.id);
        return;
      }

      await deleteTransaction(transaction.id);
    },

    onMutate: async (transaction) => {
      const context = await snapshotCaches();

      removeTransactionFromListCaches(queryClient, transaction.id);
      removeTransactionFromSummaryCache(queryClient, transaction);
      showSnack({
        title: `${getTransactionName(transaction)} dihapus`,
        detail: describeForSnack(transaction),
        mood: "worried",
        actionLabel: "Batalkan",
        onAction: () => restoreMutation.mutate(transaction)
      });

      return context;
    },

    onError: (error, _transaction, context) => {
      restoreCaches(context);
      dismissSnack();
      addToast({
        variant: "error",
        title: "Catatan belum terhapus",
        description: getErrorMessage(error)
      });
    },

    onSettled: () => markTransactionDerivedDataStale(queryClient)
  });

  return {
    updateTransaction: (transaction: Transaction, edit: TransactionEdit) =>
      updateMutation.mutate({ transaction, edit }),
    deleteTransaction: (transaction: Transaction) => deleteMutation.mutate(transaction)
  };
}
