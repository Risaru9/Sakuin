import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Info,
  X
} from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type ToastItem = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
};

type AddToastInput = {
  variant?: ToastVariant;
  title: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  addToast: (input: AddToastInput) => string;
  removeToast: (toastId: string) => void;
  clearToasts: () => void;
};

type ToastProviderProps = {
  children: ReactNode;
};

const ToastContext = createContext<ToastContextValue | null>(null);

function createToastId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getToastStyle(variant: ToastVariant) {
  if (variant === "success") {
    return {
      iconWrapper:
        "bg-emerald-100 text-emerald-700 ring-1 ring-emerald-200",
      title: "text-slate-950",
      description: "text-slate-600",
      accent: "bg-emerald-500",
      Icon: CheckCircle2
    };
  }

  if (variant === "error") {
    return {
      iconWrapper: "bg-rose-100 text-rose-700 ring-1 ring-rose-200",
      title: "text-slate-950",
      description: "text-slate-600",
      accent: "bg-rose-500",
      Icon: AlertTriangle
    };
  }

  return {
    iconWrapper:
      "bg-[var(--sakuin-primary-soft)] text-[var(--sakuin-primary)] ring-1 ring-[var(--sakuin-border)]",
    title: "text-slate-950",
    description: "text-slate-600",
    accent: "bg-[var(--sakuin-primary)]",
    Icon: Info
  };
}

function ToastCard({
  toast,
  onClose
}: {
  toast: ToastItem;
  onClose: (toastId: string) => void;
}) {
  const style = getToastStyle(toast.variant);
  const Icon = style.Icon;
  const duration = toast.duration ?? 3500;

  useEffect(() => {
    if (duration <= 0) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      onClose(toast.id);
    }, duration);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [duration, onClose, toast.id]);

  return (
    <div className="pointer-events-auto w-full overflow-hidden rounded-[1.5rem] border border-white/70 bg-white/95 shadow-[0_24px_70px_rgba(15,23,42,0.18)] backdrop-blur-xl">
      <div className={`h-1 w-full ${style.accent}`} />

      <div className="flex items-start gap-3 p-4">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${style.iconWrapper}`}
        >
          <Icon className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className={`text-sm font-black leading-5 ${style.title}`}>
            {toast.title}
          </p>

          {toast.description ? (
            <p className={`mt-1 text-xs font-medium leading-5 ${style.description}`}>
              {toast.description}
            </p>
          ) : null}
        </div>

        <button
          aria-label="Tutup notifikasi"
          className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-500 transition hover:bg-slate-200 hover:text-slate-700"
          onClick={() => onClose(toast.id)}
          type="button"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((toastId: string) => {
    setToasts((currentToasts) =>
      currentToasts.filter((toast) => toast.id !== toastId)
    );
  }, []);

  const clearToasts = useCallback(() => {
    setToasts([]);
  }, []);

  const addToast = useCallback((input: AddToastInput) => {
    const toastId = createToastId();

    const nextToast: ToastItem = {
      id: toastId,
      variant: input.variant ?? "info",
      title: input.title,
      description: input.description,
      duration: input.duration
    };

    setToasts((currentToasts) => [nextToast, ...currentToasts].slice(0, 4));

    return toastId;
  }, []);

  const value = useMemo(
    () => ({
      addToast,
      removeToast,
      clearToasts
    }),
    [addToast, removeToast, clearToasts]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}

      <div className="pointer-events-none fixed inset-x-0 top-4 z-[300] flex flex-col items-center gap-3 px-4 sm:inset-x-auto sm:right-5 sm:top-5 sm:w-full sm:max-w-sm sm:items-stretch sm:px-0">
        {toasts.map((toast) => (
          <ToastCard key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast harus digunakan di dalam ToastProvider.");
  }

  return context;
}
