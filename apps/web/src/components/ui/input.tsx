import { forwardRef, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/cn";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <label className="block w-full" htmlFor={inputId}>
        <span className="mb-2 block text-sm font-semibold text-[var(--sakuin-text)]">
          {label}
        </span>

        <input
          ref={ref}
          id={inputId}
          className={cn(
            "min-h-12 w-full rounded-[1.25rem] border border-[var(--sakuin-border)] bg-white px-4 py-3 text-sm text-[var(--sakuin-text)] outline-none transition placeholder:text-[var(--sakuin-muted)]/70 focus:border-[var(--sakuin-purple)] focus:ring-4 focus:ring-[var(--sakuin-purple)]/10",
            error
              ? "border-[var(--sakuin-red)] focus:border-[var(--sakuin-red)] focus:ring-[var(--sakuin-red)]/10"
              : null,
            className
          )}
          {...props}
        />

        {error ? (
          <span className="mt-2 block text-xs font-medium text-[var(--sakuin-red)]">
            {error}
          </span>
        ) : null}
      </label>
    );
  }
);

Input.displayName = "Input";