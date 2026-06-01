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
import { formatRupiah, toNumber } from "./dashboard-utils";

type FinanceWidgetStatus = "hemat" | "waspada" | "boros";

const widgetStatusTheme: Record<
  FinanceWidgetStatus,
  {
    label: string;
    headline: string;
    note: string;
    cardClass: string;
    accentClass: string;
    mascotClass: string;
    ringClass: string;
  }
> = {
  hemat: {
    label: "Hemat",
    headline: "Kondisi keuangan kamu",
    note: "Pertahankan terus kebiasaan baikmu!",
    cardClass: "from-cyan-950 via-blue-800 to-emerald-600",
    accentClass: "bg-emerald-400 text-emerald-950",
    mascotClass: "from-lime-200 via-lime-400 to-green-700",
    ringClass: "ring-emerald-300/35"
  },
  waspada: {
    label: "Waspada",
    headline: "Pengeluaran mulai tinggi",
    note: "Yuk lebih bijak sebelum tambah transaksi.",
    cardClass: "from-blue-950 via-sky-800 to-amber-500",
    accentClass: "bg-amber-300 text-amber-950",
    mascotClass: "from-lime-200 via-lime-500 to-green-700",
    ringClass: "ring-amber-300/40"
  },
  boros: {
    label: "Boros",
    headline: "Pengeluaran melewati batas",
    note: "Rem dulu pengeluaran non-prioritas.",
    cardClass: "from-slate-950 via-rose-900 to-red-500",
    accentClass: "bg-rose-300 text-rose-950",
    mascotClass: "from-yellow-200 via-lime-400 to-green-700",
    ringClass: "ring-rose-300/40"
  }
};

// Replace with a transparent PNG/SVG asset path when the official Sakuin mascot is ready.
const widgetMascotAssetSrc = "";

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

function getWidgetStatus(income: number, expense: number, summary: SummaryData | null) {
  const safeStatus = summary?.safeToSpend?.status;

  if (safeStatus === "HOLD") {
    return "boros";
  }

  if (safeStatus === "WATCH") {
    return "waspada";
  }

  if (safeStatus === "SAFE") {
    return "hemat";
  }

  if (income <= 0) {
    return "hemat";
  }

  const ratio = expense / income;

  if (ratio <= 0.55) {
    return "hemat";
  }

  if (ratio <= 0.85) {
    return "waspada";
  }

  return "boros";
}

function FinanceWidgetMascot({
  status,
  mascotSrc = widgetMascotAssetSrc
}: {
  status: FinanceWidgetStatus;
  mascotSrc?: string;
}) {
  const theme = widgetStatusTheme[status];

  if (mascotSrc) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className="sakuin-widget-mascot absolute -bottom-8 -right-3 h-36 w-36 object-contain sm:h-44 sm:w-44"
        src={mascotSrc}
      />
    );
  }

  return (
    <div
      aria-hidden="true"
      className="sakuin-widget-mascot absolute -bottom-8 -right-3 h-36 w-36 sm:h-44 sm:w-44"
    >
      <div
        className={[
          "absolute inset-0 rounded-[2.25rem] bg-gradient-to-br shadow-2xl ring-8",
          theme.mascotClass,
          theme.ringClass
        ].join(" ")}
      >
        <span className="absolute left-4 top-5 h-14 w-14 rounded-full bg-white/90 shadow-inner sm:h-16 sm:w-16">
          <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400">
            <span className="absolute left-2 top-1 h-3 w-3 rounded-full bg-yellow-200" />
          </span>
        </span>
        <span className="absolute right-4 top-5 h-14 w-14 rounded-full bg-white/90 shadow-inner sm:h-16 sm:w-16">
          <span className="absolute left-1/2 top-1/2 h-7 w-7 -translate-x-1/2 -translate-y-1/2 rounded-full bg-orange-400">
            <span className="absolute left-2 top-1 h-3 w-3 rounded-full bg-yellow-200" />
          </span>
        </span>
        <span className="absolute left-1/2 top-[78px] h-8 w-12 -translate-x-1/2 rounded-[50%] bg-orange-500 sm:top-[86px]">
          <span className="absolute left-1/2 top-4 h-4 w-8 -translate-x-1/2 rounded-b-full bg-amber-900" />
        </span>
        <span className="absolute left-5 top-1 h-10 w-8 -rotate-12 rounded-t-full bg-lime-200/60" />
        <span className="absolute right-5 top-1 h-10 w-8 rotate-12 rounded-t-full bg-lime-200/60" />
      </div>
    </div>
  );
}

function WidgetMetricPill({
  label,
  value,
  type
}: {
  label: string;
  value: string;
  type: "income" | "expense";
}) {
  const Icon = type === "income" ? ArrowUpCircle : ArrowDownCircle;

  return (
    <div className="min-w-0 rounded-2xl border border-white/15 bg-white/14 p-2.5 text-white shadow-sm backdrop-blur-md">
      <div className="flex items-center gap-1.5">
        <span
          className={[
            "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white",
            type === "income" ? "bg-emerald-400" : "bg-rose-400"
          ].join(" ")}
        >
          <Icon className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[10px] font-black text-white/80">{label}</p>
          <p className="truncate text-xs font-black sm:text-sm">{value}</p>
        </div>
      </div>
    </div>
  );
}

function WidgetPreviewCard({
  selectedSize,
  summary
}: {
  selectedSize: "small" | "medium" | "large" | "xl";
  summary: SummaryData | null;
}) {
  const fallbackIncome = 350000;
  const fallbackExpense = 211700;
  const income = toNumber(summary?.incomeThisMonth) || toNumber(summary?.totalIncome) || fallbackIncome;
  const expense = toNumber(summary?.expenseThisMonth) || toNumber(summary?.totalExpense) || fallbackExpense;
  const balance = toNumber(summary?.balance) || income - expense;
  const status = getWidgetStatus(income, expense, summary);
  const theme = widgetStatusTheme[status];
  const ratio = income > 0 ? Math.min(Math.round((expense / income) * 100), 999) : 0;
  const showMetrics = selectedSize !== "small";
  const showInsight = selectedSize === "large" || selectedSize === "xl";
  const showRatio = selectedSize === "xl";

  return (
    <div
      className={[
        "relative min-h-[210px] overflow-hidden rounded-[1.75rem] bg-gradient-to-br p-4 text-white shadow-[0_24px_70px_rgba(15,23,42,0.28)] sm:min-h-[245px] sm:p-5",
        theme.cardClass
      ].join(" ")}
    >
      <div className="absolute -right-16 -top-16 h-44 w-44 rounded-full bg-white/18 blur-3xl" />
      <div className="absolute -left-20 bottom-4 h-44 w-44 rounded-full bg-cyan-300/20 blur-3xl" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_10%,rgba(255,255,255,0.24),transparent_28%),radial-gradient(circle_at_90%_78%,rgba(255,255,255,0.18),transparent_30%)]" />

      <div className="relative z-10 flex min-h-[178px] flex-col sm:min-h-[205px]">
        <div className="flex items-start justify-between gap-3">
          <div className="max-w-[64%]">
            <p className="text-sm font-bold text-white/78">Saldo aktif</p>
            <p className="mt-1 truncate text-3xl font-black tracking-normal text-white drop-shadow-sm sm:text-4xl">
              {formatRupiah(balance)}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              aria-label="Muat ulang widget"
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/16 text-white backdrop-blur-xl transition hover:bg-white/24"
              type="button"
            >
              <RefreshCw className="h-5 w-5" />
            </button>
            <button
              aria-label="Tambah transaksi dari widget"
              className="grid h-11 w-11 place-items-center rounded-2xl bg-white/16 text-white backdrop-blur-xl transition hover:bg-white/24"
              type="button"
            >
              <Plus className="h-6 w-6" />
            </button>
          </div>
        </div>

        {showMetrics ? (
          <div className="mt-4 grid max-w-[68%] grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
            <WidgetMetricPill label="Pemasukan" type="income" value={formatRupiah(income)} />
            <WidgetMetricPill label="Pengeluaran" type="expense" value={formatRupiah(expense)} />
          </div>
        ) : null}

        {showRatio ? (
          <div className="mt-4 max-w-[66%]">
            <div className="mb-2 flex items-center justify-between text-[10px] font-bold text-white/80">
              <span>Rasio pengeluaran</span>
              <span>{ratio}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-white/20">
              <div
                className={["h-full rounded-full", theme.accentClass].join(" ")}
                style={{ width: `${Math.min(ratio, 100)}%` }}
              />
            </div>
          </div>
        ) : null}

        <div className="mt-auto max-w-[68%] pt-4">
          {showInsight ? (
            <div className="rounded-2xl border border-white/15 bg-white/12 px-3 py-2.5 backdrop-blur-md">
              <p className="text-[11px] font-semibold text-white/82">{theme.headline}</p>
              <p className="mt-1 text-lg font-black uppercase leading-none text-lime-300">
                {theme.label}
              </p>
              <p className="mt-1 truncate text-[11px] font-semibold text-white/86">{theme.note}</p>
            </div>
          ) : (
            <span className={["inline-flex rounded-xl px-3 py-1.5 text-xs font-black", theme.accentClass].join(" ")}>
              {theme.label}
            </span>
          )}
        </div>
      </div>

      <FinanceWidgetMascot status={status} />
    </div>
  );
}

function WidgetInfoModal({
  onClose,
  summary
}: {
  onClose: () => void;
  summary: SummaryData | null;
}) {
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
          <WidgetPreviewCard selectedSize={selectedSize} summary={summary} />
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
            Untuk Android, pastikan Anda telah memasang aplikasi resmi Sakuin agar dapat menggunakan widget home-screen native.
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
        <WidgetInfoModal
          onClose={() => setIsWidgetModalOpen(false)}
          summary={summary}
        />
      )}
    </>
  );
}
