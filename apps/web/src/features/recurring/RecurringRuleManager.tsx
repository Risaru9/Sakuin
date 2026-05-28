import { useEffect, useMemo, useState } from "react";
import {
  PauseCircle,
  PlayCircle,
  Plus,
  Repeat2,
  Trash2
} from "lucide-react";
import { Button } from "../../components/ui/button";
import type { Category } from "../categories/category.types";
import type { RecurringRule } from "./recurring.types";

const recurringWeekdayOptions = [
  { value: "1", label: "Senin" },
  { value: "2", label: "Selasa" },
  { value: "3", label: "Rabu" },
  { value: "4", label: "Kamis" },
  { value: "5", label: "Jumat" },
  { value: "6", label: "Sabtu" },
  { value: "0", label: "Minggu" }
];

type RecurringRuleManagerProps = {
  recurringRules: RecurringRule[];
  categories: Category[];
  isLoading: boolean;
  pendingRuleId: string | null;
  title?: string;
  description?: string;
  className?: string;
  onCreateRule: (payload: {
    categoryId: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    frequency: "WEEKLY" | "MONTHLY";
    dayOfWeek?: number | null;
    dayOfMonth?: number | null;
    note?: string | null;
  }) => Promise<void>;
  onDeleteRule: (ruleId: string) => Promise<void>;
  onToggleRule: (rule: RecurringRule) => Promise<void>;
};

function toNumber(value: string | number | null | undefined) {
  const numberValue = Number(value ?? 0);

  if (Number.isNaN(numberValue)) {
    return 0;
  }

  return numberValue;
}

function formatRupiah(value: string | number | null | undefined) {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0
  }).format(toNumber(value));
}

function formatCompactRupiah(value: string | number | null | undefined) {
  const numberValue = toNumber(value);

  if (numberValue >= 1_000_000) {
    return `Rp ${(numberValue / 1_000_000).toLocaleString("id-ID", {
      maximumFractionDigits: 1
    })} jt`;
  }

  if (numberValue >= 1_000) {
    return `Rp ${(numberValue / 1_000).toLocaleString("id-ID", {
      maximumFractionDigits: 0
    })} rb`;
  }

  return formatRupiah(numberValue);
}

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "-";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

function getRecurringScheduleLabel(rule: RecurringRule) {
  if (rule.frequency === "MONTHLY") {
    return `Bulanan, tanggal ${rule.dayOfMonth ?? "-"}`;
  }

  const weekday = recurringWeekdayOptions.find(
    (option) => Number(option.value) === rule.dayOfWeek
  );
  return `Mingguan, setiap ${weekday?.label ?? "-"}`;
}

export function RecurringRuleManager({
  recurringRules,
  categories,
  isLoading,
  pendingRuleId,
  title = "Auto Recurring",
  description = "Set sekali untuk transaksi rutin. Rule bisa dipause kapan saja.",
  className,
  onCreateRule,
  onDeleteRule,
  onToggleRule
}: RecurringRuleManagerProps) {
  const [isComposerOpen, setIsComposerOpen] = useState(false);
  const [composerStep, setComposerStep] = useState<1 | 2>(1);
  const [type, setType] = useState<"INCOME" | "EXPENSE">("EXPENSE");
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState<"WEEKLY" | "MONTHLY">("MONTHLY");
  const [dayOfWeek, setDayOfWeek] = useState("1");
  const [dayOfMonth, setDayOfMonth] = useState("1");
  const [note, setNote] = useState("");

  const filteredCategories = useMemo(
    () => categories.filter((category) => category.type === type),
    [categories, type]
  );
  const hasValidAmount = Number(amount) > 0;
  const canContinue = Boolean(categoryId && amount.trim() && hasValidAmount);

  useEffect(() => {
    if (filteredCategories.length === 0) {
      setCategoryId("");
      return;
    }

    if (!filteredCategories.some((category) => category.id === categoryId)) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [categoryId, filteredCategories]);

  function closeComposer() {
    setIsComposerOpen(false);
    setComposerStep(1);
  }

  function resetComposer() {
    setAmount("");
    setNote("");
    setComposerStep(1);
    setIsComposerOpen(false);
  }

  async function handleSubmit() {
    if (!canContinue) {
      return;
    }

    await onCreateRule({
      categoryId,
      type,
      amount: amount.trim(),
      frequency,
      dayOfMonth: frequency === "MONTHLY" ? Number(dayOfMonth) : null,
      dayOfWeek: frequency === "WEEKLY" ? Number(dayOfWeek) : null,
      note: note.trim() || null
    });
    resetComposer();
  }

  return (
    <section
      className={[
        "rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-5",
        className
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-text)]">
              <Repeat2 className="h-4.5 w-4.5" />
            </div>
            <p className="text-sm font-black text-[var(--sakuin-text)]">
              {title}
            </p>
          </div>
          <p className="mt-2 text-xs font-semibold text-zinc-600">
            {description}
          </p>
        </div>

        <Button
          aria-expanded={isComposerOpen}
          className="rounded-xl bg-[var(--sakuin-primary)] text-white hover:bg-[var(--sakuin-secondary)]"
          onClick={() => {
            setComposerStep(1);
            setIsComposerOpen((current) => !current);
          }}
          size="sm"
          type="button"
        >
          <Plus className="h-4 w-4" />
          Tambah
        </Button>
      </div>

      <div
        className={[
          "grid overflow-hidden transition-[grid-template-rows,opacity,margin] duration-300 ease-out motion-reduce:transition-none",
          isComposerOpen
            ? "mt-3 grid-rows-[1fr] opacity-100"
            : "mt-0 grid-rows-[0fr] opacity-0"
        ].join(" ")}
      >
        <div className="min-h-0">
          <div className="grid gap-3 rounded-2xl bg-zinc-50 p-3 ring-1 ring-[var(--sakuin-border)]">
            <div className="flex items-center gap-2">
              {[1, 2].map((step) => (
                <button
                  className={[
                    "flex-1 rounded-xl px-3 py-2 text-xs font-black transition",
                    composerStep === step
                      ? "bg-[var(--sakuin-primary)] text-white shadow-sm"
                      : "bg-white text-zinc-500 ring-1 ring-[var(--sakuin-border)]"
                  ].join(" ")}
                  key={step}
                  onClick={() => setComposerStep(step as 1 | 2)}
                  type="button"
                >
                  {step === 1 ? "Detail" : "Jadwal"}
                </button>
              ))}
            </div>

            {composerStep === 1 ? (
              <div className="grid gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <select
                    className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                    onChange={(event) =>
                      setType(event.target.value as "INCOME" | "EXPENSE")
                    }
                    value={type}
                  >
                    <option value="EXPENSE">Pengeluaran</option>
                    <option value="INCOME">Pemasukan</option>
                  </select>
                  <select
                    className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                    disabled={filteredCategories.length === 0}
                    onChange={(event) => setCategoryId(event.target.value)}
                    value={categoryId}
                  >
                    {filteredCategories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {filteredCategories.length === 0 ? (
                  <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-zinc-500 ring-1 ring-[var(--sakuin-border)]">
                    Belum ada kategori untuk tipe ini.
                  </p>
                ) : null}

                <input
                  className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                  inputMode="decimal"
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="Nominal rutin"
                  value={amount}
                />
                <input
                  className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                  onChange={(event) => setNote(event.target.value)}
                  placeholder="Catatan, misalnya WiFi bulanan"
                  value={note}
                />
              </div>
            ) : (
              <div className="grid gap-2">
                <select
                  className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                  onChange={(event) =>
                    setFrequency(event.target.value as "WEEKLY" | "MONTHLY")
                  }
                  value={frequency}
                >
                  <option value="MONTHLY">Bulanan</option>
                  <option value="WEEKLY">Mingguan</option>
                </select>
                {frequency === "MONTHLY" ? (
                  <input
                    className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                    max={28}
                    min={1}
                    onChange={(event) => setDayOfMonth(event.target.value)}
                    placeholder="Tanggal (1-28)"
                    type="number"
                    value={dayOfMonth}
                  />
                ) : (
                  <select
                    className="min-h-11 rounded-xl border border-[var(--sakuin-border)] bg-white px-3 text-sm font-semibold text-[var(--sakuin-text)]"
                    onChange={(event) => setDayOfWeek(event.target.value)}
                    value={dayOfWeek}
                  >
                    {recurringWeekdayOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                )}
                <p className="rounded-xl bg-white px-3 py-2 text-xs font-semibold leading-5 text-zinc-600 ring-1 ring-[var(--sakuin-border)]">
                  Transaksi akan dibuat otomatis saat jatuh tempo, lalu tetap
                  bisa diedit seperti transaksi biasa.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {composerStep === 1 ? (
                <Button
                  className="rounded-xl bg-[var(--sakuin-primary)] text-white hover:bg-[var(--sakuin-secondary)]"
                  disabled={!canContinue}
                  onClick={() => setComposerStep(2)}
                  size="md"
                  type="button"
                >
                  Lanjut Jadwal
                </Button>
              ) : (
                <Button
                  className="rounded-xl bg-[var(--sakuin-primary)] text-white hover:bg-[var(--sakuin-secondary)]"
                  disabled={!canContinue}
                  onClick={() => {
                    void handleSubmit();
                  }}
                  size="md"
                  type="button"
                >
                  Simpan Rule
                </Button>
              )}
              <Button
                className="rounded-xl"
                onClick={
                  composerStep === 1 ? closeComposer : () => setComposerStep(1)
                }
                size="md"
                type="button"
                variant="secondary"
              >
                {composerStep === 1 ? "Tutup" : "Kembali"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-3 space-y-2">
        {isLoading ? (
          <div className="rounded-2xl bg-zinc-50 p-3 text-xs font-semibold text-zinc-500">
            Memuat recurring rules...
          </div>
        ) : recurringRules.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 p-3 text-xs font-semibold text-zinc-500">
            Belum ada recurring rule. Tambahkan satu rule untuk mengurangi input
            manual.
          </div>
        ) : (
          recurringRules.map((rule) => {
            const isPending = pendingRuleId === rule.id;
            return (
              <div
                className={[
                  "flex items-center justify-between gap-3 rounded-2xl border p-3 transition",
                  rule.isActive
                    ? "border-[var(--sakuin-border)] bg-white"
                    : "border-slate-200 bg-slate-50"
                ].join(" ")}
                key={rule.id}
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="truncate text-sm font-black text-[var(--sakuin-text)]">
                      {rule.category.name} - {formatCompactRupiah(rule.amount)}
                    </p>
                    <span
                      className={[
                        "rounded-full px-2 py-0.5 text-[10px] font-black uppercase",
                        rule.isActive
                          ? "bg-[var(--sakuin-green-soft)] text-[var(--sakuin-green)]"
                          : "bg-slate-200 text-slate-600"
                      ].join(" ")}
                    >
                      {rule.isActive ? "Aktif" : "Pause"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs font-semibold text-zinc-600">
                    {getRecurringScheduleLabel(rule)}
                  </p>
                  <p className="mt-0.5 text-[11px] font-semibold text-zinc-500">
                    Berikutnya: {formatDate(rule.nextRunAt)}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1.5">
                  <button
                    aria-label={
                      rule.isActive
                        ? "Pause recurring rule"
                        : "Aktifkan recurring rule"
                    }
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white text-[var(--sakuin-primary)] transition hover:bg-[var(--sakuin-primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => {
                      void onToggleRule(rule);
                    }}
                    type="button"
                  >
                    {rule.isActive ? (
                      <PauseCircle className="h-4 w-4" />
                    ) : (
                      <PlayCircle className="h-4 w-4" />
                    )}
                  </button>
                  <button
                    aria-label="Hapus recurring rule"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white text-zinc-500 transition hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
                    disabled={isPending}
                    onClick={() => {
                      void onDeleteRule(rule.id);
                    }}
                    type="button"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </section>
  );
}
