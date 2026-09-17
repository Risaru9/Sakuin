import { useEffect, useId, useRef, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { useLockBodyScroll } from "../../hooks/use-lock-body-scroll";
import { cn } from "../../lib/cn";

type BottomSheetProps = {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Optional visual next to the title, e.g. a category badge. */
  leading?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  closeLabel?: string;
  className?: string;
};

export function BottomSheet({
  open,
  onClose,
  title,
  subtitle,
  leading,
  children,
  footer,
  closeLabel = "Tutup",
  className
}: BottomSheetProps) {
  const titleId = useId();
  const sheetRef = useRef<HTMLDivElement>(null);
  // Keep the latest handler without re-running the focus effect on every render.
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useLockBodyScroll(open);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previouslyFocused = document.activeElement as HTMLElement | null;
    sheetRef.current?.focus();

    function handleKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCloseRef.current();
      }
    }

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [open]);

  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex items-end justify-center">
      <button
        aria-label={closeLabel}
        className="absolute inset-0 cursor-default bg-saku-scrim motion-safe:animate-saku-fade"
        onClick={() => onCloseRef.current()}
        tabIndex={-1}
        type="button"
      />
      <div
        ref={sheetRef}
        aria-labelledby={titleId}
        aria-modal="true"
        className={cn(
          "relative max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-saku-sheet border-[2.5px] border-b-0 border-saku-ink bg-saku-paper",
          "px-5 pt-2.5 pb-[calc(1.25rem+env(safe-area-inset-bottom))] font-saku-body text-saku-ink",
          "focus:outline-none motion-safe:animate-saku-rise",
          className
        )}
        role="dialog"
        tabIndex={-1}
      >
        <div aria-hidden="true" className="mx-auto h-[5px] w-10 rounded-full bg-saku-ink/25" />
        <div className="mt-2.5 flex items-center gap-2.5">
          {leading}
          <div className="min-w-0 flex-1">
            <h2 className="font-saku-head text-[21px] leading-[26px] font-semibold" id={titleId}>
              {title}
            </h2>
            {subtitle ? (
              <p className="text-xs font-bold text-saku-muted">{subtitle}</p>
            ) : null}
          </div>
          <button
            aria-label={closeLabel}
            className="saku-line-thin saku-press flex size-11 shrink-0 items-center justify-center rounded-full bg-white shadow-saku-xs focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={() => onCloseRef.current()}
            type="button"
          >
            <X aria-hidden="true" className="size-[18px]" strokeWidth={2.6} />
          </button>
        </div>
        <div className="mt-3.5">{children}</div>
        {footer ? <div className="mt-4">{footer}</div> : null}
      </div>
    </div>,
    document.body
  );
}
