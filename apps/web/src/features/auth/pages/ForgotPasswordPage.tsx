import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { ApiClientError } from "../../../lib/api-client";
import { requestPasswordReset } from "../auth.service";

const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Jika email terdaftar, link reset password sudah dikirim.";

function getErrorMessage(error: unknown) {
  if (error instanceof ApiClientError) {
    return error.message;
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Terjadi kesalahan. Silakan coba lagi.";
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset({
        email
      });

      setSuccessMessage(FORGOT_PASSWORD_SUCCESS_MESSAGE);
      setEmail("");
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
                <Mail className="h-6 w-6" />
              </div>

              <p className="text-sm font-bold text-[var(--sakuin-purple)]">
                Reset password
              </p>
              <h1 className="mt-2 text-2xl font-black tracking-tight text-[var(--sakuin-text)] sm:text-3xl">
                Lupa password?
              </h1>
              <p className="mt-2 text-sm leading-6 text-[var(--sakuin-muted)]">
                Masukkan email akun Sakuin kamu. Jika email terdaftar, kami akan
                mengirim link untuk membuat password baru.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-4 rounded-[1.25rem] border border-[var(--sakuin-green)]/20 bg-[var(--sakuin-green-soft)] px-4 py-4 text-sm text-[var(--sakuin-green)]">
                <p className="font-bold">{successMessage}</p>

                <div className="mt-3 rounded-2xl bg-white/70 p-3 text-[13px] leading-6 text-[var(--sakuin-text)]">
                  <p className="font-bold">Silakan cek email kamu dengan teliti:</p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-[var(--sakuin-muted)]">
                    <li>Periksa Inbox atau Kotak Masuk.</li>
                    <li>Periksa folder Spam.</li>
                    <li>Periksa tab Promosi, Sosial, atau Pembaruan.</li>
                    <li>Periksa menu Semua Email jika tersedia.</li>
                    <li>
                      Cari email dengan subjek{" "}
                      <span className="font-bold text-[var(--sakuin-text)]">
                        Reset password akun Sakuin
                      </span>
                      .
                    </li>
                  </ul>

                  <p className="mt-3 text-[var(--sakuin-muted)]">
                    Jika email belum terlihat, tunggu 1–5 menit lalu cek kembali.
                    Jika masuk Spam, tandai sebagai bukan spam agar email Sakuin
                    berikutnya lebih mudah ditemukan.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mb-4 break-words rounded-[1.25rem] border border-[var(--sakuin-red)]/20 bg-[var(--sakuin-red-soft)] px-4 py-3 text-sm font-medium text-[var(--sakuin-red)]">
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
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <Button
                className="w-full"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
              >
                Kirim link reset
                <ShieldCheck className="h-4 w-4" />
              </Button>
            </form>

            <div className="mt-6 space-y-3 text-center text-sm text-[var(--sakuin-muted)]">
              <p>
                Ingat password?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-purple)] hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Belum punya akun?{" "}
                <Link
                  className="font-bold text-[var(--sakuin-text)] hover:underline"
                  to="/register"
                >
                  Buat akun
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}