import { useState } from "react";
import { ArrowDownCircle, ArrowUpCircle, Plus, RefreshCw, Smartphone } from "lucide-react";
import { BottomSheet, StickerButton } from "../../components/saku";
import { formatRupiah, toNumber } from "../dashboard/dashboard-utils";
import type { SummaryData } from "../summary/summary.types";

// Home-screen widget picker for the Android app (moved from the old dashboard rhythm card).
// Its styling predates the Saku redesign and is restyled with the Lainnya pages.

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

function WidgetPreviewCard({ summary }: { summary: SummaryData | null }) {
  const fallbackIncome = 350000;
  const fallbackExpense = 211700;
  const income = toNumber(summary?.incomeThisMonth) || toNumber(summary?.totalIncome) || fallbackIncome;
  const expense = toNumber(summary?.expenseThisMonth) || toNumber(summary?.totalExpense) || fallbackExpense;
  const balance = toNumber(summary?.balance) || income - expense;
  const status = getWidgetStatus(income, expense, summary);
  const theme = widgetStatusTheme[status];
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

        <div className="mt-4 grid max-w-[68%] grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3">
          <WidgetMetricPill label="Pemasukan" type="income" value={formatRupiah(income)} />
          <WidgetMetricPill label="Pengeluaran" type="expense" value={formatRupiah(expense)} />
        </div>
      </div>

      <FinanceWidgetMascot status={status} />
    </div>
  );
}

export function WidgetInstallModal({
  onClose,
  summary
}: {
  onClose: () => void;
  summary: SummaryData | null;
}) {
  const [pinStatus, setPinStatus] = useState<"idle" | "requested" | "unsupported" | "failed">("idle");

  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const androidWidgetBridge = typeof window !== "undefined" ? window.AndroidWidgetBridge : undefined;
  const canRequestNativeWidget = Boolean(
    isAndroid &&
      androidWidgetBridge?.requestPinWidget &&
      (!androidWidgetBridge.isWidgetPinningSupported || androidWidgetBridge.isWidgetPinningSupported())
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

  return (
    <BottomSheet
      footer={
        <StickerButton disabled={!canRequestNativeWidget} fullWidth onClick={handleAddWidget}>
          <Smartphone aria-hidden="true" className="size-5" strokeWidth={2.4} />
          Tambahkan widget
        </StickerButton>
      }
      onClose={onClose}
      open
      subtitle="Satu tampilan yang sama di HP dan tablet"
      title="Widget Sakuin"
    >
      <p className="mt-4 mb-1.5 text-xs font-black tracking-[0.05em] text-saku-muted uppercase">Contoh tampilan</p>
      <WidgetPreviewCard summary={summary} />

      <ol className="mt-4 space-y-1.5 text-sm font-bold">
        <li>1. Ketuk "Tambahkan widget", lalu setujui di layar Android.</li>
        <li>2. Kalau tidak muncul, tahan layar utama HP/tablet, buka Widget, lalu cari Sakuin.</li>
        <li>3. Di widget: ikon putar untuk memperbarui, ikon plus untuk catat cepat.</li>
      </ol>

      {pinStatus !== "idle" ? (
        <p
          className={[
            "mt-3 rounded-2xl px-3 py-2 text-sm font-extrabold",
            pinStatus === "requested" ? "bg-saku-income-soft" : "bg-saku-coin-soft text-saku-watch-text"
          ].join(" ")}
          role="status"
        >
          {pinStatus === "requested"
            ? "Permintaan dikirim. Ikuti konfirmasi Android di layar."
            : "HP ini belum bisa memasang langsung. Pakai daftar Widget di layar utama, lalu cari Sakuin."}
        </p>
      ) : null}
    </BottomSheet>
  );
}
