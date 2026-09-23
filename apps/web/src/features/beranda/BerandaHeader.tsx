import { ChevronDown, CloudOff, Search } from "lucide-react";
import { SakuChatInvite, SakuSparkle } from "../../components/saku";
import { cn } from "../../lib/cn";
import { formatPlainAmount, type MonthTotals, type StatusPill, type StatusTone } from "./beranda-data";

type BerandaHeaderProps = {
  monthLabel: string;
  totals: MonthTotals;
  isLoading: boolean;
  /** The month could not load, so the totals are unknown rather than zero. */
  totalsUnavailable?: boolean;
  status: StatusPill | null;
  /** Shown instead of the status when the month has nothing yet. */
  emptyLabel?: string | null;
  offlineLabel?: string | null;
  onOpenMonth: () => void;
  onOpenSearch: () => void;
};

const STATUS_TONE_CLASS: Record<StatusTone, string> = {
  safe: "bg-saku-coin text-saku-ink",
  watch: "bg-saku-coin-soft text-saku-watch-text",
  hold: "bg-saku-over text-saku-ink"
};

function Stat({
  label,
  value,
  isLoading,
  unavailable
}: {
  label: string;
  value: number;
  isLoading: boolean;
  unavailable: boolean;
}) {
  const text = unavailable ? "–" : `${value < 0 ? "−" : ""}${formatPlainAmount(Math.abs(value))}`;

  return (
    <div className="min-w-0">
      <dt className="text-xs font-extrabold text-white/90">{label}</dt>
      <dd className="mt-px truncate font-saku-head text-base font-semibold text-white min-[360px]:text-lg" title={text}>
        {isLoading ? (
          <span aria-label="Memuat" className="inline-block h-4 w-16 animate-pulse rounded-full bg-white/30 align-middle" />
        ) : (
          text
        )}
      </dd>
    </div>
  );
}

export function BerandaHeader({
  monthLabel,
  totals,
  isLoading,
  totalsUnavailable = false,
  status,
  emptyLabel,
  offlineLabel,
  onOpenMonth,
  onOpenSearch
}: BerandaHeaderProps) {
  const pillText = emptyLabel ?? status?.text ?? null;
  const pillClass = emptyLabel ? STATUS_TONE_CLASS.safe : status ? STATUS_TONE_CLASS[status.tone] : "";

  return (
    <header className="saku-line relative mt-2 rounded-saku-hero bg-saku-accent px-4 pt-3 pb-3.5 text-white shadow-saku sm:mt-0">
      <SakuSparkle className="absolute top-2.5 left-[43%] text-white" size={14} />
      <SakuSparkle className="absolute top-8 left-[50%] text-saku-coin [animation-delay:0.8s]" size={10} />
      <SakuSparkle className="absolute right-[88px] bottom-4 text-white [animation-delay:1.4s]" size={12} />

      <div className="flex items-start justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5 pt-1">
          <button
            aria-label={`Bulan ${monthLabel}, ketuk untuk memilih bulan lain`}
            className="flex min-h-11 min-w-0 items-center gap-1 rounded-full font-saku-head text-[19px] font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40 min-[360px]:text-[21px]"
            onClick={onOpenMonth}
            type="button"
          >
            <span className="truncate">{monthLabel}</span>
            <ChevronDown aria-hidden="true" className="size-[18px] shrink-0" strokeWidth={2.8} />
          </button>
          <button
            aria-label="Cari catatan"
            className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-white text-saku-ink shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-white/40"
            onClick={onOpenSearch}
            type="button"
          >
            <Search aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
          </button>
        </div>
        <SakuChatInvite className="-mt-5 -mr-2" />
      </div>

      <dl className="mt-2 grid grid-cols-3 gap-2.5">
        <Stat isLoading={isLoading} label="Keluar" unavailable={totalsUnavailable} value={totals.expense} />
        <Stat isLoading={isLoading} label="Masuk" unavailable={totalsUnavailable} value={totals.income} />
        <Stat isLoading={isLoading} label="Sisa" unavailable={totalsUnavailable} value={totals.balance} />
      </dl>

      {pillText || offlineLabel ? (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
          {pillText ? (
            <span
              className={cn(
                "saku-line-thin inline-flex -rotate-[1.5deg] items-center rounded-full px-2.5 py-0.5 text-xs font-black",
                pillClass
              )}
            >
              {pillText}
            </span>
          ) : null}
          {offlineLabel ? (
            <span className="saku-line-thin inline-flex rotate-[1.5deg] items-center gap-1.5 rounded-full bg-white px-2.5 py-0.5 text-xs font-black text-saku-ink">
              <CloudOff aria-hidden="true" className="size-3.5" strokeWidth={2.6} />
              {offlineLabel}
            </span>
          ) : null}
        </div>
      ) : null}
    </header>
  );
}
