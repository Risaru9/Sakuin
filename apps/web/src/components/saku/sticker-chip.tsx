import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "../../lib/cn";

type StickerChipProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Selected state for filter/option chips. Leave undefined for plain action chips. */
  active?: boolean;
  tone?: "plain" | "highlight";
  leading?: ReactNode;
  trailing?: ReactNode;
};

export const StickerChip = forwardRef<HTMLButtonElement, StickerChipProps>(
  (
    { active, tone = "plain", leading, trailing, className, type = "button", children, ...props },
    ref
  ) => {
    return (
      <button
        ref={ref}
        aria-pressed={active}
        className={cn(
          "saku-line-thin saku-press inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-black shadow-saku-xs",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          active
            ? "bg-saku-accent text-white"
            : tone === "highlight"
              ? "bg-saku-coin-soft text-saku-ink"
              : "bg-saku-paper text-saku-ink",
          className
        )}
        type={type}
        {...props}
      >
        {leading}
        {children}
        {trailing}
      </button>
    );
  }
);

StickerChip.displayName = "StickerChip";
