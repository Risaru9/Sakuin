import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type StickerButtonVariant = "primary" | "coin" | "plain" | "danger";
export type StickerButtonSize = "md" | "lg";

type StickerButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: StickerButtonVariant;
  size?: StickerButtonSize;
  isLoading?: boolean;
  fullWidth?: boolean;
};

const variantClassName: Record<StickerButtonVariant, string> = {
  primary: "bg-saku-accent text-white",
  coin: "bg-saku-coin text-saku-ink",
  plain: "bg-saku-paper text-saku-ink",
  danger: "bg-saku-paper text-saku-over-text"
};

const sizeClassName: Record<StickerButtonSize, string> = {
  md: "min-h-11 px-4 text-[15px]",
  lg: "min-h-13 px-6 text-lg"
};

export const StickerButton = forwardRef<HTMLButtonElement, StickerButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "lg",
      isLoading = false,
      fullWidth = false,
      disabled,
      type = "button",
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        aria-busy={isLoading || undefined}
        className={cn(
          "saku-line saku-press inline-flex items-center justify-center gap-2 rounded-full font-saku-head font-semibold shadow-saku-sm",
          "focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30",
          "disabled:cursor-not-allowed disabled:opacity-50",
          variantClassName[variant],
          sizeClassName[size],
          fullWidth && "w-full",
          className
        )}
        disabled={disabled || isLoading}
        type={type}
        {...props}
      >
        {isLoading ? "Memproses..." : children}
      </button>
    );
  }
);

StickerButton.displayName = "StickerButton";
