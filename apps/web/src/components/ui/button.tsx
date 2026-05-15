import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type ButtonSize = "sm" | "md" | "lg";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
};

export const buttonClassName = ({
  variant = "primary",
  size = "md",
  className
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
} = {}) => {
  const variantClassName: Record<ButtonVariant, string> = {
    primary:
      "bg-[var(--sakuin-primary)] text-white shadow-sm hover:bg-black focus-visible:ring-[var(--sakuin-primary)]",
    secondary:
      "border border-[var(--sakuin-border)] bg-white text-[var(--sakuin-text)] shadow-sm hover:bg-[var(--sakuin-surface-soft)] focus-visible:ring-[var(--sakuin-purple)]",
    ghost:
      "bg-transparent text-[var(--sakuin-muted)] hover:bg-black/5 hover:text-[var(--sakuin-text)] focus-visible:ring-[var(--sakuin-purple)]",
    danger:
      "bg-[var(--sakuin-red)] text-white shadow-sm hover:bg-red-700 focus-visible:ring-[var(--sakuin-red)]"
  };

  const sizeClassName: Record<ButtonSize, string> = {
    sm: "min-h-10 rounded-2xl px-4 text-sm",
    md: "min-h-11 rounded-2xl px-5 text-sm",
    lg: "min-h-12 rounded-[1.35rem] px-6 text-base"
  };

  return cn(
    "inline-flex items-center justify-center gap-2 font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sakuin-bg)] disabled:cursor-not-allowed disabled:opacity-60",
    variantClassName[variant],
    sizeClassName[size],
    className
  );
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={buttonClassName({
          variant,
          size,
          className
        })}
        {...props}
      >
        {isLoading ? "Memproses..." : children}
      </button>
    );
  }
);

Button.displayName = "Button";