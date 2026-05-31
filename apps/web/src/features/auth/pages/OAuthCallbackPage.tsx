import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth-context";
import { googleLoginUser } from "../auth.service";
import { ApiClientError } from "../../../lib/api-client";
import { ShieldCheck } from "lucide-react";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan saat masuk dengan Google.";
}

function isCapacitorEnvironment() {
  return typeof window !== "undefined" && !!(window as any).Capacitor;
}

export function OAuthCallbackPage() {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [deepLinkUrl, setDeepLinkUrl] = useState<string | null>(null);
  const deepLinkButtonRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => {
    async function processCallback() {
      // Parsing hash fragment dari Google OAuth redirect
      // Google mengembalikan: /oauth-callback#id_token=...&state=...
      if (!window.location.hash) {
        setError("Token tidak ditemukan di URL callback. Silakan coba login kembali.");
        return;
      }

      const params = new URLSearchParams(window.location.hash.substring(1));
      const idToken = params.get("id_token");
      const state = params.get("state") || "";

      if (!idToken) {
        setError("Token Google (ID Token) tidak ditemukan. Silakan coba login kembali.");
        return;
      }

      // Bersihkan hash dari address bar agar tidak ter-submit ulang saat refresh
      window.history.replaceState(null, "", window.location.pathname);

      // ─── MOBILE / CAPACITOR FLOW ───────────────────────────────────────────
      // state diawali "app_auth_" menandakan login berasal dari app Capacitor.
      // Chrome Custom Tab dan WebView memiliki storage TERPISAH, sehingga kita
      // harus:
      //   1. Autentikasi ke API di sini (Chrome Custom Tab)
      //   2. Kirim JWT Sakuin (bukan Google id_token) ke app via deep link
      //   3. App.tsx menerima deep link → simpan JWT ke WebView localStorage
      if (state.startsWith("app_auth_") || isCapacitorEnvironment()) {
        try {
          // Autentikasi ke API Sakuin dan dapatkan JWT
          const result = await googleLoginUser({ credential: idToken });

          // Encode user data ke base64 agar aman dikirim via URL
          const userBase64 = btoa(
            encodeURIComponent(JSON.stringify(result.user))
          );

          // Buat deep link dengan JWT Sakuin (bukan Google id_token)
          const url = `com.sakuin.app://auth?token=${encodeURIComponent(result.token)}&user=${userBase64}`;
          setDeepLinkUrl(url);

          // Auto-click tombol setelah render (Chrome mengizinkan click() yang
          // dipanggil segera setelah user gesture atau setelah async selesai
          // selama masih dalam render cycle yang sama)
          // Jika auto-click tidak berhasil, tombol tetap tersedia untuk diklik manual.
          setTimeout(() => {
            if (deepLinkButtonRef.current) {
              deepLinkButtonRef.current.click();
            }
          }, 300);
        } catch (caughtError) {
          setError(getErrorMessage(caughtError));
        }
        return;
      }

      // ─── WEB BROWSER FLOW ─────────────────────────────────────────────────
      // Login biasa di browser (bukan Capacitor): autentikasi via context dan
      // arahkan ke dashboard.
      try {
        await loginWithGoogle({ credential: idToken });
        navigate("/dashboard", { replace: true });
      } catch (caughtError) {
        setError(getErrorMessage(caughtError));
      }
    }

    void processCallback();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── ERROR STATE ────────────────────────────────────────────────────────────
  if (error) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 p-4 font-sans">
        <div className="w-full max-w-md rounded-3xl border border-rose-100 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-50 text-rose-600">
            <svg
              className="h-7 w-7"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h1 className="text-2xl font-black leading-tight text-zinc-900">
            Masuk Gagal
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-zinc-600">{error}</p>
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

  // ─── MOBILE DEEP LINK STATE ─────────────────────────────────────────────────
  // Tampilkan tombol "Buka Aplikasi Sakuin" setelah API berhasil diproses.
  // Tombol ini adalah user gesture yang sah — Chrome akan mengizinkan navigasi
  // ke custom URL scheme (com.sakuin.app://) ketika diklik oleh pengguna.
  if (deepLinkUrl) {
    return (
      <main className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 p-4 font-sans selection:bg-blue-100">
        <div className="w-full max-w-md rounded-3xl border border-[var(--sakuin-border,#e5e7eb)] bg-white p-8 text-center shadow-md">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50 text-blue-600">
            <ShieldCheck className="h-7 w-7" />
          </div>

          <h1 className="text-2xl font-black leading-tight text-zinc-900">
            Login Berhasil!
          </h1>

          <p className="mt-3 text-sm leading-relaxed text-zinc-600">
            Autentikasi Google berhasil. Ketuk tombol di bawah untuk kembali
            ke aplikasi Sakuin Anda.
          </p>

          <div className="mt-8 space-y-4">
            {/* 
              PENTING: Ini harus <a href> bukan <button onClick window.location.assign>
              Chrome Custom Tab mengizinkan navigasi ke custom URL scheme HANYA
              dari user gesture langsung (click pada anchor tag).
            */}
            <a
              ref={deepLinkButtonRef}
              href={deepLinkUrl}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-blue-700 active:scale-[0.98]"
            >
              <span>Buka Aplikasi Sakuin</span>
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>

            <p className="text-[11px] text-zinc-400">
              Jika aplikasi tidak terbuka secara otomatis, ketuk tombol di atas.
            </p>
          </div>
        </div>
      </main>
    );
  }

  // ─── LOADING STATE ──────────────────────────────────────────────────────────
  return (
    <main className="flex min-h-[100dvh] items-center justify-center bg-zinc-50 p-4 font-sans">
      <div className="w-full max-w-sm rounded-3xl border border-zinc-100 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto mb-6 flex justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-blue-600 border-t-transparent" />
        </div>
        <h1 className="text-xl font-black text-zinc-950">
          Menghubungkan akun...
        </h1>
        <p className="mt-2 text-xs text-zinc-500">
          Sedang memverifikasi akun Google Anda. Mohon tunggu sebentar.
        </p>
      </div>
    </main>
  );
}
