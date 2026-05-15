import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  LockKeyhole,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ApiClientError } from "../../../lib/api-client";
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
  const { login } = useAuth();

  const [form, setForm] = useState({
    email: "",
    password: ""
  });

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  return (
    <main className="min-h-screen px-4 py-5 sm:px-6 lg:px-8">
      <section className="mx-auto grid min-h-[calc(100vh-2.5rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1fr_0.9fr]">
        <div className="hidden lg:block">
          <Link className="mb-8 inline-flex items-center gap-2" to="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
              <WalletCards className="h-5 w-5" />
            </div>
            <span className="text-xl font-black tracking-tight">Sakuin</span>
          </Link>

          <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-8 shadow-xl shadow-black/5">
            <div className="inline-flex items-center gap-2 rounded-full bg-[var(--sakuin-purple-soft)] px-3 py-2 text-xs font-bold text-[var(--sakuin-purple)]">
              <ShieldCheck className="h-4 w-4" />
              Aman dan personal
            </div>

            <h1 className="mt-6 max-w-xl text-5xl font-black tracking-tight text-[var(--sakuin-text)]">
              Lanjutkan perjalanan finansialmu.
            </h1>

            <p className="mt-5 max-w-lg text-base leading-7 text-[var(--sakuin-muted)]">
              Masuk untuk melihat dashboard, mencatat transaksi, memantau goals,
              dan mengatur batas saldo aman.
            </p>

            <div className="mt-8 grid gap-3">
              <div className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--sakuin-surface-soft)] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-green-soft)] text-[var(--sakuin-green)]">
                  <WalletCards className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Semua transaksi tersimpan</p>
                  <p className="text-xs text-[var(--sakuin-muted)]">
                    Data dipisahkan berdasarkan akun login.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 rounded-[1.5rem] bg-[var(--sakuin-surface-soft)] p-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-purple-soft)] text-[var(--sakuin-purple)]">
                  <LockKeyhole className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-sm font-bold">Protected dashboard</p>
                  <p className="text-xs text-[var(--sakuin-muted)]">
                    Dashboard hanya bisa dibuka setelah login.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="mx-auto w-full max-w-md">
          <div className="mb-6 text-center lg:hidden">
            <Link className="inline-flex items-center gap-2" to="/">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="text-xl font-black tracking-tight">Sakuin</span>
            </Link>
          </div>

          <div className="rounded-[2rem] border border-[var(--sakuin-border)] bg-white p-5 shadow-xl shadow-black/5 sm:p-8">
            <div className="mb-6">
              <p className="text-sm font-bold text-[var(--sakuin-purple)]">
                Selamat datang kembali
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-[var(--sakuin-text)]">
                Login
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--sakuin-muted)]">
                Masukkan email dan password untuk masuk ke akun Sakuin.
              </p>
            </div>

            {error ? (
              <div className="mb-4 rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
                {error}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
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

              <Button
                className="w-full"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
              >
                Login
                <ArrowRight className="h-4 w-4" />
              </Button>
            </form>

            <p className="mt-6 text-center text-sm text-[var(--sakuin-muted)]">
              Belum punya akun?{" "}
              <Link
                className="font-bold text-[var(--sakuin-purple)] hover:underline"
                to="/register"
              >
                Buat akun
              </Link>
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}