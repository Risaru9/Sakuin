import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ApiClientError } from "../../../lib/api-client";
import { GoogleAuthButton } from "../components/google-auth-button";
import { useAuth } from "../auth-context";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();

  const locationState = location.state as { resetPasswordSuccess?: boolean } | null;
  const successMessage = locationState?.resetPasswordSuccess
    ? "Password berhasil direset. Silakan login dengan password baru."
    : null;

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setIsSubmitting(true);

    try {
      await login(form);

      navigate("/dashboard", {
        replace: true
      });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle({
        credential
      });

      navigate("/dashboard", {
        replace: true
      });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-purple-500/30">
      
      {/* 1. BACKGROUND AMBIENT EFFECT (Selaras dengan HomePage) */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.07),transparent_60%)]"></div>
        <div className="absolute -right-[10%] top-[20%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_60%)]"></div>
        <div className="absolute -bottom-[20%] left-[20%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05),transparent_60%)]"></div>
      </div>

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:px-8">
        
        {/* LEFT COLUMN - Branding & Info */}
        <div className="hidden min-w-0 lg:block">
          <div className="mb-8 flex flex-col items-start gap-4">
            <Link className="inline-flex items-center gap-3 group" to="/">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="text-2xl font-black tracking-tight text-slate-900">Sakuin</span>
            </Link>

            <Link
              className="inline-flex items-center gap-2 rounded-full border border-slate-200/60 bg-white/60 px-4 py-2 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900"
              to="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="rounded-[2.5rem] border border-slate-200/60 bg-white/50 p-8 shadow-xl shadow-slate-200/50 backdrop-blur-md">
            <div className="inline-flex items-center gap-2 rounded-full border border-purple-200/60 bg-purple-50/60 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-sm backdrop-blur-md">
              <ShieldCheck className="h-4 w-4" />
              Aman dan personal
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight text-slate-900 leading-[1.1]">
              Lanjutkan perjalanan finansialmu.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-relaxed text-slate-600">
              Masuk untuk melihat dashboard, mencatat transaksi, memantau goals,
              dan mengatur batas saldo aman.
            </p>

            <div className="mt-10 grid gap-4">
              <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-100/70 text-emerald-600">
                  <WalletCards className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">Semua transaksi tersimpan</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Data dipisahkan berdasarkan akun login.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-slate-200/50 bg-white/60 p-4 shadow-sm backdrop-blur-sm">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-purple-100/70 text-purple-600">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-slate-900">Protected dashboard</p>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Dashboard hanya bisa dibuka setelah login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN - Login Form */}
        <div className="w-full min-w-0 max-w-[28rem] py-4 lg:py-0">
          
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <Link className="inline-flex min-w-0 items-center gap-3" to="/">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm sm:h-11 sm:w-11">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Sakuin
              </span>
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 px-3.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900"
              to="/"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Beranda
            </Link>
          </div>

          {/* Form Container */}
          <div className="w-full min-w-0 rounded-[2rem] border border-slate-200/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase tracking-wider text-purple-600">
                Selamat datang kembali
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Login
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-slate-500">
                Masukkan email dan password untuk masuk ke akun Sakuin.
              </p>
            </div>

            {successMessage && !error ? (
              <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3.5 text-sm font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            <div className="mb-6 min-w-0">
              <GoogleAuthButton
                text="signin_with"
                disabled={isSubmitting || isGoogleSubmitting}
                onCredential={handleGoogleCredential}
                onFailure={setError}
              />
            </div>

            <div className="mb-6 flex min-w-0 items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="shrink-0 text-xs font-bold text-slate-400">
                atau login dengan email
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="nama@email.com"
                value={form.email}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    email: event.target.value
                  }))
                }
              />

              <Input
                label="Password"
                name="password"
                type="password"
                autoComplete="current-password"
                placeholder="Password123"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />

              <div className="flex justify-end pt-1">
                <Link
                  className="text-sm font-bold text-purple-600 transition hover:text-purple-700 hover:underline"
                  to="/forgot-password"
                >
                  Lupa password?
                </Link>
              </div>

              <Button
                className="w-full rounded-xl"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={isGoogleSubmitting}
              >
                <span>Login</span>
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-slate-500">
              <p>
                Belum punya akun?{" "}
                <Link
                  className="font-bold text-purple-600 transition hover:text-purple-700 hover:underline"
                  to="/register"
                >
                  Buat akun
                </Link>
              </p>

              <p>
                Ingin lihat halaman utama?{" "}
                <Link
                  className="font-bold text-slate-900 transition hover:underline"
                  to="/"
                >
                  Kembali ke Beranda
                </Link>
              </p>
            </div>
          </div>
        </div>

      </section>
    </main>
  );
}