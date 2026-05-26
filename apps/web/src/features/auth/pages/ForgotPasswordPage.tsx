import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { SakuinIdentityLogo } from "../../../components/brand/SakuinIdentityLogo";
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
    <main className="min-h-[100dvh] overflow-x-hidden bg-white text-black selection:bg-yellow-300">
      <section className="mx-auto flex min-h-[100dvh] w-full max-w-md items-center justify-center px-4 py-6 sm:px-6">
        <div className="w-full min-w-0 py-4">
          <div className="mb-6 flex min-w-0 items-center justify-between gap-3">
            <Link
              className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
              to="/"
            >
              <SakuinIdentityLogo />
            </Link>

            <Link
              className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-xl border border-black/10 bg-white px-3.5 text-xs font-bold text-black shadow-sm transition hover:bg-yellow-100"
              to="/login"
            >
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Login
            </Link>
          </div>

          <div className="w-full min-w-0 rounded-3xl border border-black/10 bg-white p-6 shadow-sm sm:p-10">
            <div className="mb-8">
              <div className="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-yellow-300 text-black">
                <Mail className="h-7 w-7" />
              </div>

              <p className="text-sm font-bold uppercase text-zinc-500">
                Reset password
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-black">
                Lupa password?
              </h1>
              <p className="mt-3 text-sm leading-6 text-zinc-600">
                Masukkan email akun Sakuin kamu. Jika email terdaftar, kami akan
                mengirim link untuk membuat password baru.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-6 rounded-2xl border border-black/10 bg-yellow-100 p-5 text-sm text-black">
                <p className="font-bold text-black">{successMessage}</p>

                <div className="mt-4 rounded-xl border border-black/10 bg-white p-4 text-[13px] leading-relaxed text-zinc-700">
                  <p className="font-bold text-black">
                    Silakan cek email kamu dengan teliti:
                  </p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-zinc-600">
                    <li>Periksa Inbox atau Kotak Masuk.</li>
                    <li>Periksa folder Spam.</li>
                    <li>Periksa tab Promosi, Sosial, atau Pembaruan.</li>
                    <li>Periksa menu Semua Email jika tersedia.</li>
                    <li>
                      Cari email dengan subjek{" "}
                      <span className="font-bold text-black">
                        Reset password akun Sakuin
                      </span>
                      .
                    </li>
                  </ul>

                  <p className="mt-3 text-zinc-600">
                    Jika email belum terlihat, tunggu 1-5 menit lalu cek kembali.
                    Jika masuk Spam, tandai sebagai bukan spam agar email Sakuin
                    berikutnya lebih mudah ditemukan.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 break-words rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3.5 text-sm font-bold text-rose-700">
                {error}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
              <Input
                label="Email"
                name="email"
                type="email"
                autoComplete="email"
                className="rounded-xl border-black/15 focus:border-black focus:ring-yellow-300/40"
                placeholder="nama@email.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />

              <Button
                className="mt-2 w-full rounded-xl bg-black text-white hover:bg-zinc-800 focus-visible:ring-yellow-400"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
              >
                <span>Kirim link reset</span>
                {!isSubmitting && <ShieldCheck className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-zinc-600">
              <p>
                Ingat password?{" "}
                <Link
                  className="font-bold text-black transition hover:text-yellow-700 hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Belum punya akun?{" "}
                <Link
                  className="font-bold text-black transition hover:underline"
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
