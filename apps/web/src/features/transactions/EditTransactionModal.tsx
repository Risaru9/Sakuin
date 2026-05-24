import {
  useEffect,
  useMemo,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent
} from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle, ArrowRight, Loader2, Plus, X } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import {
  createCategory,
  getCategories
} from "../categories/category.service";
import type { Category } from "../categories/category.types";
import { updateTransaction } from "./transaction.service";
import {
  getTransactionListCacheSnapshot,
  markTransactionDerivedDataStale,
  restoreTransactionListCacheSnapshot,
  updateTransactionInListCaches
} from "./transaction-cache";
import type {
  Transaction,
  TransactionType,
  UpdateTransactionInput
} from "./transaction.types";
import { useToast } from "../../components/toast/ToastProvider";

const MIN_TRANSACTION_AMOUNT = 1;
const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
const MAX_TRANSACTION_AMOUNT_LABEL = "Rp 1.000.000.000.000";
const MAX_CATEGORY_NAME_LENGTH = 50;

type EditTransactionModalProps = {
  open: boolean;
  transaction: Transaction | null;
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
};

type FormState = {
  type: TransactionType;
  amount: string;
  categoryId: string;
  date: string;
  note: string;
  saveAsNewCategory: boolean;
  customCategoryName: string;
};

type UpdateTransactionMutationInput = {
  transactionId: string;
  input: UpdateTransactionInput;
  optimisticTransaction: Transaction;
  customCategoryName?: string;
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Gagal mengupdate transaksi.";
}

function toDateInputValue(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return new Date().toISOString().slice(0, 10);
  }

  return date.toISOString().slice(0, 10);
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

function getTransactionCategoryId(transaction: Transaction) {
  return transaction.categoryId || transaction.category?.id || "";
}

function resolveCategoryId({
  transaction,
  categories,
  type
}: {
  transaction: Transaction;
  categories: Category[];
  type: TransactionType;
}) {
  const directCategoryId = getTransactionCategoryId(transaction);

  const directMatch = categories.find(
    (category) => category.id === directCategoryId && category.type === type
  );

  if (directMatch) {
    return directMatch.id;
  }

  const nameMatch = categories.find(
    (category) =>
      category.type === type &&
      category.name.toLowerCase() === transaction.category.name.toLowerCase()
  );

  if (nameMatch) {
    return nameMatch.id;
  }

  const firstCategoryByType = sortCategoryOptions(
    categories.filter((category) => category.type === type)
  )[0];

  return firstCategoryByType?.id ?? "";
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

export function EditTransactionModal({
  open,
  transaction,
  onClose,
  onSuccess
}: EditTransactionModalProps) {
  const [form, setForm] = useState<FormState>({
    type: "EXPENSE",
    amount: "",
    categoryId: "",
    date: new Date().toISOString().slice(0, 10),
    note: "",
    saveAsNewCategory: false,
    customCategoryName: ""
  });

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

  const updateTransactionMutation = useMutation({
    mutationFn: async ({
      transactionId,
      input,
      customCategoryName
    }: UpdateTransactionMutationInput) => {
      if (!customCategoryName) {
        return {
          updatedTransaction: await updateTransaction(transactionId, input),
          createdCategory: null
        };
      }

      const transactionType = input.type;

      if (!transactionType) {
        throw new Error("Tipe transaksi wajib diisi.");
      }

      const existingCategory = findCategoryByName(
        categories,
        transactionType,
        customCategoryName
      );

      const category =
        existingCategory ??
        (await createCategory({
          name: customCategoryName,
          type: transactionType,
          icon: null,
          color: null
        }));

      const updatedTransaction = await updateTransaction(transactionId, {
        ...input,
        categoryId: category.id
      });

      return {
        updatedTransaction,
        createdCategory: existingCategory ? null : category
      };
    },
    onMutate: async ({ optimisticTransaction }) => {
      setError(null);
      onClose();

      await queryClient.cancelQueries({
        queryKey: queryKeys.transactions.all
      });

      const previousTransactionQueries =
        getTransactionListCacheSnapshot(queryClient);

      updateTransactionInListCaches(queryClient, optimisticTransaction);

      return {
        previousTransactionQueries
      };
    },

    onError: (caughtError, _variables, context) => {
      restoreTransactionListCacheSnapshot(
        queryClient,
        context?.previousTransactionQueries
      );

      addToast({
        variant: "error",
        title: "Gagal memperbarui transaksi",
        description: getErrorMessage(caughtError)
      });
    },

    onSuccess: ({ updatedTransaction, createdCategory }) => {
      updateTransactionInListCaches(queryClient, updatedTransaction);

      addToast({
        variant: "success",
        title: "Transaksi berhasil diperbarui",
        description: createdCategory
          ? `Kategori "${createdCategory.name}" ikut disimpan untuk transaksi berikutnya.`
          : "Perubahan transaksi sudah tersimpan."
      });

      void onSuccess();
    },
        onSettled: (_data, _error, variables) => {
      markTransactionDerivedDataStale(queryClient, {
        includeCategories: Boolean(variables?.customCategoryName)
      });
    }
  });

  const isSubmitting = updateTransactionMutation.isPending;

  function resetError() {
    setError(null);
  }

  function handleClose() {
    if (isSubmitting) {
      return;
    }

    resetError();
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

    if (!transaction) {
      return;
    }

    const amountError = validateTransactionAmount(form.amount);

    if (amountError) {
      setError(amountError);
      return;
    }

    if (!form.categoryId) {
      setError("Kategori wajib dipilih.");
      return;
    }

    const selectedCategoryForSubmit = categoryOptions.find(
      (category) => category.id === form.categoryId
    );

    if (!selectedCategoryForSubmit) {
      setError("Kategori tidak valid. Silakan pilih kategori lain.");
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

    const nextDate = toIsoDate(form.date);
    const nextNote = form.note.trim() || null;

    const input: UpdateTransactionInput = {
      type: form.type,
      amount: form.amount.trim(),
      categoryId: form.categoryId,
      date: nextDate,
      note: nextNote ?? undefined
    };

    const optimisticCategory = form.saveAsNewCategory
      ? {
          id: selectedCategoryForSubmit.id,
          name: normalizedCustomCategoryName,
          type: form.type,
          icon: null,
          color: null,
          isDefault: false
        }
      : mapCategoryToTransactionCategory(selectedCategoryForSubmit);

    const optimisticTransaction: Transaction = {
      ...transaction,
      type: form.type,
      amount: form.amount.trim(),
      categoryId: form.categoryId,
      date: nextDate,
      note: nextNote,
      category: optimisticCategory,
      updatedAt: new Date().toISOString()
    };

    setError(null);

    updateTransactionMutation.mutate({
      transactionId: transaction.id,
      input,
      optimisticTransaction,
      customCategoryName: form.saveAsNewCategory
        ? normalizedCustomCategoryName
        : undefined
    });
  }

  useEffect(() => {
    if (!open || !transaction) {
      return;
    }

    setError(null);

    const resolvedCategoryId =
      categories.length > 0
        ? resolveCategoryId({
            transaction,
            categories,
            type: transaction.type
          })
        : getTransactionCategoryId(transaction);

    setForm({
      type: transaction.type,
      amount: transaction.amount,
      categoryId: resolvedCategoryId,
      date: toDateInputValue(transaction.date),
      note: transaction.note ?? "",
      saveAsNewCategory: false,
      customCategoryName: ""
    });
  }, [open, transaction, categories]);

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

  if (!open || !transaction) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/35 px-4 py-4 backdrop-blur-md sm:items-center">
      <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-sm font-bold text-indigo-700">
              Edit transaksi
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-slate-950">
              Perbaiki data transaksi
            </h2>
            <p className="mt-1 text-sm leading-6 text-slate-500">
              Ubah nominal, kategori, tanggal, atau catatan transaksi yang
              keliru. Jika kategorinya belum ada, pilih kategori Lain lalu
              simpan sebagai kategori baru.
            </p>
          </div>

          <button
            aria-label="Tutup modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isSubmitting}
            onClick={handleClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {categoryError ? (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p>{categoryError}</p>
              <button
                className="mt-2 font-bold underline"
                onClick={() => void categoriesQuery.refetch()}
                type="button"
              >
                Ambil kategori lagi
              </button>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        ) : null}

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <p className="mb-2 text-sm font-semibold text-slate-950">
              Tipe transaksi
            </p>

            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
              <button
                className={
                  form.type === "EXPENSE"
                    ? "rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"
                    : "rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
                }
                onClick={() => handleTypeChange("EXPENSE")}
                type="button"
              >
                Expense
              </button>

              <button
                className={
                  form.type === "INCOME"
                    ? "rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"
                    : "rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
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

          <p className="-mt-2 text-xs font-medium text-slate-500">
            Maksimal nominal transaksi adalah {MAX_TRANSACTION_AMOUNT_LABEL}.
          </p>

          <label className="block w-full">
            <span className="mb-2 block text-sm font-semibold text-slate-950">
              Kategori
            </span>

            <select
              className="min-h-12 w-full rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500"
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

              {!isLoadingCategories && categoryOptions.length > 0 ? (
                <option value="" disabled>
                  Pilih kategori
                </option>
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
            <div className="flex items-center gap-2 rounded-2xl bg-slate-100 px-4 py-3 text-xs font-medium text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin" />
              Mengambil kategori...
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
            <span className="mb-2 block text-sm font-semibold text-slate-950">
              Catatan
            </span>

            <textarea
              className="min-h-24 w-full resize-none rounded-[1.25rem] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition placeholder:text-slate-400 focus:border-indigo-600 focus:ring-4 focus:ring-indigo-600/10"
              placeholder="Contoh: Makan siang"
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
              Simpan perubahan
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}