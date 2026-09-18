import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Trash2 } from "lucide-react";
import { BottomSheet, SegmentedControl, showSnack, StickerButton, StickerChip } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { cn } from "../../lib/cn";
import { queryKeys } from "../../lib/query-keys";
import { CategoryPickerGrid, sortCategoriesForPicker } from "../categories/CategoryPickerGrid";
import type { Category, CategoryType } from "../categories/category.types";
import { SheetError, SheetFieldLabel } from "../lainnya/SubPageParts";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { WEEKDAY_NAMES } from "./recurring-data";
import { createRecurringRule, deleteRecurringRule, updateRecurringRule } from "./recurring.service";
import type { RecurringFrequency, RecurringRule } from "./recurring.types";

type RecurringRuleSheetProps = {
  open: boolean;
  /** null creates a new rule. */
  rule: RecurringRule | null;
  categories: Category[];
  onClose: () => void;
};

const TYPE_OPTIONS: Array<{ value: CategoryType; label: string }> = [
  { value: "EXPENSE", label: "Pengeluaran" },
  { value: "INCOME", label: "Pemasukan" }
];

const FREQUENCY_OPTIONS: Array<{ value: RecurringFrequency; label: string }> = [
  { value: "MONTHLY", label: "Tiap bulan" },
  { value: "WEEKLY", label: "Tiap minggu" }
];

// Monday first, the way most calendars here start the week.
const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0];
const MONTH_DAYS = Array.from({ length: 28 }, (_, index) => index + 1);

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError || error instanceof Error ? error.message : fallback;
}

export function RecurringRuleSheet({ open, rule, categories, onClose }: RecurringRuleSheetProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const nameId = useId();
  const amountId = useId();
  const dayId = useId();
  const [type, setType] = useState<CategoryType>("EXPENSE");
  const [name, setName] = useState("");
  const [amountText, setAmountText] = useState("");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [frequency, setFrequency] = useState<RecurringFrequency>("MONTHLY");
  const [dayOfMonth, setDayOfMonth] = useState(1);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setType(rule?.type ?? "EXPENSE");
    setName(rule?.note ?? "");
    setAmountText(rule ? amountToInput(rule.amount) : "");
    setCategoryId(rule?.categoryId ?? null);
    setFrequency(rule?.frequency ?? "MONTHLY");
    setDayOfMonth(rule?.dayOfMonth ?? Math.min(new Date().getDate(), 28));
    setDayOfWeek(rule?.dayOfWeek ?? 1);
    setError(null);
    setConfirmDelete(false);
  }, [open, rule]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.recurring });
    void queryClient.invalidateQueries({ queryKey: queryKeys.summary });
  }

  const saveMutation = useMutation({
    mutationFn: ({ amount, category }: { amount: number; category: string }) => {
      const input = {
        type,
        categoryId: category,
        amount: String(amount),
        note: name.trim() || null,
        frequency,
        dayOfMonth: frequency === "MONTHLY" ? dayOfMonth : null,
        dayOfWeek: frequency === "WEEKLY" ? dayOfWeek : null
      };

      return rule
        ? updateRecurringRule(rule.id, input)
        : createRecurringRule({
            ...input,
            interval: 1,
            startDate: new Date().toISOString(),
            autoPost: true,
            isActive: true
          });
    },
    onSuccess: () => {
      refresh();
      showSnack({ title: rule ? "Jadwal disimpan" : "Jadwal baru dibuat", detail: "Saku mencatatnya saat tanggalnya tiba", mood: "happy" });
      onClose();
    },
    onError: (caughtError) => setError(errorMessage(caughtError, "Jadwal belum tersimpan. Coba lagi."))
  });

  const deleteMutation = useMutation({
    mutationFn: (ruleId: string) => deleteRecurringRule(ruleId),
    onSuccess: () => {
      refresh();
      showSnack({ title: "Jadwal dihapus", detail: "Catatan yang sudah dibuat tetap ada", mood: "happy" });
      onClose();
    },
    onError: (caughtError) => {
      setConfirmDelete(false);
      setError(errorMessage(caughtError, "Jadwal belum bisa dihapus. Coba lagi."));
    }
  });

  function changeType(nextType: CategoryType) {
    setType(nextType);
    setCategoryId(null);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const amount = parseAmountInput(amountText);
    // Without a pick, fall back to the first category of this kind (usually the main one).
    const category = categoryId ?? sortCategoriesForPicker(categories, type)[0]?.id ?? null;

    if (!amount || amount <= 0) {
      setError("Isi nominalnya dulu, misalnya 350.000.");
      return;
    }

    if (!category) {
      setError("Pilih kategorinya dulu.");
      return;
    }

    setError(null);
    saveMutation.mutate({ amount, category });
  }

  return (
    <BottomSheet
      footer={
        confirmDelete && rule ? (
          <div className="flex gap-2.5">
            <StickerButton onClick={() => setConfirmDelete(false)} variant="plain">
              Batal
            </StickerButton>
            <StickerButton
              className="flex-1"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(rule.id)}
              variant="danger"
            >
              Ya, hapus
            </StickerButton>
          </div>
        ) : (
          <StickerButton form={formId} fullWidth isLoading={saveMutation.isPending} type="submit">
            {rule ? "Simpan" : "Buat jadwal"}
          </StickerButton>
        )
      }
      onClose={onClose}
      open={open}
      subtitle="Tagihan, kos, gaji, atau uang saku"
      title={rule ? "Ubah jadwal" : "Transaksi berulang baru"}
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SegmentedControl ariaLabel="Jenis transaksi" className="mt-1 bg-saku-bg" onChange={changeType} options={TYPE_OPTIONS} value={type} />

        <SheetFieldLabel htmlFor={nameId}>Nama</SheetFieldLabel>
        <input
          autoComplete="off"
          className="saku-line min-h-[50px] w-full rounded-saku-control bg-saku-paper px-3.5 text-base font-extrabold text-saku-ink outline-none placeholder:font-bold placeholder:text-saku-muted focus-visible:ring-4 focus-visible:ring-saku-accent/30"
          id={nameId}
          maxLength={255}
          onChange={(event) => setName(event.target.value)}
          placeholder={type === "INCOME" ? "Misal Gaji" : "Misal Internet rumah"}
          value={name}
        />

        <SheetFieldLabel htmlFor={amountId}>Nominal</SheetFieldLabel>
        <div className="saku-line flex min-h-[56px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-1.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
          <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
            Rp
          </span>
          <input
            autoComplete="off"
            className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
            id={amountId}
            inputMode="decimal"
            onChange={(event) => setAmountText(formatAmountInput(event.target.value))}
            placeholder="0"
            style={{ fontSize: "26px" }}
            value={amountText}
          />
        </div>

        <SheetFieldLabel>Jadwal</SheetFieldLabel>
        <SegmentedControl ariaLabel="Jadwal" className="bg-saku-bg" onChange={setFrequency} options={FREQUENCY_OPTIONS} value={frequency} />
        {frequency === "MONTHLY" ? (
          <label className="saku-line-thin mt-2.5 flex min-h-[52px] items-center justify-between gap-3 rounded-saku-control bg-saku-paper px-3.5" htmlFor={dayId}>
            <span className="text-sm font-extrabold">Tanggal</span>
            <select
              className="bg-transparent text-right font-saku-head text-xl font-semibold outline-none"
              id={dayId}
              onChange={(event) => setDayOfMonth(Number(event.target.value))}
              value={dayOfMonth}
            >
              {MONTH_DAYS.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div aria-label="Hari" className="mt-2.5 flex flex-wrap gap-1.5" role="group">
            {WEEKDAY_ORDER.map((day) => (
              <StickerChip active={dayOfWeek === day} aria-label={WEEKDAY_NAMES[day]} className="px-3" key={day} onClick={() => setDayOfWeek(day)}>
                {WEEKDAY_NAMES[day].slice(0, 3)}
              </StickerChip>
            ))}
          </div>
        )}
        {frequency === "MONTHLY" ? (
          <p className="mt-1.5 px-1 text-xs font-bold text-saku-muted">Paling akhir tanggal 28, supaya jalan juga di bulan Februari.</p>
        ) : null}

        <SheetFieldLabel>Kategori</SheetFieldLabel>
        <CategoryPickerGrid
          categories={categories}
          onSelect={(category) => setCategoryId(category.id)}
          selectedId={categoryId}
          type={type}
        />

        {rule && !confirmDelete ? (
          <button
            className={cn(
              "mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-black text-saku-over-text",
              "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            )}
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={2.4} />
            Hapus jadwal ini
          </button>
        ) : null}

        {confirmDelete ? (
          <p className="mt-4 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-bold">
            Jadwal berhenti membuat catatan baru. Catatan yang sudah tercatat tetap ada.
          </p>
        ) : null}

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}
