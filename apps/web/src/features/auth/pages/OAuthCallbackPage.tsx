import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { ApiClientError } from "../../../lib/api-client";
import { ShieldCheck, ExternalLink } from "lucide-react";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan saat masuk dengan Google.";
}

export function OAuthCallbackPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [isMobileFlow, setIsMobileFlow] = useState(false);
  const [idToken, setIdToken] = useState<string | null>(null);

  useEffect(() => {
    async function processCallback() {
      if (!window.location.hash) {
        setError("Token tidak ditemukan di URL callback.");
        return;
      }

      const params = new URLSearchParams(window.location.hash.substring(1));
      const token = params.get("id_token");
      const state = params.get("state") || "";

      if (!token) {
        setError("Token Google (ID Token) tidak ditemukan.");
        return;
      }

      setIdToken(token);

      if (state.startsWith("app_auth_")) {
        setIsMobileFlow(true);
        // Attempt automatic redirect to the custom URL scheme
        const deepLinkUrl = `com.sakuin.app://login?id_token=${token}`;
        window.location.assign(deepLinkUrl);
      } else {
        // Desktop/Mobile Web flow: Authenticate immediately on the web
        try {
          await loginWithGoogle({ credential: token });
          navigate("/dashboard", { replace: true });
        } catch (caughtError) {
          setError(getErrorMessage(caughtError));
        }
      }
    }

    void processCallback();
  }, [loginWithGoogle, navigate]);

  if (error) {
    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 p-4 font-sans">
        <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 shadow-sm text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 mb-6">
            <svg className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h1 className="text-2xl font-black text-zinc-900 leading-tight">Masuk Gagal</h1>
          <p className="mt-3 text-sm text-zinc-600 leading-relaxed">{error}</p>
          <div className="mt-8">
            <button
              onClick={() => navigate("/login", { replace: true })}
              className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-900 px-6 py-2.5 text-sm font-bold text-white transition hover:bg-zinc-800 active:scale-[0.98]"
            >
              Kembali ke Login
            </button>
          </div>
        </div>
      </main>
    );
  }

  if (isMobileFlow && idToken) {
    const deepLinkUrl = `com.sakuin.app://login?id_token=${idToken}`;

    return (
      <main className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 p-4 font-sans selection:bg-[var(--sakuin-primary-soft)]">
        <div className="w-full max-w-md rounded-3xl border border-[var(--sakuin-border)] bg-white p-8 shadow-md text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-[var(--sakuin-secondary)] mb-6">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-black text-zinc-900 leading-tight">Buka Aplikasi Sakuin</h1>
          
          <p className="mt-3 text-sm text-zinc-600 leading-relaxed">
            Autentikasi Google berhasil dilakukan. Ketuk tombol di bawah untuk kembali ke aplikasi Sakuin Anda.
          </p>

          <div className="mt-8 space-y-4">
            <a
              href={deepLinkUrl}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[var(--sakuin-secondary)] px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-[var(--sakuin-secondary)]/90 active:scale-[0.98]"
            >
              <span>Buka Aplikasi</span>
              <ExternalLink className="h-4 w-4" />
            </a>

            <p className="text-[11px] text-zinc-400">
              Jika aplikasi tidak terbuka secara otomatis, silakan ketuk tombol di atas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // Loader state while processing
  return (
    <main className="min-h-[100dvh] flex items-center justify-center bg-zinc-50 p-4 font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-100 bg-white p-8 shadow-sm text-center">
        <div className="mx-auto flex justify-center mb-6">
          <div className="h-8 w-8 animate-spin rounded-full border-3 border-[var(--sakuin-secondary)] border-t-transparent" />
        </div>
        <h1 className="text-xl font-black text-zinc-950">Menghubungkan kembali...</h1>
        <p className="mt-2 text-xs text-zinc-500">
          Sedang menyiapkan sesi aman Anda. Mohon tunggu sebentar.
        </p>
      </div>
    </main>
  );
}
