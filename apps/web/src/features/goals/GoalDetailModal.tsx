import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, ArrowDownRight, ArrowUpRight, CalendarDays, Loader2, Target, TrendingUp, X } from "lucide-react";
import { queryKeys } from "../../lib/query-keys";
import { getGoal } from "./goal.service";

type GoalDetailModalProps = {
  open: boolean;
  goalId: string | null;
  onClose: () => void;
};

function formatRupiah(value: string | number | null | undefined) {
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

function formatDate(value: string | null) {
  if (!value) {
    return "Tanpa deadline";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tanpa deadline";
  }

  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "long",
    year: "numeric"
  }).format(date);
}

export function GoalDetailModal({ open, goalId, onClose }: GoalDetailModalProps) {
  const goalQuery = useQuery({
    queryKey: [...queryKeys.goals, goalId],
    queryFn: () => getGoal(goalId!),
    enabled: Boolean(open && goalId)
  });

  const goal = goalQuery.data;
  const isLoading = goalQuery.isLoading;
  const error = goalQuery.error;

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape" && open) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleEscape);
    return () => {
      window.removeEventListener("keydown", handleEscape);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const targetAmount = Number(goal?.targetAmount ?? 0);
  const currentAmount = Number(goal?.currentAmount ?? 0);
  const progress = targetAmount > 0 ? Math.min(100, Math.round((currentAmount / targetAmount) * 100)) : 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center bg-[var(--sakuin-secondary)]/35 px-4 py-4 backdrop-blur-md sm:items-center">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-[2rem] border border-white/70 bg-white shadow-[0_30px_90px_rgba(15,23,42,0.28)]">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 p-5 sm:p-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-wider text-[var(--sakuin-text)]">
              Detail & Riwayat
            </p>
            <h2 className="mt-1 truncate text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
              {goal?.name ?? "Memuat Goal..."}
            </h2>
          </div>

          <button
            aria-label="Tutup modal"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-50 text-slate-500 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="min-h-0 flex-1 overflow-y-auto p-5 sm:p-6">
          {isLoading ? (
            <div className="flex h-40 flex-col items-center justify-center gap-3 text-slate-500">
              <Loader2 className="h-7 w-7 animate-spin text-[var(--sakuin-primary)]" />
              <p className="text-sm font-semibold">Mengambil riwayat tabungan...</p>
            </div>
          ) : error ? (
            <div className="flex gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm font-medium text-rose-700">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <span>Gagal memuat detail goal. Silakan coba kembali beberapa saat lagi.</span>
            </div>
          ) : goal ? (
            <div className="space-y-6">
              {/* Summary Stats Card */}
              <div className="rounded-3xl bg-slate-50 p-5 shadow-inner">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Terkumpul
                    </span>
                    <span className="text-lg font-black text-slate-950 block mt-1">
                      {formatRupiah(goal.currentAmount)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Target Target
                    </span>
                    <span className="text-lg font-black text-slate-950 block mt-1">
                      {formatRupiah(goal.targetAmount)}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between items-center text-xs font-bold text-slate-500 mb-1.5">
                    <span>Progres</span>
                    <span>{progress}%</span>
                  </div>
                  <div className="h-3 overflow-hidden rounded-full bg-slate-200">
                    <div
                      className="h-full rounded-full bg-[var(--sakuin-primary)] transition-all duration-500"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                {/* Meta details */}
                <div className="mt-5 pt-4 border-t border-slate-200/60 flex flex-wrap gap-4 text-xs font-semibold text-slate-500">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="h-4 w-4 text-slate-400" />
                    <span>{formatDate(goal.deadline)}</span>
                  </div>
                  {goal.description ? (
                    <div className="w-full text-slate-600 mt-1 bg-white/70 p-3 rounded-xl border border-slate-100">
                      {goal.description}
                    </div>
                  ) : null}
                </div>
              </div>

              {/* Savings History Title */}
              <div>
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-[var(--sakuin-primary)]" />
                  Riwayat Tabungan
                </h3>

                {/* History List */}
                <div className="mt-3.5 space-y-3 pb-4">
                  {!goal.history || goal.history.length === 0 ? (
                    <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50/55 p-8 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                        <TrendingUp className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-black text-slate-700">
                        Belum ada riwayat tabungan.
                      </p>
                      <p className="text-xs text-slate-500 mt-1 max-w-[280px] mx-auto leading-relaxed">
                        Silakan gunakan tombol <span className="font-bold text-[var(--sakuin-secondary)]">"Tambah Dana"</span> untuk mulai mengisi target tabungan ini.
                      </p>
                    </div>
                  ) : (
                    goal.history.map((item) => {
                      const amountNum = Number(item.amount);
                      const isPositive = amountNum > 0;
                      return (
                        <div
                          key={item.id}
                          className={`relative flex items-center justify-between rounded-2xl border p-4 shadow-sm transition ${
                            isPositive
                              ? "bg-emerald-50/40 border-emerald-100/60 hover:bg-emerald-50/60"
                              : "bg-rose-50/40 border-rose-100/60 hover:bg-rose-50/60"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div
                              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl font-bold ${
                                isPositive
                                  ? "bg-emerald-100 text-emerald-700"
                                  : "bg-rose-100 text-rose-700"
                              }`}
                            >
                              {isPositive ? (
                                <ArrowDownRight className="h-5 w-5" />
                              ) : (
                                <ArrowUpRight className="h-5 w-5" />
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-500 uppercase tracking-wider">
                                {new Intl.DateTimeFormat("id-ID", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric"
                                }).format(new Date(item.createdAt))}
                              </p>
                              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                                Saldo akhir: <span className="font-bold text-slate-600">{formatRupiah(item.currentAmount)}</span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">
                              {isPositive ? "Menabung" : "Penarikan"}
                            </p>
                            <span
                              className={`text-sm font-black mt-0.5 block ${
                                isPositive ? "text-emerald-700" : "text-rose-700"
                              }`}
                            >
                              {isPositive ? "+" : ""}
                              {formatRupiah(item.amount)}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-300"
            type="button"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
