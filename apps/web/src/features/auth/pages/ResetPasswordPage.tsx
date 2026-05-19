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
    <main className="min-h-[100dvh] overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(124,58,237,0.10),transparent_34%),var(--sakuin-bg)] px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
      <section className="mx-auto flex min-h-[calc(100dvh-1.5rem)] w-full max-w-6xl items-center justify-center lg:min-h-[calc(100dvh-3rem)]">
        <div className="w-full min-w-0 max-w-[28rem] py-2 sm:py-4">
          <div className="mb-4 flex min-w-0 items-center justify-between gap-3">
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
              to="/login"
            >
              <ArrowLeft className="mr-1 h-4 w-4" />
              Login
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-[1.5rem] border border-[var(--sakuin-border)] bg-white p-4 shadow-xl shadow-black/5 sm:rounded-[2rem] sm:p-8">
            <div className="mb-5 sm:mb-6">
              <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--sakuin-purple-soft)] text-[var(--sakuin-purple)]">
                <KeyRound className="h-6 w-6" />
              </div>

              <p className="text-sm font-bold text-[var(--sakuin-purple)]">
                Password baru
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-3xl">
                Buat password baru
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--sakuin-muted)]">
                Masukkan password baru untuk akun Sakuin kamu. Password minimal
                8 karakter dan harus mengandung angka.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-4 rounded-[1.25rem] border border-[var(--sakuin-green)]/20 bg-[var(--sakuin-green-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-green)]">
                {successMessage}
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 break-words rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
                {error}
              </div>
            ) : null}

            <form className="space-y-4" onSubmit={handleSubmit}>
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
                className="w-full"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
                disabled={!hasToken || Boolean(successMessage)}
              >
                Simpan password baru
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm text-[var(--sakuin-muted)]">
              <p>
                Sudah ingat password?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-purple)] hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Link bermasalah?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] hover:underline"
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