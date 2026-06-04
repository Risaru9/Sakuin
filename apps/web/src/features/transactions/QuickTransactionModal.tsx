import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  Pencil,
  Sparkles,
  Trash2,
  X
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { ApiClientError } from "../../lib/api-client";
import { useLockBodyScroll } from "../../hooks/use-lock-body-scroll";
import { queryKeys } from "../../lib/query-keys";
import {
  createCategory,
  getCategories
} from "../categories/category.service";
import type { Category } from "../categories/category.types";
import { createTransactionsBulk } from "./transaction.service";
import {
  addTransactionsToListCaches,
  addTransactionsToSummaryCache,
  getSummaryCacheSnapshot,
  getTransactionListCacheSnapshot,
  markTransactionDerivedDataStale,
  removeTransactionFromListCaches,
  restoreSummaryCacheSnapshot,
  restoreTransactionListCacheSnapshot
} from "./transaction-cache";
import {
  parseQuickTransactionInput,
  type QuickTransactionDraft,
  type QuickTransactionSkippedItem
} from "./quick-transaction-parser";
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType
} from "./transaction.types";
import { useToast } from "../../components/toast/ToastProvider";
import { buildTransactionSuccessInsight } from "./transaction-success-insight";
import { getTodayInputValue, toIsoDate } from "./transaction-date";

const MIN_TRANSACTION_AMOUNT = 1;
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
const MAX_CATEGORY_NAME_LENGTH = 50;
const QUICK_TRANSACTION_EXAMPLES = [
  "makan siang 15000",
  "bensin 30000",
  "kopi 18000",
  "uang dari kakak 100000"
];

type QuickTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
  initialText?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal menyimpan transaksi cepat.";
}

function normalizeCategoryName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

function isOtherCategory(category: Category | undefined) {
  if (!category) {
    return false;
  }

  const normalizedName = category.name.toLowerCase();

  return normalizedName.includes("lain") || normalizedName.includes("other");
}

function sortCategoryOptions(categories: Category[]) {
  return categories
    .map((category, index) => ({
      category,
      index
    }))
    .sort((firstItem, secondItem) => {
      const firstIsOther = isOtherCategory(firstItem.category);
      const secondIsOther = isOtherCategory(secondItem.category);

      if (firstIsOther !== secondIsOther) {
        return firstIsOther ? 1 : -1;
      }

      return firstItem.index - secondItem.index;
    })
    .map((item) => item.category);
}

function findCategoryByName(
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

function buildOptimisticTransactionsFromDrafts(input: {
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

function formatRupiah(value: string | number) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return "Rp 0";
  }

  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(numberValue);
}

function getConfidenceLabel(confidence: QuickTransactionDraft["confidence"]) {
  if (confidence === "high") {
    return "Yakin";
  }

  if (confidence === "medium") {
    return "Cukup yakin";
  }

  return "Perlu cek";
}

function getConfidenceClassName(confidence: QuickTransactionDraft["confidence"]) {
  if (confidence === "high") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (confidence === "medium") {
    return "bg-amber-100 text-amber-700";
  }

  return "bg-rose-100 text-rose-700";
}

function getDraftCardClassName(draft: QuickTransactionDraft, isExpanded: boolean) {
  if (draft.confidence === "low") {
    return isExpanded
      ? "rounded-[1.25rem] border border-amber-300 bg-amber-50 p-2.5 shadow-sm sm:rounded-2xl sm:p-3"
      : "rounded-[1.25rem] border border-amber-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-3";
  }

  return isExpanded
    ? "rounded-[1.25rem] border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-2.5 shadow-sm sm:rounded-2xl sm:p-3"
    : "rounded-[1.25rem] border border-slate-200 bg-white p-2.5 shadow-sm sm:rounded-2xl sm:p-3";
}

function validateAmount(amount: string) {
  const trimmedAmount = amount.trim();

  if (!trimmedAmount) {
    return "Nominal wajib diisi.";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
    return "Nominal harus angka positif dengan maksimal 2 angka desimal.";
  }

  const amountNumber = Number(trimmedAmount);

  if (!Number.isFinite(amountNumber) || Number.isNaN(amountNumber)) {
    return "Nominal tidak valid.";
  }

  if (amountNumber < MIN_TRANSACTION_AMOUNT) {
    return "Nominal harus lebih dari 0.";
  }

  if (amountNumber > MAX_TRANSACTION_AMOUNT) {
    return "Nominal maksimal Rp 1.000.000.000.000.";
  }

  return null;
}

function validateDrafts(drafts: QuickTransactionDraft[]) {
  for (const [index, draft] of drafts.entries()) {
    const itemLabel = `Draft #${index + 1}`;

    const amountError = validateAmount(draft.amount);

    if (amountError) {
      return `${itemLabel}: ${amountError}`;
    }

    if (!draft.date) {
      return `${itemLabel}: tanggal wajib diisi.`;
    }

    if (!draft.note.trim()) {
      return `${itemLabel}: catatan wajib diisi.`;
    }

    if (!draft.saveAsNewCategory && !draft.categoryId) {
      return `${itemLabel}: kategori wajib dipilih.`;
    }

    if (draft.saveAsNewCategory) {
      const categoryName = normalizeCategoryName(draft.customCategoryName);

      if (!categoryName) {
        return `${itemLabel}: nama kategori baru wajib diisi.`;
      }

      if (categoryName.length > MAX_CATEGORY_NAME_LENGTH) {
        return `${itemLabel}: nama kategori maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter.`;
      }
    }
  }

  return null;
}

export function QuickTransactionModal({
  open,
  onClose,
  onSuccess,
  initialText
}: QuickTransactionModalProps) {
  const rawInputRef = useRef<HTMLTextAreaElement | null>(null);
  const { addToast } = useToast();
  const queryClient = useQueryClient();

  const [rawInput, setRawInput] = useState("");
  const [defaultDate, setDefaultDate] = useState(getTodayInputValue());
  const [drafts, setDrafts] = useState<QuickTransactionDraft[]>([]);
  const [skippedItems, setSkippedItems] = useState<QuickTransactionSkippedItem[]>(
    []
  );
  const [expandedDraftId, setExpandedDraftId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const categoriesQuery = useQuery({
    queryKey: queryKeys.categories,
    queryFn: () => getCategories(),
    enabled: open,
    staleTime: 5 * 60_000
  });

  const categories = categoriesQuery.data ?? [];
  const isLoadingCategories =
    categoriesQuery.isLoading && !categoriesQuery.data;

  const categoryError =
    categoriesQuery.error && !categoriesQuery.data
      ? getErrorMessage(categoriesQuery.error)
      : null;

  const canParse = rawInput.trim().length > 0 && categories.length > 0;

  const draftSummary = useMemo(() => {
    const totalIncome = drafts
      .filter((draft) => draft.type === "INCOME")
      .reduce((total, draft) => total + Number(draft.amount), 0);

    const totalExpense = drafts
      .filter((draft) => draft.type === "EXPENSE")
      .reduce((total, draft) => total + Number(draft.amount), 0);

    const needsReviewCount = drafts.filter(
      (draft) => draft.confidence === "low" || draft.saveAsNewCategory
    ).length;

    return {
      totalIncome,
      totalExpense,
      totalDrafts: drafts.length,
      needsReviewCount
    };
  }, [drafts]);

    const saveDraftsMutation = useMutation({
      mutationFn: async (items: QuickTransactionDraft[]) => {
        const categoryCache = [...categories];
        let createdCategoryCount = 0;

        const transactionInputs: CreateTransactionInput[] = [];

        for (const item of items) {
          let categoryId = item.categoryId;

          if (item.saveAsNewCategory) {
            const customCategoryName = normalizeCategoryName(
              item.customCategoryName
            );

            const existingCategory = findCategoryByName(
              categoryCache,
              item.type,
              customCategoryName
            );

            const category =
              existingCategory ??
              (await createCategory({
                name: customCategoryName,
                type: item.type,
                icon: null,
                color: null
              }));

            if (!existingCategory) {
              createdCategoryCount += 1;
              categoryCache.push(category);
            }

            categoryId = category.id;
          }

          transactionInputs.push({
            type: item.type,
            amount: item.amount.trim(),
            categoryId,
            date: toIsoDate(item.date),
            note: item.note.trim()
          });
        }

      const savedTransactions = await createTransactionsBulk({
        transactions: transactionInputs
      });

      return {
        savedTransactions,
        createdCategoryCount
      };
      },

            onMutate: async (items) => {
        setError(null);

        await queryClient.cancelQueries({
          queryKey: queryKeys.transactions.all
        });

        const previousTransactionQueries =
          getTransactionListCacheSnapshot(queryClient);

        const previousSummary = getSummaryCacheSnapshot(queryClient);

        const optimisticTransactions = buildOptimisticTransactionsFromDrafts({
          drafts: items,
          categories
        });

        if (optimisticTransactions.length > 0) {
          addTransactionsToListCaches(queryClient, optimisticTransactions);
          addTransactionsToSummaryCache(queryClient, optimisticTransactions);
        }

        return {
          previousTransactionQueries,
          previousSummary,
          optimisticTransactionIds: optimisticTransactions.map(
            (transaction) => transaction.id
          )
        };
      },
      
              onSuccess: (
        { savedTransactions, createdCategoryCount },
        _items,
        context
      ) => {
        for (const optimisticTransactionId of context?.optimisticTransactionIds ??
          []) {
          removeTransactionFromListCaches(queryClient, optimisticTransactionId);
        }

        if (context?.previousSummary) {
          restoreSummaryCacheSnapshot(queryClient, context.previousSummary);
        }

        addTransactionsToListCaches(queryClient, savedTransactions);
        addTransactionsToSummaryCache(queryClient, savedTransactions);

        markTransactionDerivedDataStale(queryClient, {
          includeCategories: createdCategoryCount > 0
        });

        addToast({
          variant: "success",
          title: "Catatan cepat tersimpan",
          description: buildTransactionSuccessInsight({
            transactions: savedTransactions,
            previousSummary: context?.previousSummary,
            createdCategoryCount
          })
        });

        void onSuccess();

        resetModal();
        onClose();
      },

           onError: (caughtError, _items, context) => {
        restoreTransactionListCacheSnapshot(
          queryClient,
          context?.previousTransactionQueries
        );
        restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);

        const message = getErrorMessage(caughtError);

        setError(message);

        addToast({
          variant: "error",
          title: "Gagal menyimpan transaksi cepat",
          description:
            "Perubahan sementara dibatalkan. Buka Catat Cepat kembali untuk mengecek dan mencoba ulang."
        });
      }
    });

  const isSaving = saveDraftsMutation.isPending;

  useLockBodyScroll(open);

  function resetModal() {
    setRawInput("");
    setDefaultDate(getTodayInputValue());
    setDrafts([]);
    setSkippedItems([]);
    setExpandedDraftId(null);
    setError(null);
  }

  function handleClose() {
    if (isSaving) {
      return;
    }

    resetModal();
    onClose();
  }

  function handleParse() {
    if (!rawInput.trim()) {
      setError("Isi catatan transaksi terlebih dahulu.");
      return;
    }

    if (categories.length === 0) {
      setError("Kategori belum tersedia. Coba refresh kategori terlebih dahulu.");
      return;
    }

    const result = parseQuickTransactionInput({
      input: rawInput,
      categories,
      defaultDate
    });

    setDrafts(result.drafts);
    setSkippedItems(result.skippedItems);

    const firstLowConfidenceDraft = result.drafts.find(
      (draft) => draft.confidence === "low"
    );

    setExpandedDraftId(firstLowConfidenceDraft?.id ?? null);

    if (result.drafts.length === 0) {
      setError("Belum ada transaksi valid yang bisa dibuat menjadi draft.");
      return;
    }

    setError(null);
  }

  function applyExample(example: string) {
    setRawInput((currentInput) => {
      const trimmedInput = currentInput.trim();

      if (!trimmedInput) {
        return example;
      }

      return `${trimmedInput}\n${example}`;
    });
    setError(null);
    window.setTimeout(() => {
      rawInputRef.current?.focus();
    }, 0);
  }

  function updateDraft(
    draftId: string,
    updates: Partial<QuickTransactionDraft>
  ) {
    setDrafts((currentDrafts) =>
      currentDrafts.map((draft) =>
        draft.id === draftId
          ? {
              ...draft,
              ...updates
            }
          : draft
      )
    );
  }

  function handleDraftTypeChange(draft: QuickTransactionDraft, type: TransactionType) {
    const categoriesByType = sortCategoryOptions(
      categories.filter((category) => category.type === type)
    );

    const fallbackCategory = categoriesByType[0];

    updateDraft(draft.id, {
      type,
      categoryId: fallbackCategory?.id ?? "",
      categoryName: fallbackCategory?.name ?? "",
      confidence: "low",
      warning: "Tipe transaksi diubah manual. Mohon cek kategori sebelum simpan.",
      saveAsNewCategory: false
    });
  }

  function handleDraftCategoryChange(draft: QuickTransactionDraft, categoryId: string) {
    const selectedCategory = categories.find(
      (category) => category.id === categoryId
    );

    updateDraft(draft.id, {
      categoryId,
      categoryName: selectedCategory?.name ?? "",
      saveAsNewCategory: false,
      warning: isOtherCategory(selectedCategory)
        ? "Kategori Lain dipilih. Kamu bisa simpan sebagai kategori baru jika transaksi ini sering muncul."
        : undefined
    });
  }

  function toggleExpandedDraft(draftId: string) {
    setExpandedDraftId((currentDraftId) =>
      currentDraftId === draftId ? null : draftId
    );
  }

  function removeDraft(draftId: string) {
    setDrafts((currentDrafts) =>
      currentDrafts.filter((draft) => draft.id !== draftId)
    );

    setExpandedDraftId((currentDraftId) =>
      currentDraftId === draftId ? null : currentDraftId
    );
  }

  function handleSaveDrafts() {
    if (drafts.length === 0) {
      setError("Buat draft transaksi terlebih dahulu.");
      return;
    }

    const validationError = validateDrafts(drafts);

    if (validationError) {
      setError(validationError);
      return;
    }

    const submittedDrafts = drafts.map((draft) => ({
      ...draft
    }));

    setError(null);

    saveDraftsMutation.mutate(submittedDrafts);
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    if (initialText) {
      setRawInput(initialText);
    }

    window.setTimeout(() => {
      rawInputRef.current?.focus();
    }, 80);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-hidden overscroll-none bg-[var(--sakuin-secondary)]/35 px-3 py-3 backdrop-blur-md sm:items-center sm:px-4 sm:py-4">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto overscroll-contain rounded-[1.5rem] border border-white/70 bg-white p-3.5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:rounded-[2rem] sm:p-6">
        <div className="mb-4 flex items-start justify-between gap-3 sm:mb-5 sm:gap-4">
          <div className="min-w-0">
            <p className="inline-flex items-center gap-1.5 text-xs font-bold text-[var(--sakuin-text)] sm:gap-2 sm:text-sm">
              <Sparkles className="h-4 w-4" />
              Catat cepat
            </p>
            <h2 className="mt-1 text-lg font-black tracking-tight text-slate-950 sm:text-2xl">
              Buat banyak transaksi dari teks
            </h2>
            <p className="mt-1 hidden text-sm leading-6 text-slate-500 sm:block">
              Tulis transaksi, buat draft, lalu cek item yang perlu diperbaiki
              sebelum disimpan.
            </p>
          </div>

          <button
            aria-label="Tutup modal catat cepat"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60 sm:h-10 sm:w-10"
            disabled={isSaving}
            onClick={handleClose}
            type="button"
          >
            <X className="h-4 w-4 sm:h-5 sm:w-5" />
          </button>
        </div>

        {categoryError || error ? (
          <div className="mb-3 flex gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs font-medium text-rose-700 sm:mb-4 sm:gap-3 sm:px-4 sm:py-3 sm:text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{categoryError || error}</p>

              {categoryError ? (
                <button
                  className="mt-2 font-bold underline"
                  onClick={() => void categoriesQuery.refetch()}
                  type="button"
                >
                  Ambil kategori lagi
                </button>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="grid gap-4 lg:grid-cols-[0.85fr_1.15fr] lg:gap-5">
          <section className="space-y-3 sm:space-y-4">
            <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-950 sm:mb-2 sm:text-sm">
              Tanggal default
            </span>

              <input
                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-950 outline-none transition focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 sm:min-h-12 sm:rounded-[1.25rem] sm:px-4 sm:py-3"
                disabled={isSaving}
                type="date"
                value={defaultDate}
                onChange={(event) => setDefaultDate(event.target.value)}
              />
            </label>

            <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-950 sm:mb-2 sm:text-sm">
            Catatan transaksi
            </span>

              <textarea
                ref={rawInputRef}
                className="min-h-32 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-3.5 py-2.5 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 disabled:cursor-not-allowed disabled:bg-slate-100 sm:min-h-56 sm:rounded-[1.5rem] sm:px-4 sm:py-3"
                disabled={isSaving}
                placeholder={`Contoh:
                makan 15000
                kopi 18000
                dikasih uang kakak 100000
                gaji 3000000`}
                value={rawInput}
                onChange={(event) => {
                  setRawInput(event.target.value);
                  setError(null);
                }}
              />
            </label>

            <div className="flex gap-2 overflow-x-auto pb-1">
              {QUICK_TRANSACTION_EXAMPLES.map((example) => (
                <button
                  className="shrink-0 rounded-full bg-[var(--sakuin-primary-soft)] px-3 py-2 text-xs font-black text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)] transition hover:bg-[var(--sakuin-secondary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSaving}
                  key={example}
                  onClick={() => applyExample(example)}
                  type="button"
                >
                  {example}
                </button>
              ))}
            </div>

            <div className="hidden rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500 sm:block">
              <p className="font-black text-slate-700">Format cepat:</p>
              <p className="mt-1">
                Pisahkan transaksi dengan baris baru, koma, atau titik koma.
                Setelah draft muncul, cukup edit item yang kurang tepat.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
            <Button
                  className="min-h-10 rounded-2xl text-xs sm:min-h-11 sm:text-sm"
                  disabled={!canParse || isLoadingCategories || isSaving}
                  isLoading={isLoadingCategories}
                  onClick={handleParse}
                  type="button"
                  variant="secondary"
                >
                <MessageSquare className="h-4 w-4" />
                Buat draft
              </Button>

                <Button
                  className="min-h-10 rounded-2xl text-xs sm:min-h-11 sm:text-sm"
                  disabled={drafts.length === 0 || isSaving}
                  isLoading={isSaving}
                  onClick={handleSaveDrafts}
                  type="button"
                >
                Simpan semua
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </section>

          <section>
            <div className="rounded-[1.35rem] border border-slate-200 bg-slate-50 p-3 sm:rounded-[1.5rem] sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Draft transaksi
                  </p>
                  <p className="mt-1 hidden text-xs font-medium text-slate-500 sm:block">
                    Tampilan ringkas. Buka edit hanya jika perlu.
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {draftSummary.needsReviewCount > 0 ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-black text-amber-700">
                      {draftSummary.needsReviewCount} perlu cek
                    </span>
                  ) : null}

                  <span className="rounded-full bg-white px-3 py-1 text-xs font-black text-slate-700">
                    {draftSummary.totalDrafts} item
                  </span>
                </div>
              </div>

              <div className="mt-3 grid gap-2 sm:mt-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-2.5 sm:p-3">
                  <p className="text-xs font-bold text-slate-500">Income</p>
                  <p className="mt-1 text-sm font-black text-emerald-700">
                    {formatRupiah(draftSummary.totalIncome)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-2.5 sm:p-3">
                  <p className="text-xs font-bold text-slate-500">Expense</p>
                  <p className="mt-1 text-sm font-black text-rose-700">
                    {formatRupiah(draftSummary.totalExpense)}
                  </p>
                </div>
              </div>

              <div className="mt-3 max-h-[24rem] space-y-2.5 overflow-y-auto pr-1 sm:mt-4 sm:max-h-[32rem] sm:space-y-3">
                {drafts.length === 0 ? (
                  <div className="rounded-2xl bg-white p-3.5 text-center sm:p-4">
                    <p className="text-sm font-black text-slate-950">
                      Belum ada draft
                    </p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">
                      Tulis transaksi, lalu klik Buat draft.
                    </p>
                  </div>
                ) : null}

                {drafts.map((draft, index) => {
                  const categoriesByType = sortCategoryOptions(
                    categories.filter((category) => category.type === draft.type)
                  );

                  const isExpanded = expandedDraftId === draft.id;
                  const displayedCategoryName = draft.saveAsNewCategory
                    ? normalizeCategoryName(draft.customCategoryName) ||
                      "Kategori baru"
                    : draft.categoryName;

                  return (
                    <div
                      className={getDraftCardClassName(draft, isExpanded)}
                      key={draft.id}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          className="min-w-0 flex-1 text-left"
                          onClick={() => toggleExpandedDraft(draft.id)}
                          type="button"
                        >
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-black text-slate-700">
                              #{index + 1}
                            </span>

                            <span
                              className={
                                draft.type === "INCOME"
                                  ? "rounded-full bg-emerald-100 px-2.5 py-1 text-[10px] font-black text-emerald-700"
                                  : "rounded-full bg-rose-100 px-2.5 py-1 text-[10px] font-black text-rose-700"
                              }
                            >
                              {draft.type === "INCOME" ? "Income" : "Expense"}
                            </span>

                            <span
                              className={`rounded-full px-2.5 py-1 text-[10px] font-black ${getConfidenceClassName(
                                draft.confidence
                              )}`}
                            >
                              {getConfidenceLabel(draft.confidence)}
                            </span>
                          </div>

                          <div className="mt-2 flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                            <div className="min-w-0">
                              <p className="truncate text-xs font-black text-slate-950 sm:text-sm">
                                {draft.note}
                              </p>
                              <p className="mt-0.5 truncate text-[11px] font-medium text-slate-500 sm:text-xs">
                                {displayedCategoryName} · {draft.date}
                              </p>
                            </div>

                            <p
                              className={
                                draft.type === "INCOME"
                              ? "shrink-0 text-xs font-black text-emerald-700 sm:text-sm"
                              : "shrink-0 text-xs font-black text-rose-700 sm:text-sm"
                              }
                            >
                              {draft.type === "INCOME" ? "+" : "-"}{" "}
                              {formatRupiah(draft.amount)}
                            </p>
                          </div>

                          {draft.warning && !isExpanded ? (
                            <p className="mt-2 line-clamp-2 text-xs font-medium leading-5 text-amber-700">
                              {draft.warning}
                            </p>
                          ) : null}
                        </button>

                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            aria-label="Edit draft"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200 sm:h-9 sm:w-9"
                            disabled={isSaving}
                            onClick={() => toggleExpandedDraft(draft.id)}
                            type="button"
                          >
                            {isExpanded ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <Pencil className="h-4 w-4" />
                            )}
                          </button>

                          <button
                            aria-label="Hapus draft"
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100 sm:h-9 sm:w-9"
                            disabled={isSaving}
                            onClick={() => removeDraft(draft.id)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-3 border-t border-slate-200 pt-3 sm:mt-4 sm:pt-4">
                          {draft.warning ? (
                            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-700">
                              {draft.warning}
                            </div>
                          ) : null}

                          <div className="grid gap-2.5 sm:grid-cols-2 sm:gap-3">
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-black text-slate-500">
                                Tipe
                              </span>
                              <select
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                                disabled={isSaving}
                                value={draft.type}
                                onChange={(event) =>
                                  handleDraftTypeChange(
                                    draft,
                                    event.target.value as TransactionType
                                  )
                                }
                              >
                                <option value="EXPENSE">Expense</option>
                                <option value="INCOME">Income</option>
                              </select>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-xs font-black text-slate-500">
                                Nominal
                              </span>
                              <input
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                                disabled={isSaving}
                                inputMode="decimal"
                                value={draft.amount}
                                onChange={(event) =>
                                  updateDraft(draft.id, {
                                    amount: event.target.value
                                  })
                                }
                              />
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-xs font-black text-slate-500">
                                Kategori
                              </span>
                              <select
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25 disabled:bg-slate-100 disabled:text-slate-400"
                                disabled={isSaving || draft.saveAsNewCategory}
                                value={draft.categoryId}
                                onChange={(event) =>
                                  handleDraftCategoryChange(
                                    draft,
                                    event.target.value
                                  )
                                }
                              >
                                {categoriesByType.map((category) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </select>
                            </label>

                            <label className="block">
                              <span className="mb-1.5 block text-xs font-black text-slate-500">
                                Tanggal
                              </span>
                              <input
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                                disabled={isSaving}
                                type="date"
                                value={draft.date}
                                onChange={(event) =>
                                  updateDraft(draft.id, {
                                    date: event.target.value
                                  })
                                }
                              />
                            </label>
                          </div>

                          <label className="mt-3 block">
                            <span className="mb-1.5 block text-xs font-black text-slate-500">
                              Catatan
                            </span>
                            <input
                              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                              disabled={isSaving}
                              value={draft.note}
                              onChange={(event) =>
                                updateDraft(draft.id, {
                                  note: event.target.value
                                })
                              }
                            />
                          </label>

                          <div className="mt-2.5 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-2.5 sm:mt-3 sm:p-3">
                            <label className="flex items-start gap-3">
                              <input
                                checked={draft.saveAsNewCategory}
                                className="mt-1 h-4 w-4 rounded border-[var(--sakuin-primary)] text-[var(--sakuin-text)] focus:ring-[var(--sakuin-focus)]"
                                disabled={isSaving}
                                type="checkbox"
                                onChange={(event) =>
                                  updateDraft(draft.id, {
                                    saveAsNewCategory: event.target.checked
                                  })
                                }
                              />

                              <span>
                                <span className="block text-xs font-black text-[var(--sakuin-text)]">
                                  Simpan sebagai kategori baru
                                </span>
                                <span className="mt-1 hidden text-xs font-medium leading-5 text-[var(--sakuin-text)] sm:block">
                                  Aktifkan jika kategori transaksi ini belum ada
                                  dan ingin dipakai lagi nanti.
                                </span>
                              </span>
                            </label>

                            {draft.saveAsNewCategory ? (
                              <label className="mt-3 block">
                                <span className="mb-1.5 block text-xs font-black text-[var(--sakuin-text)]">
                                  Nama kategori baru
                                </span>
                                <input
                                  className="min-h-11 w-full rounded-2xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-[var(--sakuin-primary)] focus:ring-4 focus:ring-[var(--sakuin-focus)]/25"
                                  disabled={isSaving}
                                  maxLength={MAX_CATEGORY_NAME_LENGTH}
                                  placeholder={
                                    draft.type === "INCOME"
                                      ? "Contoh: Uang Kakak"
                                      : "Contoh: Laundry"
                                  }
                                  value={draft.customCategoryName}
                                  onChange={(event) =>
                                    updateDraft(draft.id, {
                                      customCategoryName: event.target.value
                                    })
                                  }
                                />
                              </label>
                            ) : null}
                          </div>

                          <button
                            className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-2xl bg-slate-100 px-4 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                            onClick={() => setExpandedDraftId(null)}
                            type="button"
                          >
                            Selesai edit
                            <ChevronUp className="h-4 w-4" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              {skippedItems.length > 0 ? (
                <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50 p-2.5 sm:mt-4 sm:p-3">
                  <p className="text-xs font-black text-amber-800">
                    Beberapa item dilewati
                  </p>

                  <ul className="mt-2 space-y-1 text-xs leading-5 text-amber-700">
                    {skippedItems.map((item) => (
                      <li key={`${item.sourceText}-${item.reason}`}>
                        <span className="font-black">{item.sourceText}</span>:{" "}
                        {item.reason}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
