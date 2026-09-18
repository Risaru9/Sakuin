import { useEffect, useId, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Trash2 } from "lucide-react";
import { BottomSheet, showSnack, StickerButton, StickerChip } from "../../components/saku";
import { ApiClientError } from "../../lib/api-client";
import { queryKeys } from "../../lib/query-keys";
import { SheetError, SheetFieldLabel } from "../lainnya/SubPageParts";
import { amountToInput, formatAmountInput, parseAmountInput } from "../transactions/amount-input";
import { getTodayInputValue } from "../transactions/transaction-date";
import { formatGoalDate } from "./goal-data";
import { createGoal, deleteGoal, updateGoal } from "./goal.service";
import type { Goal } from "./goal.types";

type GoalFormSheetProps = {
  open: boolean;
  /** null creates a new goal. */
  goal: Goal | null;
  onClose: () => void;
};

const NAME_MAX_LENGTH = 100;
const INPUT_CLASS =
  "saku-line min-h-[50px] w-full rounded-saku-control bg-saku-paper px-3.5 text-base font-extrabold text-saku-ink outline-none placeholder:font-bold placeholder:text-saku-muted focus-visible:ring-4 focus-visible:ring-saku-accent/30";

function errorMessage(error: unknown, fallback: string) {
  return error instanceof ApiClientError || error instanceof Error ? error.message : fallback;
}

function AmountField({ id, value, onChange, placeholder }: { id: string; value: string; onChange: (value: string) => void; placeholder: string }) {
  return (
    <div className="saku-line flex min-h-[56px] items-baseline gap-2 rounded-saku-control bg-saku-paper px-3.5 py-1.5 focus-within:ring-4 focus-within:ring-saku-accent/30">
      <span aria-hidden="true" className="font-saku-head text-lg font-semibold text-saku-muted">
        Rp
      </span>
      <input
        autoComplete="off"
        className="min-w-0 flex-1 bg-transparent font-saku-head leading-10 font-semibold text-saku-ink outline-none placeholder:text-saku-muted/60"
        id={id}
        inputMode="decimal"
        onChange={(event) => onChange(formatAmountInput(event.target.value))}
        placeholder={placeholder}
        style={{ fontSize: "26px" }}
        value={value}
      />
    </div>
  );
}

export function GoalFormSheet({ open, goal, onClose }: GoalFormSheetProps) {
  const queryClient = useQueryClient();
  const formId = useId();
  const nameId = useId();
  const targetId = useId();
  const savedId = useId();
  const [name, setName] = useState("");
  const [targetText, setTargetText] = useState("");
  const [savedText, setSavedText] = useState("");
  const [deadline, setDeadline] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setName(goal?.name ?? "");
    setTargetText(goal ? amountToInput(goal.targetAmount) : "");
    setSavedText("");
    setDeadline(goal?.deadline ? goal.deadline.slice(0, 10) : null);
    setError(null);
    setConfirmDelete(false);
  }, [open, goal]);

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.goals });
  }

  const saveMutation = useMutation({
    mutationFn: ({ target, saved }: { target: number; saved: number }) =>
      goal
        ? updateGoal(goal.id, { name: name.trim(), targetAmount: String(target), deadline })
        : createGoal({ name: name.trim(), targetAmount: String(target), currentAmount: String(saved), deadline }),
    onSuccess: (savedGoal) => {
      refresh();
      showSnack({ title: goal ? `${savedGoal.name} disimpan` : `Target ${savedGoal.name} dibuat`, mood: "happy" });
      onClose();
    },
    onError: (caughtError) => setError(errorMessage(caughtError, "Target belum tersimpan. Coba lagi."))
  });

  const deleteMutation = useMutation({
    mutationFn: (goalId: string) => deleteGoal(goalId),
    onSuccess: () => {
      refresh();
      showSnack({ title: `${goal?.name ?? "Target"} dihapus`, mood: "happy" });
      onClose();
    },
    onError: (caughtError) => {
      setConfirmDelete(false);
      setError(errorMessage(caughtError, "Target belum bisa dihapus. Coba lagi."));
    }
  });

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const target = parseAmountInput(targetText);
    const saved = savedText.trim() ? parseAmountInput(savedText) : 0;

    if (!name.trim()) {
      setError("Beri nama targetnya dulu, misalnya Laptop baru.");
      return;
    }

    if (!target || target <= 0) {
      setError("Isi jumlah targetnya, misalnya 8.000.000.");
      return;
    }

    if (saved === null) {
      setError("Uang yang sudah terkumpul harus berupa angka.");
      return;
    }

    if (goal ? Number(goal.currentAmount) > target : saved > target) {
      setError("Target tidak boleh lebih kecil dari uang yang sudah terkumpul.");
      return;
    }

    setError(null);
    saveMutation.mutate({ target, saved });
  }

  const todayKey = getTodayInputValue();

  return (
    <BottomSheet
      footer={
        confirmDelete && goal ? (
          <div className="flex gap-2.5">
            <StickerButton onClick={() => setConfirmDelete(false)} variant="plain">
              Batal
            </StickerButton>
            <StickerButton
              className="flex-1"
              isLoading={deleteMutation.isPending}
              onClick={() => deleteMutation.mutate(goal.id)}
              variant="danger"
            >
              Ya, hapus
            </StickerButton>
          </div>
        ) : (
          <StickerButton form={formId} fullWidth isLoading={saveMutation.isPending} type="submit">
            {goal ? "Simpan" : "Buat target"}
          </StickerButton>
        )
      }
      onClose={onClose}
      open={open}
      subtitle={goal ? "Ubah nama, jumlah, atau tenggatnya" : "Kumpulkan uang untuk tujuanmu"}
      title={goal ? "Ubah target" : "Target baru"}
    >
      <form id={formId} noValidate onSubmit={handleSubmit}>
        <SheetFieldLabel className="mt-1" htmlFor={nameId}>
          Nama
        </SheetFieldLabel>
        <input
          autoComplete="off"
          className={INPUT_CLASS}
          id={nameId}
          maxLength={NAME_MAX_LENGTH}
          onChange={(event) => setName(event.target.value)}
          placeholder="Misal Laptop baru"
          value={name}
        />

        <SheetFieldLabel htmlFor={targetId}>Jumlah target</SheetFieldLabel>
        <AmountField id={targetId} onChange={setTargetText} placeholder="8.000.000" value={targetText} />

        {goal ? null : (
          <>
            <SheetFieldLabel htmlFor={savedId}>Sudah terkumpul (boleh kosong)</SheetFieldLabel>
            <AmountField id={savedId} onChange={setSavedText} placeholder="0" value={savedText} />
          </>
        )}

        <SheetFieldLabel>Tenggat</SheetFieldLabel>
        <div className="flex flex-wrap gap-2">
          <StickerChip active={deadline === null} onClick={() => setDeadline(null)}>
            Tanpa tenggat
          </StickerChip>
          <label
            className={`saku-line-thin relative inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-black shadow-saku-xs focus-within:ring-4 focus-within:ring-saku-accent/30 ${
              deadline ? "bg-saku-accent text-white" : "bg-saku-paper"
            }`}
          >
            <CalendarDays aria-hidden="true" className="size-[15px]" strokeWidth={2.4} />
            {deadline ? formatGoalDate(deadline) : "Pilih tanggal"}
            <input
              aria-label="Tanggal tenggat"
              className="absolute inset-0 cursor-pointer opacity-0"
              min={todayKey}
              onChange={(event) => setDeadline(event.target.value || null)}
              type="date"
              value={deadline ?? ""}
            />
          </label>
        </div>

        {goal && !confirmDelete ? (
          <button
            className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-full px-1 text-sm font-black text-saku-over-text focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => setConfirmDelete(true)}
            type="button"
          >
            <Trash2 aria-hidden="true" className="size-4" strokeWidth={2.4} />
            Hapus target ini
          </button>
        ) : null}

        {confirmDelete ? (
          <p className="mt-4 rounded-2xl bg-saku-over-soft px-3 py-2 text-sm font-bold">
            Target {goal?.name} dan riwayat tabungannya dihapus. Saldo rekeningmu tidak berubah.
          </p>
        ) : null}

        {error ? <SheetError>{error}</SheetError> : null}
      </form>
    </BottomSheet>
  );
}
