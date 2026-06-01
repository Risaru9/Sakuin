import { useEffect, useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  CheckCircle2,
  Clock3,
  MessageSquare,
  Plus,
  RefreshCw,
  Smartphone,
  X
} from "lucide-react";
import { useLockBodyScroll } from "../../hooks/use-lock-body-scroll";
import type { Goal } from "../goals/goal.types";
import { buildFinancialRhythm } from "../summary/financial-rhythm";
import type { SummaryData } from "../summary/summary.types";

function FinancialRhythmSkeleton() {
  return (
    <div className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-3.5 shadow-sm sm:p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-5 w-40 animate-pulse rounded-lg bg-zinc-100" />
          <div className="mt-2 h-4 w-full max-w-md animate-pulse rounded-lg bg-zinc-100" />
        </div>
        <div className="h-9 w-28 animate-pulse rounded-xl bg-zinc-100" />
      </div>
      <div className="grid gap-3 2xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            className="h-44 animate-pulse rounded-2xl bg-zinc-100"
            key={index}
          />
        ))}
      </div>
    </div>
  );
}

function PortalLayer({ children }: { children: ReactNode }) {
  const [root, setRoot] = useState<HTMLElement | null>(null);

  useEffect(() => {
    setRoot(document.body);
  }, []);

  if (!root) {
    return null;
  }

  return createPortal(children, root);
}

function WidgetInfoModal({ onClose }: { onClose: () => void }) {
  useLockBodyScroll(true);
  const [selectedSize, setSelectedSize] = useState<"small" | "medium" | "large" | "xl">("medium");
  const [pinStatus, setPinStatus] = useState<"idle" | "requested" | "unsupported" | "failed">("idle");

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const isIos =
    typeof navigator !== "undefined" &&
    /iphone|ipad|ipod/i.test(navigator.userAgent);

  const isAndroid =
    typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);

  const androidWidgetBridge =
    typeof window !== "undefined" ? window.AndroidWidgetBridge : undefined;
  const canRequestNativeWidget = Boolean(
    isAndroid &&
      androidWidgetBridge?.requestPinWidget &&
      (!androidWidgetBridge.isWidgetPinningSupported ||
        androidWidgetBridge.isWidgetPinningSupported())
  );

  function handleAddWidget() {
    if (!androidWidgetBridge?.requestPinWidget) {
      setPinStatus("unsupported");
      return;
    }

    try {
      const result = androidWidgetBridge.requestPinWidget();
      if (result === "REQUESTED") {
        setPinStatus("requested");
        return;
      }

      if (result === "UNSUPPORTED_ANDROID_VERSION" || result === "UNSUPPORTED_LAUNCHER") {
        setPinStatus("unsupported");
        return;
      }

      setPinStatus("failed");
    } catch {
      setPinStatus("failed");
    }
  }

  const sizeOptions = [
    { id: "small" as const, label: "Kecil", title: "Saldo + status", details: "Ringkas untuk ruang sempit." },
    { id: "medium" as const, label: "Sedang", title: "Saldo, masuk, keluar", details: "Pilihan paling seimbang." },
    { id: "large" as const, label: "Besar", title: "Tambah insight", details: "Ada pesan hemat/stabil/boros." },
    { id: "xl" as const, label: "Ekstra", title: "Dashboard mini", details: "Termasuk rasio pengeluaran." }
  ];

  return (
    <PortalLayer>
      <div className="fixed inset-0 z-[210] flex items-end justify-center p-0 sm:items-center sm:p-6">
        <button
          aria-label="Tutup"
          className="absolute inset-0 bg-[var(--sakuin-secondary)]/40 backdrop-blur-md"
          onClick={onClose}
          type="button"
        />

        <div
          aria-modal="true"
          className="relative z-[211] max-h-[92dvh] w-full overflow-y-auto rounded-t-[2rem] border border-white/70 bg-white p-4 shadow-[0_-24px_70px_rgba(15,23,42,0.22)] sm:max-w-lg sm:rounded-[2rem] sm:p-6"
          role="dialog"
        >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-black text-[var(--sakuin-text)]">
              Tambah ke Layar Utama
            </p>
            <p className="mt-0.5 text-xs font-semibold text-zinc-500">
              Pantau keuanganmu langsung dari home screen.
            </p>
          </div>
          <button
            aria-label="Tutup"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-zinc-100 text-zinc-600 transition hover:bg-zinc-200"
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mb-4 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-bg)] p-4">
          <p className="mb-3 text-xs font-black uppercase text-zinc-500">
            Pilih ukuran
          </p>
          <div className="grid grid-cols-2 gap-2">
            {sizeOptions.map((item) => (
              <button
                className={[
                  "min-h-[86px] rounded-2xl border p-3 text-left transition",
                  selectedSize === item.id
                    ? "border-[var(--sakuin-primary)] bg-white shadow-sm"
                    : "border-slate-200 bg-white/70 hover:bg-white"
                ].join(" ")}
                key={item.id}
                onClick={() => setSelectedSize(item.id)}
                type="button"
              >
                <span className="text-xs font-black text-[var(--sakuin-text)]">
                  {item.label}
                </span>
                <span className="mt-1 block text-[11px] font-bold text-zinc-600">
                  {item.title}
                </span>
                <span className="mt-1 block text-[10px] font-medium leading-4 text-zinc-500">
                  {item.details}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="mb-5 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm">
          <p className="mb-3 text-xs font-black uppercase text-zinc-500">
            Preview data dashboard
          </p>
          <div className="rounded-2xl bg-blue-600 p-3 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-black text-blue-100">Saldo aktif</p>
                <p className="truncate text-lg font-black">
                  Rp 2.450.000
                </p>
              </div>
              <button
                aria-label="Muat ulang widget"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20"
                type="button"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <button
                aria-label="Tambah transaksi dari widget"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white/20"
                type="button"
              >
                <Plus className="h-5 w-5" />
              </button>
            </div>

            {selectedSize !== "small" && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                <div className="rounded-xl bg-white p-2 text-slate-900">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
                    <ArrowUpCircle className="h-3 w-3" />
                    Masuk
                  </div>
                  <p className="mt-1 truncate text-xs font-black">
                    Rp 3.200.000
                  </p>
                </div>
                <div className="rounded-xl bg-white p-2 text-slate-900">
                  <div className="flex items-center gap-1.5 text-[10px] font-black text-slate-500">
                    <ArrowDownCircle className="h-3 w-3" />
                    Keluar
                  </div>
                  <p className="mt-1 truncate text-xs font-black">
                    Rp 750.000
                  </p>
                </div>
              </div>
            )}

            {selectedSize === "xl" && (
              <p className="mt-2 truncate text-[10px] font-bold text-blue-100">
                Bulan ini: keluar 23% dari pemasukan
              </p>
            )}

            {selectedSize !== "small" && (
              <span className="mt-2 inline-flex rounded-lg bg-white/20 px-2.5 py-1 text-[10px] font-black">
                Hemat
              </span>
            )}
          </div>
        </div>

        {/* Panduan Mengatur Widget untuk Android (dari APK) */}
        {isAndroid ? (
          <div className="mb-4 space-y-3 rounded-2xl bg-slate-50 p-4 border border-slate-100">
            <p className="text-xs font-black text-[var(--sakuin-text)]">
              Flow pemasangan widget:
            </p>
            <div className="space-y-2">
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-[9px] font-black text-white mt-0.5">1</span>
                <p className="flex-1 text-[11px] font-medium leading-5 text-zinc-600">
                  <strong>Tekan Tambahkan Widget:</strong> Android akan menampilkan konfirmasi dari launcher jika perangkat mendukung.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-[9px] font-black text-white mt-0.5">2</span>
                <p className="flex-1 text-[11px] font-medium leading-5 text-zinc-600">
                  <strong>Pilih/konfirmasi widget:</strong> Jika launcher tidak mendukung tombol langsung, buka galeri widget lalu cari <strong>Sakuin</strong>.
                </p>
              </div>
              <div className="flex gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-[9px] font-black text-white mt-0.5">3</span>
                <p className="flex-1 text-[11px] font-medium leading-5 text-zinc-600">
                  <strong>Gunakan aksinya:</strong> Ketuk ikon reload untuk memperbarui data, area widget untuk buka aplikasi, dan ikon plus untuk Catat Cepat.
                </p>
              </div>
            </div>
          </div>
        ) : isIos ? (
          <div className="space-y-3 mb-4">
            <p className="text-sm font-black text-[var(--sakuin-text)]">
              Cara pasang di iPhone / iPad:
            </p>
            <div className="space-y-2">
              {[
                { step: "1", text: "Buka Sakuin di Safari (browser default Apple)" },
                { step: "2", text: "Ketuk ikon Share (kotak dengan panah ke atas) di toolbar Safari" },
                { step: "3", text: "Scroll ke bawah dan pilih \"Add to Home Screen\"" },
                { step: "4", text: "Ketuk \"Add\" di pojok kanan atas" },
                { step: "5", text: "Ikon Sakuin akan muncul di layar utama kamu" }
              ].map((item) => (
                <div className="flex gap-3" key={item.step}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-[10px] font-black text-white">
                    {item.step}
                  </div>
                  <p className="flex-1 text-xs font-medium leading-5 text-zinc-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3 mb-4">
            <p className="text-sm font-black text-[var(--sakuin-text)]">
              Cara pasang Sakuin di PC/Laptop:
            </p>
            <div className="space-y-2">
              {[
                { step: "1", text: "Di Chrome/Edge: cari ikon Install (🖥️) di address bar" },
                { step: "2", text: "Di browser lain: buka menu browser → \"Add to Home Screen\"" },
                { step: "3", text: "Konfirmasi pemasangan" }
              ].map((item) => (
                <div className="flex gap-3" key={item.step}>
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--sakuin-primary)] text-[10px] font-black text-white">
                    {item.step}
                  </div>
                  <p className="flex-1 text-xs font-medium leading-5 text-zinc-600">{item.text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-3 rounded-2xl bg-slate-50 p-3">
          <p className="text-[11px] font-semibold leading-5 text-zinc-500">
            💡 Untuk Android, pastikan Anda telah memasang **Aplikasi Resmi (APK)** Sakuin agar dapat menggunakan fitur widget home-screen native ini.
          </p>
        </div>

        {pinStatus !== "idle" && (
          <p
            className={[
              "mt-3 rounded-2xl px-3 py-2 text-[11px] font-bold leading-5",
              pinStatus === "requested"
                ? "bg-emerald-50 text-emerald-700"
                : "bg-amber-50 text-amber-800"
            ].join(" ")}
          >
            {pinStatus === "requested"
              ? "Permintaan pemasangan widget dikirim. Ikuti konfirmasi Android di layar."
              : "Launcher perangkat ini belum mendukung pemasangan langsung. Gunakan galeri widget Android lalu cari Sakuin."}
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-[1fr_auto]">
          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sakuin-primary)] px-4 text-sm font-black text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)] disabled:cursor-not-allowed disabled:bg-slate-300"
            disabled={isAndroid && !canRequestNativeWidget}
            onClick={handleAddWidget}
            type="button"
          >
            <Smartphone className="h-4 w-4" />
            Tambahkan Widget
          </button>
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-zinc-50"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
        </div>
        </div>
      </div>
    </PortalLayer>
  );
}

export function FinancialRhythmCard({
  summary,
  goals,
  isLoading,
  onOpenAddTransaction,
  onOpenQuickTransaction
}: {
  summary: SummaryData | null;
  goals: Goal[];
  isLoading: boolean;
  onOpenAddTransaction: () => void;
  onOpenQuickTransaction: () => void;
}) {
  const [isWidgetModalOpen, setIsWidgetModalOpen] = useState(false);
  const hasActiveGoals = goals.length > 0;
  const rhythm = useMemo(
    () =>
      buildFinancialRhythm(summary, {
        period: "week",
        hasActiveGoals
      }),
    [hasActiveGoals, summary]
  );

  if (isLoading) {
    return <FinancialRhythmSkeleton />;
  }

  return (
    <>
      <section className="sakuin-card-lift rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-6">
        {/* Header */}
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)]">
            <Activity className="sakuin-icon-bounce h-4.5 w-4.5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-[var(--sakuin-text)] sm:text-base">
              Ritme Keuangan
            </h2>
            <p className="text-[11px] font-semibold text-zinc-500 sm:text-xs">
              Membangun habit mencatat keuangan harian.
            </p>
          </div>
        </div>

        {/* Status Utama & Insight */}
        <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1.5">
            {/* Status Utama */}
            <div className="flex items-center gap-2">
              <span
                className={[
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black ring-1",
                  rhythm.todayHasTransaction
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-amber-50 text-amber-800 ring-amber-200"
                ].join(" ")}
              >
                {rhythm.todayHasTransaction ? (
                  <>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Hari ini sudah tercatat
                  </>
                ) : (
                  <>
                    <Clock3 className="h-3.5 w-3.5" />
                    Belum ada catatan hari ini
                  </>
                )}
              </span>
              {rhythm.streakDays > 0 && (
                <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-black text-orange-700 ring-1 ring-orange-200">
                  🔥 {rhythm.streakDays} hari streak
                </span>
              )}
            </div>

            {/* Ringkasan Kecil */}
            <p className="text-sm font-bold text-[var(--sakuin-text)] leading-6">
              Minggu ini kamu mencatat <span className="text-[var(--sakuin-primary)] font-black">{rhythm.activeDaysThisWeek} dari 7 hari</span>.
            </p>

            {/* Insight Pendek */}
            <p className="text-xs font-medium text-zinc-500">
              {rhythm.todayHasTransaction
                ? "Bagus, pertahankan ritme ini untuk menjaga akurasi keuanganmu."
                : "Coba catat satu transaksi kecil hari ini agar insight tetap akurat."}
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-wrap gap-2 sm:flex-col sm:w-44">
            <button
              className="sakuin-ripple sakuin-press flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl bg-[var(--sakuin-primary)] px-4 text-xs font-black text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)]"
              onClick={onOpenQuickTransaction}
              type="button"
            >
              <MessageSquare className="sakuin-icon-bounce h-3.5 w-3.5" />
              Catat Cepat
            </button>
            <button
              className="sakuin-press flex-1 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-xs font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-zinc-50"
              onClick={onOpenAddTransaction}
              type="button"
            >
              <Plus className="sakuin-icon-bounce h-3.5 w-3.5" />
              Tambah Transaksi
            </button>
          </div>
        </div>

        {/* 7-day Rhythm Grid (Visual Dot Grid) */}
        <div className="mt-4 border-t border-slate-100 pt-4">
          <div className="grid grid-cols-7 gap-1.5">
            {rhythm.dayRhythm.map((day) => (
              <div
                className={[
                  "sakuin-stagger-enter",
                  "flex flex-col items-center justify-center rounded-xl py-1.5 text-center ring-1",
                  day.hasTransaction
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-100"
                    : day.isFuture
                      ? "bg-slate-50/50 text-zinc-400 ring-slate-100"
                      : "bg-white text-zinc-500 ring-slate-100",
                  day.isToday ? "outline outline-2 outline-[var(--sakuin-primary)]/20" : ""
                ].join(" ")}
                key={`${day.day}-${day.date}`}
              >
                <span className="text-[10px] font-black">{day.day}</span>
                <span
                  className={[
                    "mt-1 h-1.5 w-1.5 rounded-full",
                    day.hasTransaction ? "bg-emerald-500" : "bg-zinc-200"
                  ].join(" ")}
                />
              </div>
            ))}
          </div>
        </div>

        {/* Tombol Tambah Widget */}
        <button
          className="sakuin-press mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-xs font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
          onClick={() => setIsWidgetModalOpen(true)}
          type="button"
        >
          <Smartphone className="sakuin-icon-bounce h-3.5 w-3.5" />
          Tambah ke Layar Utama
        </button>
      </section>

      {/* Widget Info Modal */}
      {isWidgetModalOpen && (
        <WidgetInfoModal onClose={() => setIsWidgetModalOpen(false)} />
      )}
    </>
  );
}
