import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ApiClientError } from "../../../lib/api-client";
import { resetPasswordUser } from "../auth.service";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
}

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < 8) {
    return "Password minimal 8 karakter.";
  }

  if (!/[0-9]/.test(password)) {
    return "Password harus mengandung angka.";
  }

  if (password !== confirmPassword) {
    return "Konfirmasi password tidak sama.";
  }

  return null;
}

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTimeoutRef = useRef<number | null>(null);

  const token = searchParams.get("token")?.trim() ?? "";
  const hasToken = token.length > 0;

  const [form, setForm] = useState({
    password: "",
    confirmPassword: ""
  });

  const [error, setError] = useState<string | null>(
    hasToken ? null : "Link reset password tidak valid atau token tidak ditemukan."
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    return () => {
      if (redirectTimeoutRef.current !== null) {
        window.clearTimeout(redirectTimeoutRef.current);
      }
    };
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!hasToken) {
      setError("Link reset password tidak valid atau token tidak ditemukan.");
      return;
    }

    const validationError = validatePassword(
      form.password,
      form.confirmPassword
    );

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await resetPasswordUser({
        token,
        password: form.password
      });

      setSuccessMessage("Password berhasil direset. Kamu akan diarahkan ke halaman login.");

      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/login", {
          replace: true,
          state: {
            resetPasswordSuccess: true
          }
        });
      }, 1200);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="relative min-h-[100dvh] overflow-x-hidden bg-slate-50 text-slate-900 selection:bg-purple-500/30">
      
      {/* BACKGROUND AMBIENT EFFECT */}
      <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div className="absolute -left-[10%] -top-[10%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(147,51,234,0.07),transparent_60%)]"></div>
        <div className="absolute -right-[10%] top-[20%] h-[40rem] w-[40rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.05),transparent_60%)]"></div>
        <div className="absolute -bottom-[20%] left-[20%] h-[50rem] w-[50rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.05),transparent_60%)]"></div>
      </div>

      <section className="relative z-10 mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full min-w-0 py-4">
          
          {/* Header */}
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <Link className="inline-flex min-w-0 items-center gap-3 group" to="/">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white shadow-sm transition-transform group-hover:scale-105 sm:h-11 sm:w-11">
                <WalletCards className="h-5 w-5" />
              </div>
              <span className="truncate text-xl font-black tracking-tight text-slate-900 sm:text-2xl">
                Sakuin
              </span>
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-slate-200/60 bg-white/80 px-3.5 text-xs font-bold text-slate-600 shadow-sm backdrop-blur-md transition hover:bg-white hover:text-slate-900"
              to="/login"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Login
            </Link>
          </div>

          {/* Form Container */}
          <div className="w-full min-w-0 rounded-[2rem] border border-slate-200/60 bg-white/80 p-6 shadow-xl backdrop-blur-xl sm:p-10">
            <div className="mb-8">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-100/70 text-purple-600 shadow-inner">
                <KeyRound className="h-7 w-7" />
              </div>

              <p className="text-sm font-bold uppercase tracking-wider text-purple-600">
                Password baru
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Buat password baru
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Masukkan password baru untuk akun Sakuin kamu. Password minimal
                8 karakter dan harus mengandung angka.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 px-4 py-3.5 text-sm font-bold text-emerald-700 shadow-sm backdrop-blur-sm">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 break-words rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Password baru"
                name="password"
                type="password"
                autoComplete="new-password"
                placeholder="Password123"
                value={form.password}
                disabled={!hasToken || Boolean(successMessage)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    password: event.target.value
                  }))
                }
              />

              <Input
                label="Konfirmasi password"
                name="confirmPassword"
                type="password"
                autoComplete="new-password"
                placeholder="Ulangi password baru"
                value={form.confirmPassword}
                disabled={!hasToken || Boolean(successMessage)}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    confirmPassword: event.target.value
                  }))
                }
              />

              <Button
                className="w-full rounded-xl mt-2"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={!hasToken || Boolean(successMessage)}
              >
                <span>Simpan password baru</span>
                {!isSubmitting && <ShieldCheck className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-slate-500">
              <p>
                Sudah ingat password?{" "}
                <Link
                  className="font-bold text-purple-600 transition hover:text-purple-700 hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Link bermasalah?{" "}
                <Link
                  className="font-bold text-slate-900 transition hover:underline"
                  to="/forgot-password"
                >
                  Kirim ulang link
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}