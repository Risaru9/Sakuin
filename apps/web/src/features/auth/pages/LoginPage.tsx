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
import { SakuinIdentityLogo } from "../../../components/brand/SakuinIdentityLogo";
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
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get("expired") === "true";

  const successMessage = locationState?.resetPasswordSuccess
    ? "Password berhasil direset. Silakan login dengan password baru."
    : null;
  const expiredMessage = isExpired
    ? "Sesi Anda telah berakhir. Silakan login kembali."
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-white text-[var(--sakuin-text)] selection:bg-[var(--sakuin-primary-soft)]">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[1fr_0.9fr] lg:gap-12 lg:px-8">
        <div className="hidden min-w-0 lg:block">
          <div className="mb-8 flex flex-col items-start gap-4">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo />
            </Link>

            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-4 py-2 text-xs font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
              to="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="rounded-3xl border border-[var(--sakuin-primary)] bg-[var(--sakuin-primary)] p-8 text-white shadow-[0_22px_55px_rgba(37,99,235,0.16)]">
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-border)] bg-white px-3.5 py-1.5 text-xs font-bold text-[var(--sakuin-text)]">
              <ShieldCheck className="h-4 w-4" />
              Aman dan personal
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-white">
              Lanjutkan perjalanan finansialmu.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-white/85">
              Masuk untuk melihat dashboard, mencatat transaksi, memantau goals,
              dan mengatur batas saldo aman.
            </p>

            <div className="mt-10 grid gap-4">
              <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] text-white">
                  <WalletCards className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--sakuin-text)]">Semua transaksi tersimpan</p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    Data dipisahkan berdasarkan akun login.
                  </p>
                </div>
              </div>

              <div className="flex min-w-0 items-center gap-4 rounded-2xl border border-[var(--sakuin-border)] bg-white p-4">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[var(--sakuin-secondary)] text-white">
                  <LockKeyhole className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-base font-bold text-[var(--sakuin-text)]">Protected dashboard</p>
                  <p className="mt-0.5 text-sm text-zinc-600">
                    Dashboard hanya bisa dibuka setelah login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full min-w-0 max-w-[28rem] py-4 lg:py-0">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo size="sm" />
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-3.5 text-xs font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
              to="/"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Beranda
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-3xl border border-[var(--sakuin-border)] bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase text-zinc-500">
                Selamat datang kembali
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--sakuin-text)]">
                Login
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Masukkan email dan password untuk masuk ke akun Sakuin.
              </p>
            </div>

            {expiredMessage && !error ? (
              <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3.5 text-sm font-bold text-amber-700">
                {expiredMessage}
              </div>
            ) : null}

            {successMessage && !error && !expiredMessage ? (
              <div className="mb-6 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-4 py-3.5 text-sm font-bold text-[var(--sakuin-text)]">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700">
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
                className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
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
                className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
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
                  className="text-sm font-bold text-[var(--sakuin-text)] transition hover:text-[var(--sakuin-primary)] hover:underline"
                  to="/forgot-password"
                >
                  Lupa password?
                </Link>
              </div>

              <Button
                className="w-full rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={isGoogleSubmitting}
              >
                <span>Login</span>
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-zinc-600">
              <p>
                Belum punya akun?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] transition hover:text-[var(--sakuin-primary)] hover:underline"
                  to="/register"
                >
                  Buat akun
                </Link>
              </p>

              <p>
                Ingin lihat halaman utama?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] transition hover:underline"
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
