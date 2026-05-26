import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  PiggyBank,
  Sparkles
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-white text-black selection:bg-yellow-300">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-6xl items-center justify-center px-4 py-6 sm:px-6 lg:grid lg:grid-cols-[0.9fr_1fr] lg:gap-12 lg:px-8">
        <div className="w-full min-w-0 max-w-[28rem] py-4 lg:py-0">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3 lg:hidden">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo size="sm" />
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 text-xs font-bold text-black shadow-sm transition hover:bg-yellow-100"
              to="/"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Beranda
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8">
              <p className="text-sm font-bold uppercase text-zinc-500">
                Mulai sekarang
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-black">
                Buat akun
              </h2>
              <p className="mt-2 text-sm leading-6 text-zinc-600">
                Daftar untuk mulai mencatat transaksi dan target tabunganmu.
              </p>
            </div>

            {error ? (
              <div className="mb-6 break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <div className="mb-6 min-w-0">
              <GoogleAuthButton
                text="signup_with"
                disabled={isSubmitting || isGoogleSubmitting}
                onCredential={handleGoogleCredential}
                onFailure={setError}
              />
            </div>

            <div className="mb-6 flex min-w-0 items-center gap-4">
              <div className="h-px flex-1 bg-slate-200" />
              <span className="shrink-0 text-xs font-bold text-slate-400">
                atau daftar dengan email
              </span>
              <div className="h-px flex-1 bg-slate-200" />
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Nama"
                name="name"
                type="text"
                autoComplete="name"
                className="rounded-xl border-black/15 focus:border-black focus:ring-yellow-300/40"
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
                className="rounded-xl border-black/15 focus:border-black focus:ring-yellow-300/40"
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
                className="rounded-xl border-black/15 focus:border-black focus:ring-yellow-300/40"
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
                className="mt-2 w-full rounded-xl bg-black text-white hover:bg-zinc-800 focus-visible:ring-yellow-400"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={isGoogleSubmitting}
              >
                <span>Register</span>
                {!isSubmitting && <ArrowRight className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-zinc-600">
              <p>
                Sudah punya akun?{" "}
                <Link
                  className="font-bold text-black transition hover:text-yellow-700 hover:underline"
                  to="/login"
                >
                  Login
                </Link>
              </p>

              <p>
                Ingin lihat halaman utama?{" "}
                <Link
                  className="font-bold text-black transition hover:underline"
                  to="/"
                >
                  Kembali ke Beranda
                </Link>
              </p>
            </div>
          </div>
        </div>

        <div className="hidden min-w-0 lg:block">
          <div className="mb-8 flex flex-col items-start gap-4">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo />
            </Link>

            <Link
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-4 py-2 text-xs font-bold text-black shadow-sm transition hover:bg-yellow-100"
              to="/"
            >
              <ArrowLeft className="h-4 w-4" />
              Kembali ke Beranda
            </Link>
          </div>

          <div className="rounded-3xl border border-black bg-yellow-300 p-8 shadow-[10px_10px_0_#000]">
            <div className="inline-flex items-center gap-2 rounded-full border border-black/15 bg-white px-3.5 py-1.5 text-xs font-bold text-black">
              <Sparkles className="h-4 w-4" />
              Finance in your pocket
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-black leading-[1.05] tracking-tight text-black">
              Bangun kebiasaan finansial yang lebih rapi.
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-black/75">
              Sakuin membantu kamu memahami arus uang, memantau target tabungan,
              dan menjaga batas saldo aman.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-black/15 bg-white p-5">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-black text-yellow-300">
                  <BarChart3 className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-black">Dashboard ringkas</p>
                <p className="mt-1 text-sm text-zinc-600">
                  Lihat income, expense, balance, dan trend.
                </p>
              </div>

              <div className="rounded-2xl border border-black/15 bg-white p-5">
                <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-black text-yellow-300">
                  <PiggyBank className="h-6 w-6" />
                </div>
                <p className="text-base font-bold text-black">Goals tabungan</p>
                <p className="mt-1 text-sm text-zinc-600">
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
