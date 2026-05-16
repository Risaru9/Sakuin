import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AlertTriangle,
  Edit3,
  Loader2,
  Plus,
  RefreshCcw,
  Tags,
  Trash2,
  X
} from "lucide-react";
import { AppShell } from "../../components/layout/AppShell";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { useToast } from "../../components/toast/ToastProvider";
import { ApiClientError } from "../../lib/api-client";
import {
  createCategory,
  deleteCategory,
  getCategories,
  updateCategory
} from "./category.service";
import type { Category, CategoryType } from "./category.types";

type CategoryFilter = "ALL" | CategoryType;

type FormState = {
  name: string;
  type: CategoryType;
  icon: string;
  color: string;
};

const initialForm: FormState = {
  name: "",
  type: "EXPENSE",
  icon: "",
  color: ""
};

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan.";
}

function getCategoryTypeLabel(type: CategoryType) {
  return type === "INCOME" ? "Income" : "Expense";
}

function getCategoryTypeClassName(type: CategoryType) {
  return type === "INCOME"
    ? "bg-emerald-100 text-emerald-700"
    : "bg-rose-100 text-rose-700";
}

function normalizeOptionalValue(value: string) {
  const trimmedValue = value.trim();

  return trimmedValue.length > 0 ? trimmedValue : null;
}

export function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [filter, setFilter] = useState<CategoryFilter>("ALL");
  const [form, setForm] = useState<FormState>(initialForm);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const { addToast } = useToast();

  const filteredCategories = useMemo(() => {
    if (filter === "ALL") {
      return categories;
    }

    return categories.filter((category) => category.type === filter);
  }, [categories, filter]);

  const defaultCategories = filteredCategories.filter(
    (category) => category.isDefault
  );

  const customCategories = filteredCategories.filter(
    (category) => !category.isDefault
  );

  async function loadCategories() {
    setIsLoading(true);
    setError(null);

    try {
      const data = await getCategories();
      setCategories(data);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsLoading(false);
    }
  }

  function resetForm() {
    setForm(initialForm);
    setEditingCategory(null);
    setError(null);
  }

  function startEditCategory(category: Category) {
    if (category.isDefault) {
      addToast({
        variant: "info",
        title: "Kategori default tidak bisa diedit",
        description: "Kategori bawaan sistem hanya bisa digunakan, bukan diubah."
      });
      return;
    }

    setEditingCategory(category);
    setForm({
      name: category.name,
      type: category.type,
      icon: category.icon ?? "",
      color: category.color ?? ""
    });
    setError(null);

    window.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const categoryName = form.name.trim();

    if (!categoryName) {
      setError("Nama kategori wajib diisi.");
      return;
    }

    if (categoryName.length > 50) {
      setError("Nama kategori maksimal 50 karakter.");
      return;
    }

    setError(null);
    setIsSubmitting(true);

    try {
      if (editingCategory) {
        await updateCategory(editingCategory.id, {
          name: categoryName,
          type: form.type,
          icon: normalizeOptionalValue(form.icon),
          color: normalizeOptionalValue(form.color)
        });

        addToast({
          variant: "success",
          title: "Kategori berhasil diperbarui",
          description: "Perubahan kategori custom sudah tersimpan."
        });
      } else {
        await createCategory({
          name: categoryName,
          type: form.type,
          icon: normalizeOptionalValue(form.icon),
          color: normalizeOptionalValue(form.color)
        });

        addToast({
          variant: "success",
          title: "Kategori berhasil dibuat",
          description: "Kategori custom baru sudah tersedia untuk transaksi."
        });
      }

      resetForm();
      await loadCategories();
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      setError(message);
      addToast({
        variant: "error",
        title: editingCategory
          ? "Gagal memperbarui kategori"
          : "Gagal membuat kategori",
        description: message
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    if (!categoryToDelete) {
      return;
    }

    setDeletingId(categoryToDelete.id);

    try {
      await deleteCategory(categoryToDelete.id);

      addToast({
        variant: "success",
        title: "Kategori berhasil dihapus",
        description: "Kategori custom sudah dihapus dari daftar."
      });

      setCategoryToDelete(null);
      await loadCategories();
    } catch (caughtError) {
      const message = getErrorMessage(caughtError);

      addToast({
        variant: "error",
        title: "Gagal menghapus kategori",
        description: message
      });
    } finally {
      setDeletingId(null);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  return (
    <AppShell>
      <header className="mb-5 flex flex-col gap-4 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-black text-indigo-700">Sakuin Category</p>
          <h1 className="mt-1 text-2xl font-black tracking-tight text-slate-950 sm:text-4xl">
            Kelola Kategori
          </h1>
          <p className="mt-1 text-sm font-medium text-slate-500">
            Buat dan atur kategori custom untuk transaksi pemasukan dan
            pengeluaran.
          </p>
        </div>

        <Button
          className="rounded-2xl"
          onClick={() => void loadCategories()}
          type="button"
          variant="secondary"
        >
          <RefreshCcw className="h-4 w-4" />
          Refresh
        </Button>
      </header>

      <section className="mb-5 grid gap-5 lg:grid-cols-[420px_minmax(0,1fr)]">
        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-5 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-black text-slate-950">
                {editingCategory ? "Edit kategori" : "Tambah kategori"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-500">
                {editingCategory
                  ? "Ubah kategori custom yang sudah kamu buat."
                  : "Kategori custom akan muncul saat tambah atau edit transaksi."}
              </p>
            </div>

            {editingCategory ? (
              <button
                aria-label="Batal edit"
                className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
                onClick={resetForm}
                type="button"
              >
                <X className="h-5 w-5" />
              </button>
            ) : null}
          </div>

          {error ? (
            <div className="mb-4 flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Nama kategori"
              name="name"
              placeholder="Contoh: Transportasi"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value
                }))
              }
            />

            <div>
              <p className="mb-2 text-sm font-semibold text-slate-950">
                Tipe kategori
              </p>

              <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-100 p-1">
                <button
                  className={
                    form.type === "EXPENSE"
                      ? "rounded-2xl bg-slate-950 px-4 py-3 text-sm font-black text-white shadow-sm"
                      : "rounded-2xl px-4 py-3 text-sm font-black text-slate-600 transition hover:bg-white"
                  }
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      type: "EXPENSE"
                    }))
                  }
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
                  onClick={() =>
                    setForm((current) => ({
                      ...current,
                      type: "INCOME"
                    }))
                  }
                  type="button"
                >
                  Income
                </button>
              </div>
            </div>

            <Input
              label="Icon"
              name="icon"
              placeholder="Contoh: car, wallet, coffee"
              value={form.icon}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  icon: event.target.value
                }))
              }
            />

            <Input
              label="Warna"
              name="color"
              placeholder="Contoh: #0ea5e9"
              value={form.color}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  color: event.target.value
                }))
              }
            />

            <div className="grid gap-2 pt-2 sm:grid-cols-2">
              <Button
                disabled={isSubmitting}
                onClick={resetForm}
                type="button"
                variant="secondary"
              >
                Reset
              </Button>

              <Button disabled={isSubmitting} isLoading={isSubmitting} type="submit">
                {editingCategory ? "Simpan perubahan" : "Tambah kategori"}
                {!isSubmitting ? <Plus className="h-4 w-4" /> : null}
              </Button>
            </div>
          </form>
        </div>

        <div className="rounded-[1.75rem] border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_320px] sm:items-center">
            <div>
              <p className="text-sm font-black text-slate-950">
                Daftar kategori
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                Default category berasal dari sistem. Custom category bisa kamu
                edit atau hapus.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2 rounded-2xl bg-slate-100 p-1">
              {(["ALL", "INCOME", "EXPENSE"] as const).map((item) => (
                <button
                  className={
                    filter === item
                      ? "rounded-xl bg-slate-950 px-3 py-2 text-xs font-black text-white"
                      : "rounded-xl px-3 py-2 text-xs font-black text-slate-600 hover:bg-white"
                  }
                  key={item}
                  onClick={() => setFilter(item)}
                  type="button"
                >
                  {item === "ALL" ? "Semua" : item}
                </button>
              ))}
            </div>
          </div>

          {isLoading ? (
            <div className="flex min-h-52 items-center justify-center rounded-[1.5rem] border border-slate-200 bg-slate-50">
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 className="h-5 w-5 animate-spin" />
                <p className="text-sm font-bold">Mengambil kategori...</p>
              </div>
            </div>
          ) : null}

          {!isLoading && filteredCategories.length === 0 ? (
            <div className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-8 text-center">
              <Tags className="mx-auto h-8 w-8 text-slate-400" />
              <p className="mt-3 text-lg font-black text-slate-950">
                Belum ada kategori
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Tambahkan kategori custom atau ubah filter kategori.
              </p>
            </div>
          ) : null}

          {!isLoading && filteredCategories.length > 0 ? (
            <div className="space-y-5">
              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Custom Category
                </p>

                {customCategories.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-5 text-sm font-medium text-slate-500">
                    Belum ada custom category untuk filter ini.
                  </div>
                ) : (
                  <div className="grid gap-3">
                    {customCategories.map((category) => (
                      <div
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-slate-300 hover:shadow-md"
                        key={category.id}
                      >
                        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                              <Tags className="h-5 w-5" />
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-black text-slate-950">
                                {category.name}
                              </p>
                              <p className="mt-1 text-xs font-medium text-slate-500">
                                {category.icon || "Tanpa icon"} ·{" "}
                                {category.color || "Tanpa warna"}
                              </p>
                            </div>
                          </div>

                          <div className="grid gap-2 sm:grid-cols-[auto_90px_90px] sm:items-center">
                            <span
                              className={`inline-flex justify-center rounded-full px-3 py-1 text-xs font-black ${getCategoryTypeClassName(
                                category.type
                              )}`}
                            >
                              {getCategoryTypeLabel(category.type)}
                            </span>

                            <button
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-slate-100 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-200"
                              onClick={() => startEditCategory(category)}
                              type="button"
                            >
                              <Edit3 className="h-4 w-4" />
                              Edit
                            </button>

                            <button
                              className="inline-flex min-h-10 items-center justify-center gap-2 rounded-2xl bg-rose-50 px-3 text-xs font-black text-rose-700 transition hover:bg-rose-100"
                              onClick={() => setCategoryToDelete(category)}
                              type="button"
                            >
                              <Trash2 className="h-4 w-4" />
                              Hapus
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-3 text-xs font-black uppercase tracking-[0.2em] text-slate-400">
                  Default Category
                </p>

                <div className="grid gap-3">
                  {defaultCategories.map((category) => (
                    <div
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      key={category.id}
                    >
                      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-white text-slate-700">
                            <Tags className="h-5 w-5" />
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-950">
                              {category.name}
                            </p>
                            <p className="mt-1 text-xs font-medium text-slate-500">
                              Kategori bawaan sistem
                            </p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${getCategoryTypeClassName(
                              category.type
                            )}`}
                          >
                            {getCategoryTypeLabel(category.type)}
                          </span>

                          <span className="inline-flex rounded-full bg-slate-200 px-3 py-1 text-xs font-black text-slate-600">
                            Default
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}
        </div>
      </section>

      <ConfirmDialog
        open={Boolean(categoryToDelete)}
        title="Hapus kategori?"
        description={
          categoryToDelete
            ? `Kategori "${categoryToDelete.name}" akan dihapus. Kategori yang sudah digunakan transaksi tidak bisa dihapus.`
            : "Kategori akan dihapus."
        }
        confirmText="Hapus"
        cancelText="Batal"
        loading={Boolean(
          categoryToDelete && deletingId === categoryToDelete.id
        )}
        variant="danger"
        onClose={() => {
          if (!deletingId) {
            setCategoryToDelete(null);
          }
        }}
        onConfirm={() => void handleDeleteCategory()}
      />
    </AppShell>
  );
}