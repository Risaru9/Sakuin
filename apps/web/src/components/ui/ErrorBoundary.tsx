import { Component, ErrorInfo, ReactNode } from "react";
import { AlertTriangle, RefreshCcw } from "lucide-react";

interface Props {
  children: ReactNode;
  fallbackText?: string;
  fallbackSubtitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary] Terjadi error tak terduga:", error, errorInfo);
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  public render() {
    if (this.state.hasError) {
      const fallbackText = this.props.fallbackText ?? "Fitur ini sedang tidak dapat diakses";
      const fallbackSubtitle = this.props.fallbackSubtitle ?? "Terjadi kesalahan sistem internal. Tim kami sedang menanganinya.";

      return (
        <div className="flex min-h-[300px] w-full flex-col items-center justify-center p-6 text-center">
          <div className="w-full max-w-md rounded-[var(--sakuin-radius-card)] border border-[var(--sakuin-border)] bg-white/70 p-8 shadow-[0_16px_40px_rgba(15,23,42,0.04)] backdrop-blur-md">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-100">
              <AlertTriangle className="h-7 w-7" />
            </div>

            <h3 className="mt-5 text-base font-black text-slate-950 sm:text-lg">
              {fallbackText}
            </h3>

            <p className="mt-2 text-xs font-bold leading-5 text-slate-500 sm:text-sm">
              {fallbackSubtitle}
            </p>

            <button
              onClick={this.handleRetry}
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-[var(--sakuin-radius-control)] bg-[var(--sakuin-primary)] px-5 py-3 text-xs font-black text-white shadow-[0_12px_28px_rgba(37,99,235,0.24)] transition hover:-translate-y-0.5 hover:shadow-[0_14px_32px_rgba(37,99,235,0.3)] active:translate-y-0 active:shadow-[0_8px_20px_rgba(37,99,235,0.2)]"
              type="button"
            >
              <RefreshCcw className="h-3.5 w-3.5" />
              Coba Ulangi
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
