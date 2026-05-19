import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  PiggyBank,
  Sparkles,
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

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, loginWithGoogle } = useAuth();

  const [form, setForm] = useState({
    name: "",
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
      await register(form);

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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_34%),var(--sakuin-bg)] px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl items-center justify-center lg:grid lg:min-h-[calc(100dvh-3rem)] lg:grid-cols-[0.9fr_1fr] lg:gap-8">
        <div className="w-full min-w-0 max-w-[28rem] py-2 sm:py-4 lg:py-0">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <Link className="inline-flex min-w-0 items-center gap-2" to="/">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white sm:h-11 sm:w-11">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="truncate text-lg font-black tracking-tight sm:text-xl">
                Sakuin
              </span>
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-2xl border border-[var(--sakuin-border)] bg-white px-3 text-xs font-black text-[var(--sakuin-muted)] shadow-sm"
              to="/"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Beranda
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-xl shadow-black/5 sm:rounded-[2rem] sm:p-8">
            <div className="mb-5 sm:mb-6">
              <p className="text-sm font-bold text-[var(--sakuin-purple)]">
                Mulai sekarang
              </p>
              <h2 className="mt-2 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-3xl">
                Buat akun
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sakuin-muted)]">
                Daftar untuk mulai mencatat transaksi dan target tabunganmu.
              </p>
            </div>

            {error ? (
              <div className="mb-4 break-words rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
                {error}
              </div>
            ) : null}

            <div className="mb-4 min-w-0">
              <GoogleAuthButton
                text="signup_with"
                disabled={isSubmitting || isGoogleSubmitting}
                onCredential={handleGoogleCredential}
                onFailure={setError}
              />
            </div>

            <div className="mb-4 flex min-w-0 items-center gap-3">
              <div className="h-px flex-1 bg-[var(--sakuin-border)]" />
              <span className="shrink-0 text-[11px] font-bold text-[var(--sakuin-muted)] sm:text-xs">
                atau daftar dengan email
              </span>
              <div className="h-px flex-1 bg-[var(--sakuin-border)]" />
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <Input
                label="Nama"
                name="name"
                type="text"
                autoComplete="name"
                placeholder="Nama kamu"
                value={form.name}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    name: event.target.value
                  }))
                }
              />

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
                autoComplete="new-password"
                placeholder="Password123"
                value={form.password}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />

              <Button
                className="w-full"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={isGoogleSubmitting}
              >
                Register
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm text-[var(--sakuin-muted)]">
              <p>
                Sudah punya akun?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-purple)] hover:underline"
                  to="/login"
                >
                  Login
                </Link>
              </p>

              <p>
                Ingin lihat halaman utama?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] hover:underline"
                  to="/"
                >
                  Kembali ke Beranda
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 lg:block">
          <div className="mb-8 flex flex-col items-start gap-3">
            <Link className="inline-flex items-center gap-2" to="/">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight">Sakuin</span>
            </Link>

            <Link
              className="inline-flex items-center gap-2 rounded-full border border-[var(--sakuin-border)] bg-white px-4 py-2 text-xs font-black text-[var(--sakuin-muted)] shadow-sm transition hover:text-[var(--sakuin-text)]"
              to="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-8 shadow-xl shadow-black/5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--sakuin-purple-soft)] px-3 py-2 text-xs font-bold text-[var(--sakuin-purple)]">
              <Sparkles className="h-4 w-4" />
              Finance in your pocket
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight text-[var(--sakuin-text)]">
              Bangun kebiasaan finansial yang lebih rapi.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--sakuin-muted)]">
              Sakuin membantu kamu memahami arus uang, memantau target tabungan,
              dan menjaga batas saldo aman.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-[1.5rem] bg-[var(--sakuin-surface-soft)] p-5">
                <BarChart3 className="h-6 w-6 text-[var(--sakuin-green)]" />
                <p className="mt-4 text-sm font-bold">Dashboard ringkas</p>
                <p className="mt-2 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Lihat income, expense, balance, dan trend.
                </p>
              </div>

              <div className="rounded-[1.5rem] bg-[var(--sakuin-surface-soft)] p-5">
                <PiggyBank className="h-6 w-6 text-[var(--sakuin-purple)]" />
                <p className="mt-4 text-sm font-bold">Goals tabungan</p>
                <p className="mt-2 text-xs leading-5 text-[var(--sakuin-muted)]">
                  Pantau progress target tabunganmu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}