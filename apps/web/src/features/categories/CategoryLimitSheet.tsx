import { useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BottomSheet,
  CategoryBadge,
  SakuMascot,
  showSnack,
  StickerButton,
  StickerChip
} from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { describeBudget, getBudgetStatus } from "../laporan/laporan-data";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { setCategoryLimit } from "./category.service";
import type { Category } from "./category.types";

type CategoryLimitSheetProps = {
  category: Category | null;
  /** Spending in the month the report shows. */
  spent: number;
  /** "Bulan ini" or the month name, for the preview card. */
  periodLabel: string;
  onClose: () => void;
};

const QUICK_LIMITS = [500_000, 1_000_000, 1_500_000, 2_000_000];

const amountFormatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });

function shortLimitLabel(value: number) {
  return value >= 1_000_000
    ? `${(value / 1_000_000).toLocaleString("id-ID")} jt`
    : `${Math.round(value / 1_000)} rb`;
}

const BAR_CLASS = {
  ok: "bg-saku-accent",
  watch: "bg-saku-watch",
  over: "bg-saku-over"
} as const;

function LimitForm({ category, spent, periodLabel, onClose }: CategoryLimitSheetProps & { category: Category }) {
  const queryClient = useQueryClient();
  const inputId = useId();
  const initialLimit = category.limit && category.limit > 0 ? category.limit : null;
  const [limitText, setLimitText] = useState(() => (initialLimit ? amountToInput(initialLimit) : ""));
  const [error, setError] = useState<string | null>(null);

  const trimmed = limitText.trim();
  const limit = trimmed ? parseAmountInput(trimmed) : null;
  const isInvalid = trimmed !== "" && limit === null;
  const isDirty = limit !== initialLimit;
  const status = limit ? getBudgetStatus(spent, limit) : null;
  const percent = limit ? Math.round((spent / limit) * 100) : 0;

  const saveMutation = useMutation({
    mutationFn: (nextLimit: number | null) => setCategoryLimit(category.id, nextLimit),
    onSuccess: (saved) => {
      queryClient.setQueryData<Category[]>(queryKeys.categories, (current) =>
        current?.map((item) => (item.id === saved.id ? { ...item, limit: saved.limit } : item))
      );
      void queryClient.invalidateQueries({ queryKey: queryKeys.categories, refetchType: "inactive" });
      showSnack({
        title: saved.limit ? `Batas ${category.name} disimpan` : `Batas ${category.name} dihapus`,
        detail: saved.limit ? `${amountFormatter.format(saved.limit)} per bulan` : "Sekarang tanpa batas",
        mood: "happy"
      });
      onClose();
    },
    onError: (caughtError) => {
      setError(
        caughtError instanceof ApiClientError || caughtError instanceof Error
          ? caughtError.message
          : "Batas belum tersimpan. Coba lagi."
      );
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    event.stopPropagation();

    if (isInvalid) {
      setError("Batas harus angka lebih dari 0, misalnya 1.000.000.");
      return;
    }

    setError(null);
    saveMutation.mutate(limit);
  }

  const message = !limit
    ? "Tanpa batas. Kategori ini tidak muncul di daftar anggaran."
    : status === "over"
      ? `Sudah ${describeBudget(spent, limit).toLowerCase()}.`
      : status === "watch"
        ? `${describeBudget(spent, limit)}. Pelan-pelan, ya.`
        : `Masih lega · ${describeBudget(spent, limit).toLowerCase()}.`;

  return (
    <form noValidate onSubmit={handleSubmit}>
      <label className="mb-1.5 block text-xs font-black tracking-[0.05em] text-saku-muted uppercase" htmlFor={inputId}>
        Batas per bulan
      </label>
      <div className="saku-line flex min-h-[60px] items-baseline gap-1.5 rounded-saku-control bg-saku-paper px-3.5 py-2 focus-within:ring-4 focus-within:ring-saku-accent/30">
        <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
          Rp
        </span>
        <input
          autoComplete="off"
          className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold outline-none placeholder:text-saku-muted/60"
          id={inputId}
          inputMode="decimal"
          onChange={(event) => {
            setLimitText(formatAmountInput(event.target.value));
            setError(null);
          }}
          placeholder="Tanpa batas"
          // Inline so the global 16px mobile input rule (iOS zoom guard) cannot shrink it.
          style={{ fontSize: "30px" }}
          value={limitText}
        />
      </div>

      <div aria-label="Pilihan cepat" className="mt-2.5 flex flex-wrap gap-2" role="group">
        {QUICK_LIMITS.map((value) => (
          <StickerChip active={limit === value} key={value} onClick={() => setLimitText(amountToInput(value))}>
            {shortLimitLabel(value)}
          </StickerChip>
        ))}
        <StickerChip active={!trimmed} onClick={() => setLimitText("")}>
          Tanpa batas
        </StickerChip>
      </div>

      <p className="mt-4 mb-1.5 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">{periodLabel}</p>
      <div className="saku-line-thin rounded-[18px] bg-saku-bg px-3.5 py-3">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-saku-head text-xl font-semibold">{amountFormatter.format(spent)}</span>
          <span className="text-xs font-extrabold text-saku-muted">
            {limit ? `dari ${amountFormatter.format(limit)} (${percent}%)` : "tanpa batas"}
          </span>
        </div>
        {limit && status ? (
          <div
            aria-hidden="true"
            className="saku-line-thin mt-2 h-3.5 overflow-hidden rounded-full bg-saku-paper"
          >
            <div
              className={cn("h-full", BAR_CLASS[status], percent < 100 && "border-r-2 border-saku-ink")}
              style={{ width: `${Math.min(100, percent)}%` }}
            />
          </div>
        ) : null}
        <div className="mt-2.5 flex items-center gap-2.5">
          <SakuMascot animated mood={status === "over" || status === "watch" ? "worried" : "happy"} size={44} />
          <p
            aria-live="polite"
            className={cn(
              "text-[13px] font-extrabold",
              status === "over" ? "text-saku-over-text" : status === "watch" ? "text-saku-watch-text" : "text-saku-ink"
            )}
          >
            {message}
          </p>
        </div>
      </div>

      {error || isInvalid ? (
        <p className="mt-3 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-extrabold text-saku-over-text" role="alert">
          {error ?? "Batas harus angka lebih dari 0, misalnya 1.000.000."}
        </p>
      ) : null}

      <StickerButton
        className="mt-4"
        disabled={!isDirty || isInvalid}
        fullWidth
        isLoading={saveMutation.isPending}
        type="submit"
      >
        Simpan batas
      </StickerButton>
    </form>
  );
}

/** "Atur batas": set, change or remove a category's monthly limit with a live preview. */
export function CategoryLimitSheet({ category, onClose, ...rest }: CategoryLimitSheetProps) {
  return (
    <BottomSheet
      leading={category ? <CategoryBadge icon={category.icon} name={category.name} size={44} /> : undefined}
      onClose={onClose}
      open={Boolean(category)}
      subtitle={
        category
          ? category.isDefault
            ? "Kategori bawaan · batasnya hanya untukmu"
            : "Kategori buatanmu"
          : undefined
      }
      title={category?.name ?? ""}
    >
      {category ? <LimitForm category={category} key={category.id} onClose={onClose} {...rest} /> : null}
    </BottomSheet>
  );
}
