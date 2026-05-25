import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  CalendarDays,
  Loader2,
  Plus,
  X
} from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  createCategory,
  getCategories
} from "../categories/category.service";
import type { Category } from "../categories/category.types";
import { createTransaction } from "./transaction.service";
import type {
  CreateTransactionInput,
  Transaction,
  TransactionType
} from "./transaction.types";
import { useToast } from "../../components/toast/ToastProvider";
import {
  addTransactionToListCaches,
  addTransactionToSummaryCache,
  getSummaryCacheSnapshot,
  getTransactionListCacheSnapshot,
  markTransactionDerivedDataStale,
  removeTransactionFromListCaches,
  restoreSummaryCacheSnapshot,
  restoreTransactionListCacheSnapshot
} from "./transaction-cache";

const MIN_TRANSACTION_AMOUNT = 1;
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
const MAX_TRANSACTION_AMOUNT_LABEL = "Rp 1.000.000.000.000";
const MAX_CATEGORY_NAME_LENGTH = 50;

type AddTransactionModalProps = {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

type TransactionFormState = {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  saveAsNewCategory: boolean;
  customCategoryName: string;
};

type CreateTransactionMutationInput = {
  transactionInput: CreateTransactionInput;
  customCategoryName?: string;
};

function getTodayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getInitialForm(): TransactionFormState {
  return {
    type: "EXPENSE",
    amount: "",
    categoryId: "",
    date: getTodayInputValue(),
    note: "",
    saveAsNewCategory: false,
    customCategoryName: ""
  };
}

function createOptimisticTransactionId() {
  return `optimistic-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal membuat transaksi. Silakan coba lagi.";
}

function toIsoDate(dateInput: string) {
  return new Date(`${dateInput}T00:00:00.000`).toISOString();
}

function preventInvalidAmountKey(event: ReactKeyboardEvent<HTMLInputElement>) {
  if (["-", "+", "e", "E"].includes(event.key)) {
    event.preventDefault();
  }
}

function validateTransactionAmount(amount: string) {
  const trimmedAmount = amount.trim();

  if (!trimmedAmount) {
    return "Nominal transaksi wajib diisi.";
  }

  if (!/^\d+(\.\d{1,2})?$/.test(trimmedAmount)) {
    return "Nominal transaksi harus berupa angka positif dengan maksimal 2 angka desimal.";
  }

  const amountNumber = Number(trimmedAmount);

  if (!Number.isFinite(amountNumber) || Number.isNaN(amountNumber)) {
    return "Nominal transaksi tidak valid.";
  }

  if (amountNumber < MIN_TRANSACTION_AMOUNT) {
    return "Nominal transaksi harus lebih dari 0.";
  }

  if (amountNumber > MAX_TRANSACTION_AMOUNT) {
    return `Nominal transaksi maksimal ${MAX_TRANSACTION_AMOUNT_LABEL}.`;
  }

  return null;
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

function buildOptimisticTransaction(input: {
  transactionInput: CreateTransactionInput;
  category: Category;
}): Transaction {
  const now = new Date().toISOString();

  return {
    id: createOptimisticTransactionId(),
    type: input.transactionInput.type,
    amount: input.transactionInput.amount,
    categoryId: input.category.id,
    category: mapCategoryToTransactionCategory(input.category),
    date: input.transactionInput.date,
    note: input.transactionInput.note ?? null,
    createdAt: now,
    updatedAt: now
  };
}

export function AddTransactionModal({
  open,
  onClose,
  onSuccess
}: AddTransactionModalProps) {
  const [form, setForm] = useState<TransactionFormState>(getInitialForm);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();
  const queryClient = useQueryClient();

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

  const categoryOptions = useMemo(() => {
    const categoriesByType = categories.filter(
      (category) => category.type === form.type
    );

    return sortCategoryOptions(categoriesByType);
  }, [categories, form.type]);

  const selectedCategory = useMemo(() => {
    return categoryOptions.find((category) => category.id === form.categoryId);
  }, [categoryOptions, form.categoryId]);

  const canCreateInlineCategory = isOtherCategory(selectedCategory);

  const createTransactionMutation = useMutation({
    mutationFn: async ({
      transactionInput,
      customCategoryName
    }: CreateTransactionMutationInput) => {
      if (!customCategoryName) {
        return {
          transaction: await createTransaction(transactionInput),
          createdCategory: null
        };
      }

      const existingCategory = findCategoryByName(
        categories,
        transactionInput.type,
        customCategoryName
      );

      const category =
        existingCategory ??
        (await createCategory({
          name: customCategoryName,
          type: transactionInput.type,
          icon: null,
          color: null
        }));

      const transaction = await createTransaction({
        ...transactionInput,
        categoryId: category.id
      });

      return {
        transaction,
        createdCategory: existingCategory ? null : category
      };
    },
    onMutate: async ({ transactionInput, customCategoryName }) => {
      setError(null);

      await queryClient.cancelQueries({
        queryKey: queryKeys.transactions.all
      });

      const previousTransactionQueries =
        getTransactionListCacheSnapshot(queryClient);
      
      const previousSummary = getSummaryCacheSnapshot(queryClient);

      const normalizedCustomCategoryName = customCategoryName
        ? normalizeCategoryName(customCategoryName)
        : "";

      const selectedCategory = normalizedCustomCategoryName
        ? findCategoryByName(
            categories,
            transactionInput.type,
            normalizedCustomCategoryName
          )
        : categories.find((category) => category.id === transactionInput.categoryId);

      let optimisticTransaction: Transaction | null = null;

      if (selectedCategory) {
        optimisticTransaction = buildOptimisticTransaction({
          transactionInput: {
            ...transactionInput,
            categoryId: selectedCategory.id
          },
          category: selectedCategory
        });

        addTransactionToListCaches(queryClient, optimisticTransaction);
        addTransactionToSummaryCache(queryClient, optimisticTransaction);
      }

      resetForm();
      onClose();

    return {
      optimisticTransactionId: optimisticTransaction?.id ?? null,
      previousTransactionQueries,
      previousSummary
    };
    },
    onSuccess: ({ transaction, createdCategory }, _variables, context) => {
      if (context?.optimisticTransactionId) {
        removeTransactionFromListCaches(queryClient, context.optimisticTransactionId);
      }

      if (context?.previousSummary) {
        restoreSummaryCacheSnapshot(queryClient, context.previousSummary);
      }

      addTransactionToListCaches(queryClient, transaction);
      addTransactionToSummaryCache(queryClient, transaction);

      markTransactionDerivedDataStale(queryClient, {
        includeCategories: Boolean(createdCategory)
      });

      addToast({
        variant: "success",
        title: "Transaksi berhasil ditambahkan",
        description: createdCategory
          ? `Kategori "${createdCategory.name}" ikut disimpan untuk transaksi berikutnya.`
          : "Transaksi langsung ditampilkan. Ringkasan diperbarui di background."
      });

      void onSuccess();
    },

    onError: (caughtError, _variables, context) => {
      restoreTransactionListCacheSnapshot(
        queryClient,
        context?.previousTransactionQueries
      );

      restoreSummaryCacheSnapshot(queryClient, context?.previousSummary);

      addToast({
        variant: "error",
        title: "Gagal menambahkan transaksi",
        description: getErrorMessage(caughtError)
      });
    }
  });

  const isSubmitting = createTransactionMutation.isPending;

  function resetForm() {
    setForm(getInitialForm());
    setError(null);
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    resetForm();
    onClose();
  }

  function handleTypeChange(nextType: TransactionType) {
    const categoriesByType = sortCategoryOptions(
      categories.filter((category) => category.type === nextType)
    );

    const defaultCategory = categoriesByType[0];

    setForm((current) => ({
      ...current,
      type: nextType,
      categoryId: defaultCategory?.id ?? "",
      saveAsNewCategory: false,
      customCategoryName: ""
    }));
  }

  function handleCategoryChange(categoryId: string) {
    const nextCategory = categoryOptions.find(
      (category) => category.id === categoryId
    );

    setForm((current) => ({
      ...current,
      categoryId,
      saveAsNewCategory: false,
      customCategoryName: isOtherCategory(nextCategory)
        ? current.customCategoryName
        : ""
    }));
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const amountError = validateTransactionAmount(form.amount);

    if (amountError) {
      setError(amountError);
      return;
    }

    if (!form.categoryId) {
      setError("Kategori transaksi wajib dipilih.");
      return;
    }

    if (!form.date) {
      setError("Tanggal transaksi wajib diisi.");
      return;
    }

    const normalizedCustomCategoryName = normalizeCategoryName(
      form.customCategoryName
    );

    if (form.saveAsNewCategory && !canCreateInlineCategory) {
      setError("Kategori baru hanya bisa dibuat dari pilihan kategori Lain.");
      return;
    }

    if (form.saveAsNewCategory && !normalizedCustomCategoryName) {
      setError("Nama kategori baru wajib diisi.");
      return;
    }

    if (
      form.saveAsNewCategory &&
      normalizedCustomCategoryName.length > MAX_CATEGORY_NAME_LENGTH
    ) {
      setError(`Nama kategori maksimal ${MAX_CATEGORY_NAME_LENGTH} karakter.`);
      return;
    }

    const input: CreateTransactionInput = {
      type: form.type,
      amount: form.amount.trim(),
      categoryId: form.categoryId,
      date: toIsoDate(form.date),
      note: form.note.trim() || undefined
    };

    setError(null);

    createTransactionMutation.mutate({
      transactionInput: input,
      customCategoryName: form.saveAsNewCategory
        ? normalizedCustomCategoryName
        : undefined
    });
  }

  useEffect(() => {
    if (!open) {
      return;
    }

    setError(null);
  }, [open]);

  useEffect(() => {
    if (!open || categories.length === 0 || form.categoryId) {
      return;
    }

    const expenseCategories = sortCategoryOptions(
      categories.filter((category) => category.type === "EXPENSE")
    );

    const defaultExpenseCategory = expenseCategories[0];

    setForm((current) => ({
      ...current,
      categoryId: defaultExpenseCategory?.id ?? ""
    }));
  }, [open, categories, form.categoryId]);

  useEffect(() => {
    if (
      !canCreateInlineCategory &&
      (form.saveAsNewCategory || form.customCategoryName)
    ) {
      setForm((current) => ({
        ...current,
        saveAsNewCategory: false,
        customCategoryName: ""
      }));
    }
  }, [canCreateInlineCategory, form.customCategoryName, form.saveAsNewCategory]);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape" && open) {
        handleClose();
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, isSubmitting]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-md sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-[var(--sakuin-purple)]">
              Transaksi baru
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[var(--sakuin-text)]">
              Tambah transaksi
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--sakuin-muted)]">
              Catat pemasukan atau pengeluaranmu. Jika kategorinya belum ada,
              pilih kategori Lain lalu simpan sebagai kategori baru.
            </p>
          </div>

          <button
            aria-label="Tutup modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-surface-soft)] text-[var(--sakuin-muted)] transition hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {categoryError ? (
          <div className="mb-4 flex gap-3 rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{categoryError}</p>
              <button
                className="mt-2 font-bold underline"
                onClick={() => void categoriesQuery.refetch()}
                type="button"
              >
                Coba ambil kategori lagi
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 flex gap-3 rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <p className="mb-2 text-sm font-semibold text-[var(--sakuin-text)]">
              Tipe transaksi
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-[1.5rem] bg-[var(--sakuin-surface-soft)] p-1">
              <button
                className={
                  form.type === "EXPENSE"
                    ? "rounded-[1.25rem] bg-[var(--sakuin-primary)] px-4 py-3 text-sm font-black text-white shadow-sm"
                    : "rounded-[1.25rem] px-4 py-3 text-sm font-black text-[var(--sakuin-muted)] transition hover:bg-white"
                }
                onClick={() => handleTypeChange("EXPENSE")}
                type="button"
              >
                Expense
              </button>

              <button
                className={
                  form.type === "INCOME"
                    ? "rounded-[1.25rem] bg-[var(--sakuin-primary)] px-4 py-3 text-sm font-black text-white shadow-sm"
                    : "rounded-[1.25rem] px-4 py-3 text-sm font-black text-[var(--sakuin-muted)] transition hover:bg-white"
                }
                onClick={() => handleTypeChange("INCOME")}
                type="button"
              >
                Income
              </button>
            </div>
          </div>

          <Input
            label="Nominal"
            name="amount"
            type="number"
            min={String(MIN_TRANSACTION_AMOUNT)}
            max={String(MAX_TRANSACTION_AMOUNT)}
            step="1"
            placeholder="Contoh: 250000"
            value={form.amount}
            onKeyDown={preventInvalidAmountKey}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                amount: event.target.value
              }))
            }
          />

          <p className="-mt-2 text-xs font-medium text-[var(--sakuin-muted)]">
            Maksimal nominal transaksi adalah {MAX_TRANSACTION_AMOUNT_LABEL}.
          </p>

          <label className="block w-full">
            <span className="mb-2 block text-sm font-semibold text-[var(--sakuin-text)]">
              Kategori
            </span>

            <select
              className="min-h-12 w-full rounded-[1.25rem] border border-[var(--sakuin-border)] bg-white px-4 py-3 text-sm text-[var(--sakuin-text)] outline-none transition focus:border-[var(--sakuin-purple)] focus:ring-4 focus:ring-[var(--sakuin-purple)]/10 disabled:cursor-not-allowed disabled:bg-[var(--sakuin-surface-soft)] disabled:text-[var(--sakuin-muted)]"
              disabled={isLoadingCategories || categoryOptions.length === 0}
              value={form.categoryId}
              onChange={(event) => handleCategoryChange(event.target.value)}
            >
              {isLoadingCategories ? (
                <option value="">Mengambil kategori...</option>
              ) : null}

              {!isLoadingCategories && categoryOptions.length === 0 ? (
                <option value="">Kategori belum tersedia</option>
              ) : null}

              {categoryOptions.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </label>

          {canCreateInlineCategory ? (
            <div className="rounded-[1.5rem] border border-indigo-100 bg-indigo-50 p-4">
              <label className="flex items-start gap-3">
                <input
                  checked={form.saveAsNewCategory}
                  className="mt-1 h-4 w-4 rounded border-indigo-300 text-indigo-700 focus:ring-indigo-600"
                  type="checkbox"
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      saveAsNewCategory: event.target.checked,
                      customCategoryName: event.target.checked
                        ? current.customCategoryName
                        : ""
                    }))
                  }
                />

                <span>
                  <span className="block text-sm font-black text-indigo-950">
                    Simpan sebagai kategori baru
                  </span>
                  <span className="mt-1 block text-xs font-medium leading-5 text-indigo-700">
                    Cocok untuk transaksi yang sering muncul, misalnya Laundry,
                    Parkir, Kopi, atau Freelance.
                  </span>
                </span>
              </label>

              {form.saveAsNewCategory ? (
                <div className="mt-4">
                  <Input
                    label="Nama kategori baru"
                    name="customCategoryName"
                    maxLength={MAX_CATEGORY_NAME_LENGTH}
                    placeholder={
                      form.type === "INCOME"
                        ? "Contoh: Freelance"
                        : "Contoh: Laundry"
                    }
                    value={form.customCategoryName}
                    onChange={(event) =>
                      setForm((current) => ({
                        ...current,
                        customCategoryName: event.target.value
                      }))
                    }
                  />

                  <p className="mt-2 flex items-start gap-2 text-xs font-medium leading-5 text-indigo-700">
                    <Plus className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                    Jika nama kategori sudah ada, Sakuin akan memakai kategori
                    tersebut dan tidak membuat duplikat.
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}

          {isLoadingCategories ? (
            <div className="flex items-center gap-2 rounded-[1.25rem] bg-[var(--sakuin-surface-soft)] px-4 py-3 text-xs font-medium text-[var(--sakuin-muted)]">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengambil daftar kategori...
            </div>
          ) : null}

          <Input
            label="Tanggal"
            name="date"
            type="date"
            value={form.date}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                date: event.target.value
              }))
            }
          />

          <label className="block w-full">
            <span className="mb-2 block text-sm font-semibold text-[var(--sakuin-text)]">
              Catatan
            </span>

            <textarea
              className="min-h-24 w-full resize-none rounded-[1.25rem] border border-[var(--sakuin-border)] bg-white px-4 py-3 text-sm text-[var(--sakuin-text)] outline-none transition placeholder:text-[var(--sakuin-muted)]/70 focus:border-[var(--sakuin-purple)] focus:ring-4 focus:ring-[var(--sakuin-purple)]/10"
              placeholder={
                form.type === "INCOME"
                  ? "Contoh: Gaji bulan ini"
                  : "Contoh: Makan siang"
              }
              value={form.note}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  note: event.target.value
                }))
              }
            />
          </label>

          <div className="grid gap-2 pt-2 sm:grid-cols-2">
            <Button
              disabled={isSubmitting}
              onClick={handleClose}
              type="button"
              variant="secondary"
            >
              Batal
            </Button>

            <Button
              disabled={isLoadingCategories || categoryOptions.length === 0}
              isLoading={isSubmitting}
              type="submit"
            >
              Simpan transaksi
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>

        <div className="mt-4 flex items-start gap-2 rounded-[1.25rem] bg-[var(--sakuin-surface-soft)] px-4 py-3 text-xs leading-5 text-[var(--sakuin-muted)]">
          <CalendarDays className="mt-0.5 h-4 w-4 shrink-0" />
          <p>
            Untuk kategori baru, pilih kategori Lain lalu aktifkan opsi simpan
            sebagai kategori baru. Kategori akan tersedia untuk transaksi
            berikutnya.
          </p>
        </div>
      </div>
    </div>
  );
}