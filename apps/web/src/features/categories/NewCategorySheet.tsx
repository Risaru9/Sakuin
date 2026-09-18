import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BottomSheet,
  CATEGORY_ICON_CHOICES,
  CategoryBadge,
  SegmentedControl,
  StickerButton
} from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { createCategory } from "./category.service";
import type { Category, CategoryType, CreateCategoryInput } from "./category.types";

type NewCategorySheetProps = {
  open: boolean;
  onClose: () => void;
  initialType: CategoryType;
  /** Called with the saved category, e.g. to select it in the picker that opened this sheet. */
  onCreated: (category: Category) => void;
};

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Pengeluaran" },
  { value: "INCOME", label: "Pemasukan" }
];

const NAME_MAX_LENGTH = 50;

function FieldLabel({ htmlFor, children }: { htmlFor?: string; children: string }) {
  const className = "mt-4 mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase";

  return htmlFor ? (
    <label className={className} htmlFor={htmlFor}>
      {children}
    </label>
  ) : (
    <p className={className}>{children}</p>
  );
}

export function NewCategorySheet({ open, onClose, initialType, onCreated }: NewCategorySheetProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const nameId = useId();
  const limitId = useId();
  const [name, setName] = useState("");
  const [type, setType] = useState<CategoryType>(initialType);
  const [icon, setIcon] = useState<string>(CATEGORY_ICON_CHOICES[initialType][0]);
  const [limitText, setLimitText] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName("");
    setType(initialType);
    setIcon(CATEGORY_ICON_CHOICES[initialType][0]);
    setLimitText("");
    setError(null);
  }, [open, initialType]);

  const createMutation = useMutation({
    mutationFn: (input: CreateCategoryInput) => createCategory(input),
    onSuccess: (category) => {
      queryClient.setQueryData<Category[]>(queryKeys.categories, (current) =>
        current ? [...current, category] : current
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories, refetchType: "inactive" });
      onCreated(category);
      onClose();
    },
    onError: (caughtError) => {
      setError(
        caughtError instanceof ApiClientError || caughtError instanceof Error
          ? caughtError.message
          : "Kategori belum tersimpan. Coba lagi."
      );
    }
  });

  function changeType(nextType: CategoryType) {
    setType(nextType);
    setIcon(CATEGORY_ICON_CHOICES[nextType][0]);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    // This sheet can open from inside another form; keep its submit from reaching that form.
    event.stopPropagation();
    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Beri nama kategorinya dulu, misalnya Laundry.");
      return;
    }

    const limit = type === "EXPENSE" && limitText.trim() ? parseAmountInput(limitText) : null;

    if (type === "EXPENSE" && limitText.trim() && limit === null) {
      setError("Batas per bulan harus berupa angka, misalnya 100.000.");
      return;
    }

    setError(null);
    createMutation.mutate({ name: trimmedName, type, icon, limit });
  }

  return (
    <BottomSheet
      footer={
        <StickerButton form={formId} fullWidth isLoading={createMutation.isPending} type="submit">
          Tambah kategori
        </StickerButton>
      }
      leading={<CategoryBadge className="motion-safe:animate-saku-pop" icon={icon} size={44} key={icon} />}
      onClose={onClose}
      open={open}
      subtitle="Buat sesuai kebiasaanmu"
      title="Kategori baru"
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <FieldLabel htmlFor={nameId}>Nama</FieldLabel>
        <input
          autoComplete="off"
          className="saku-line min-h-[50px] w-full rounded-saku-control bg-saku-paper px-3.5 text-base font-extrabold text-saku-ink outline-none placeholder:font-bold placeholder:text-saku-muted focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          id={nameId}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="Misal Laundry"
          value={name}
        />

        <SegmentedControl
          ariaLabel="Jenis kategori"
          className="mt-3 bg-saku-bg"
          onChange={changeType}
          options={TYPE_OPTIONS}
          value={type}
        />

        <FieldLabel>Ikon</FieldLabel>
        <div aria-label="Pilih ikon" className="grid grid-cols-6 gap-2" role="radiogroup">
          {CATEGORY_ICON_CHOICES[type].map((choice) => {
            const selected = choice === icon;

            return (
              <button
                aria-checked={selected}
                aria-label={`Ikon ${choice}`}
                className={cn(
                  "flex h-12 items-center justify-center rounded-saku-control focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
                  selected ? "saku-line-thin bg-saku-coin shadow-saku-xs" : "saku-line-hair bg-saku-paper"
                )}
                key={choice}
                onClick={() => setIcon(choice)}
                role="radio"
                type="button"
              >
                <CategoryBadge icon={choice} size={34} />
              </button>
            );
          })}
        </div>

        {type === "EXPENSE" ? (
          <>
            <FieldLabel htmlFor={limitId}>Batas per bulan (boleh kosong)</FieldLabel>
            <div className="saku-line flex min-h-[50px] items-center gap-2 rounded-saku-control bg-saku-paper px-3.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
              <span aria-hidden="true" className="font-saku-head text-base font-semibold text-saku-muted">
                Rp
              </span>
              <input
                autoComplete="off"
                className="min-w-0 flex-1 bg-transparent font-saku-head font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
                id={limitId}
                inputMode="decimal"
                // Inline so the global 16px mobile input rule (iOS zoom guard) cannot shrink it.
                style={{ fontSize: "20px" }}
                onChange={(event) => setLimitText(formatAmountInput(event.target.value))}
                placeholder="100.000"
                value={limitText}
              />
            </div>
          </>
        ) : null}

        {error ? (
          <p className="mt-3 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-extrabold text-saku-over-text" role="alert">
            {error}
          </p>
        ) : null}
      </form>
    </BottomSheet>
  );
}
