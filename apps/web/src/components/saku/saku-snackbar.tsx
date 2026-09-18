import { cn } from "../../lib/cn";
import { SakuMascot, type SakuMood } from "./saku-mascot";

type SakuSnackbarProps = {
  title: string;
  detail?: string;
  mood?: SakuMood;
  actionLabel?: string;
  onAction?: () => void;
  actionDisabled?: boolean;
  className?: string;
};

/** Dark sticker message with Saku, e.g. "Kopi susu tersimpan · Batalkan". */
export function SakuSnackbar({
  title,
  detail,
  mood = "wow",
  actionLabel,
  onAction,
  actionDisabled = false,
  className
}: SakuSnackbarProps) {
  return (
    <div
      aria-live="polite"
      className={cn(
        "saku-line-thin flex items-center gap-2.5 rounded-[20px] bg-saku-ink py-1.5 pr-1.5 pl-2 text-white",
        "shadow-[3px_3px_0_var(--color-saku-coin)] motion-safe:animate-saku-rise",
        className
      )}
      role="status"
    >
      <SakuMascot animated mood={mood} size={40} />
      <div className="min-w-0 flex-1">
        <p className="truncate font-saku-head text-base font-semibold">{title}</p>
        {detail ? <p className="truncate text-xs font-bold text-white/80">{detail}</p> : null}
      </div>
      {actionLabel && onAction ? (
        <button
          className="saku-press min-h-11 shrink-0 rounded-full bg-saku-coin px-3.5 font-saku-head text-[15px] font-semibold text-saku-ink focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-coin/40 disabled:opacity-60"
          disabled={actionDisabled}
          onClick={onAction}
          type="button"
        >
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}
