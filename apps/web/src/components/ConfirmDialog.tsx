import { useEffect } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  loading?: boolean;
  loadingText?: string;
  variant?: "default" | "danger";
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmText = "Konfirmasi",
  cancelText = "Batal",
  loading = false,
  loadingText = "Memproses...",
  variant = "default",
  onConfirm,
  onClose
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !loading) {
        onClose();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, loading, onClose]);

  if (!open) {
    return null;
  }

  const iconClassName =
    variant === "danger"
      ? "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-600"
      : "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700";

  const confirmButtonClassName =
    variant === "danger"
      ? "bg-rose-600 text-white hover:bg-rose-700 focus-visible:ring-rose-300"
      : "bg-slate-950 text-white hover:bg-black focus-visible:ring-slate-300";

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 sm:p-6">
      <button
        aria-label="Tutup dialog"
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-md"
        disabled={loading}
        onClick={onClose}
        type="button"
      />

      <div
        aria-modal="true"
        className="relative z-[201] w-full max-w-md rounded-[2rem] border border-white/70 bg-white p-5 shadow-[0_30px_90px_rgba(15,23,42,0.28)] sm:p-6"
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={iconClassName}>
              <AlertTriangle className="h-6 w-6" />
            </div>

            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950 sm:text-xl">
                {title}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                {description}
              </p>
            </div>
          </div>

          <button
            aria-label="Tutup dialog"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <button
            className="inline-flex min-h-11 items-center justify-center rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={loading}
            onClick={onClose}
            type="button"
          >
            {cancelText}
          </button>

          <button
            className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl px-4 text-sm font-black transition focus-visible:outline-none focus-visible:ring-4 disabled:cursor-not-allowed disabled:opacity-60 ${confirmButtonClassName}`}
            disabled={loading}
            onClick={onConfirm}
            type="button"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {loadingText}
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      </div>
    </div>
  );
}