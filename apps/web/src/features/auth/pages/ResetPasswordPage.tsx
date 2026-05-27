import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, KeyRound, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { SakuinIdentityLogo } from "../../../components/brand/SakuinIdentityLogo";
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-white text-[var(--sakuin-text)] selection:bg-[var(--sakuin-primary-soft)]">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full min-w-0 py-4">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo size="sm" />
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-[var(--sakuin-border)] bg-white px-3.5 text-xs font-bold text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]"
              to="/login"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Login
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-3xl border border-[var(--sakuin-border)] bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--sakuin-primary)] text-white">
                <KeyRound className="h-7 w-7" />
              </div>

              <p className="text-sm font-bold uppercase text-zinc-500">
                Password baru
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-[var(--sakuin-text)]">
                Buat password baru
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Masukkan password baru untuk akun Sakuin kamu. Password minimal
                8 karakter dan harus mengandung angka.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-6 rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] px-4 py-3.5 text-sm font-bold text-[var(--sakuin-text)]">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Password baru"
                name="password"
                type="password"
                autoComplete="new-password"
                className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
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
                className="rounded-xl border-[var(--sakuin-border)] focus:border-[var(--sakuin-primary)] focus:ring-[var(--sakuin-focus)]/25"
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
                className="mt-2 w-full rounded-xl bg-[var(--sakuin-secondary)] text-white hover:bg-[var(--sakuin-secondary)] focus-visible:ring-[var(--sakuin-focus)]"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={!hasToken || Boolean(successMessage)}
              >
                <span>Simpan password baru</span>
                {!isSubmitting && <ShieldCheck className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-zinc-600">
              <p>
                Sudah ingat password?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] transition hover:text-[var(--sakuin-primary)] hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Link bermasalah?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] transition hover:underline"
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
