import { useMemo, useState } from "react";
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
import { queryKeys } from "../../lib/query-keys";
import {
  createCategory,
  getCategories
} from "../categories/category.service";
import type { Category } from "../categories/category.types";
import { createTransaction } from "./transaction.service";
import {
  addTransactionsToListCaches,
  markTransactionDerivedDataStale
} from "./transaction-cache";
import {
  parseQuickTransactionInput,
  type QuickTransactionDraft,
  type QuickTransactionSkippedItem
} from "./quick-transaction-parser";
import type {
  CreateTransactionInput,
  TransactionType
} from "./transaction.types";
import { useToast } from "../../components/toast/ToastProvider";

const MIN_TRANSACTION_AMOUNT = 1;
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
const MAX_CATEGORY_NAME_LENGTH = 50;

type QuickTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function toIsoDate(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000`).toISOString();
}

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
      ? "rounded-2xl border border-amber-300 bg-amber-50 p-3 shadow-sm"
      : "rounded-2xl border border-amber-200 bg-white p-3 shadow-sm";
  }

  return isExpanded
    ? "rounded-2xl border border-indigo-200 bg-indigo-50 p-3 shadow-sm"
    : "rounded-2xl border border-slate-200 bg-white p-3 shadow-sm";
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
  onSuccess
}: QuickTransactionModalProps) {
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

        const savedTransactions = await Promise.all(
          transactionInputs.map((input) => createTransaction(input))
        );

        return {
          savedTransactions,
          createdCategoryCount
        };
      },
            onSuccess: ({ savedTransactions, createdCategoryCount }) => {
        addTransactionsToListCaches(queryClient, savedTransactions);
        markTransactionDerivedDataStale(queryClient, {
          includeCategories: createdCategoryCount > 0
        });

        addToast({
          variant: "success",
          title: "Transaksi cepat berhasil disimpan",
          description:
            createdCategoryCount > 0
              ? `${savedTransactions.length} transaksi dan ${createdCategoryCount} kategori baru berhasil ditambahkan. Ringkasan diperbarui di background.`
              : `${savedTransactions.length} transaksi berhasil ditambahkan. Ringkasan diperbarui di background.`
        });

        void onSuccess();

        resetModal();
        onClose();
      },

      onError: (caughtError) => {
        const message = getErrorMessage(caughtError);

        setError(message);

        addToast({
          variant: "error",
          title: "Gagal menyimpan transaksi cepat",
          description:
            "Draft belum dihapus. Buka Catat Cepat kembali untuk mengecek dan mencoba ulang."
        });
      }
    });

  const isSaving = saveDraftsMutation.isPending;

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
    onClose();

    saveDraftsMutation.mutate(submittedDrafts);
  }

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-3 py-3 backdrop-blur-md sm:items-center sm:px-4 sm:py-4">
      <div className="max-h-[94vh] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-4 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="inline-flex items-center gap-2 text-sm font-bold text-indigo-700">
              <Sparkles className="h-4 w-4" />
              Catat cepat
            </p>
            <h2 className="mt-1 text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              Buat banyak transaksi dari teks
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Tulis transaksi, buat draft, lalu cek item yang perlu diperbaiki
              sebelum disimpan.
            </p>
          </div>

          <button
            aria-label="Tutup modal catat cepat"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSaving}
            onClick={handleClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {categoryError || error ? (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
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

        <div className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <section className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-950">
                Tanggal default
              </span>

              <input
                className="min-h-12 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                disabled={isSaving}
                type="date"
                value={defaultDate}
                onChange={(event) => setDefaultDate(event.target.value)}
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-slate-950">
                Catatan transaksi
              </span>

              <textarea
                className="min-h-44 w-full resize-none rounded-[1.5rem] border border-slate-200 bg-white px-4 py-3 text-sm leading-6 text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 sm:min-h-56"
                disabled={isSaving}
                placeholder={`Contoh:
                makan 15000
                kopi 18000
                dikasih uang kakak 100000
                gaji 3000000`}
                value={rawInput}
                onChange={(event) => setRawInput(event.target.value)}
              />
            </label>

            <div className="rounded-2xl bg-slate-50 px-4 py-3 text-xs leading-5 text-slate-500">
              <p className="font-black text-slate-700">Format cepat:</p>
              <p className="mt-1">
                Pisahkan transaksi dengan baris baru, koma, atau titik koma.
                Setelah draft muncul, cukup edit item yang kurang tepat.
              </p>
            </div>

            <div className="grid gap-2 sm:grid-cols-2">
              <Button
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
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-black text-slate-950">
                    Draft transaksi
                  </p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
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

              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">Income</p>
                  <p className="mt-1 text-sm font-black text-emerald-700">
                    {formatRupiah(draftSummary.totalIncome)}
                  </p>
                </div>

                <div className="rounded-2xl bg-white p-3">
                  <p className="text-xs font-bold text-slate-500">Expense</p>
                  <p className="mt-1 text-sm font-black text-rose-700">
                    {formatRupiah(draftSummary.totalExpense)}
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-[32rem] space-y-3 overflow-y-auto pr-1">
                {drafts.length === 0 ? (
                  <div className="rounded-2xl bg-white p-4 text-center">
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
                              <p className="truncate text-sm font-black text-slate-950">
                                {draft.note}
                              </p>
                              <p className="mt-0.5 text-xs font-medium text-slate-500">
                                {displayedCategoryName} · {draft.date}
                              </p>
                            </div>

                            <p
                              className={
                                draft.type === "INCOME"
                                  ? "shrink-0 text-sm font-black text-emerald-700"
                                  : "shrink-0 text-sm font-black text-rose-700"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-700 transition hover:bg-slate-200"
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
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-rose-50 text-rose-700 transition hover:bg-rose-100"
                            disabled={isSaving}
                            onClick={() => removeDraft(draft.id)}
                            type="button"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {isExpanded ? (
                        <div className="mt-4 border-t border-slate-200 pt-4">
                          {draft.warning ? (
                            <div className="mb-3 rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-medium leading-5 text-amber-700">
                              {draft.warning}
                            </div>
                          ) : null}

                          <div className="grid gap-3 sm:grid-cols-2">
                            <label className="block">
                              <span className="mb-1.5 block text-xs font-black text-slate-500">
                                Tipe
                              </span>
                              <select
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
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
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
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
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 disabled:bg-slate-100 disabled:text-slate-400"
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
                                className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
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
                              className="min-h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
                              disabled={isSaving}
                              value={draft.note}
                              onChange={(event) =>
                                updateDraft(draft.id, {
                                  note: event.target.value
                                })
                              }
                            />
                          </label>

                          <div className="mt-3 rounded-2xl border border-indigo-100 bg-indigo-50 p-3">
                            <label className="flex items-start gap-3">
                              <input
                                checked={draft.saveAsNewCategory}
                                className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-700 focus:ring-indigo-600"
                                disabled={isSaving}
                                type="checkbox"
                                onChange={(event) =>
                                  updateDraft(draft.id, {
                                    saveAsNewCategory: event.target.checked
                                  })
                                }
                              />

                              <span>
                                <span className="block text-xs font-black text-indigo-950">
                                  Simpan sebagai kategori baru
                                </span>
                                <span className="mt-1 block text-xs font-medium leading-5 text-indigo-700">
                                  Aktifkan jika kategori transaksi ini belum ada
                                  dan ingin dipakai lagi nanti.
                                </span>
                              </span>
                            </label>

                            {draft.saveAsNewCategory ? (
                              <label className="mt-3 block">
                                <span className="mb-1.5 block text-xs font-black text-indigo-950">
                                  Nama kategori baru
                                </span>
                                <input
                                  className="min-h-11 w-full rounded-2xl border border-indigo-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
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
                <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
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