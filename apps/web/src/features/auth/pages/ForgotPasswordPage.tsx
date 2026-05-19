import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, ShieldCheck, WalletCards } from "lucide-react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import { SakuinLogo } from "../../../components/brand/SakuinLogo";
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
            <Link
            className="inline-flex min-w-0 items-center rounded-2xl transition hover:opacity-90"
            to="/"
            >
            <SakuinLogo subtitle="Personal finance app" size="md" />
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
                <Mail className="h-7 w-7" />
              </div>

              <p className="text-sm font-bold uppercase tracking-wider text-purple-600">
                Reset password
              </p>
              <h1 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
                Lupa password?
              </h1>
              <p className="mt-3 text-sm leading-relaxed text-slate-500">
                Masukkan email akun Sakuin kamu. Jika email terdaftar, kami akan
                mengirim link untuk membuat password baru.
              </p>
            </div>

            {successMessage ? (
              <div className="mb-6 rounded-2xl border border-emerald-200/60 bg-emerald-50/80 p-5 text-sm text-emerald-800 shadow-sm backdrop-blur-sm">
                <p className="font-bold text-emerald-700">{successMessage}</p>

                <div className="mt-4 rounded-xl bg-white/60 p-4 text-[13px] leading-relaxed text-slate-700 shadow-inner border border-emerald-100/50">
                  <p className="font-bold text-slate-900">Silakan cek email kamu dengan teliti:</p>

                  <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
                    <li>Periksa Inbox atau Kotak Masuk.</li>
                    <li>Periksa folder Spam.</li>
                    <li>Periksa tab Promosi, Sosial, atau Pembaruan.</li>
                    <li>Periksa menu Semua Email jika tersedia.</li>
                    <li>
                      Cari email dengan subjek{" "}
                      <span className="font-bold text-slate-900">
                        Reset password akun Sakuin
                      </span>
                      .
                    </li>
                  </ul>

                  <p className="mt-3 text-slate-600">
                    Jika email belum terlihat, tunggu 1–5 menit lalu cek kembali.
                    Jika masuk Spam, tandai sebagai bukan spam agar email Sakuin
                    berikutnya lebih mudah ditemukan.
                  </p>
                </div>
              </div>
            ) : null}

            {error ? (
              <div className="mb-6 break-words rounded-2xl border border-rose-200/60 bg-rose-50/80 px-4 py-3.5 text-sm font-bold text-rose-700 shadow-sm backdrop-blur-sm">
                {error}
              </div>
            ) : null}

            <form className="space-y-5" onSubmit={handleSubmit}>
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
                className="w-full rounded-xl mt-2"
                type="submit"
                size="lg"
                isLoading={isSubmitting}
              >
                <span>Kirim link reset</span>
                {!isSubmitting && <ShieldCheck className="ml-2 h-4 w-4" />}
              </Button>
            </form>

            <div className="mt-8 space-y-4 text-center text-sm font-medium text-slate-500">
              <p>
                Ingat password?{" "}
                <Link
                  className="font-bold text-purple-600 transition hover:text-purple-700 hover:underline"
                  to="/login"
                >
                  Kembali login
                </Link>
              </p>

              <p>
                Belum punya akun?{" "}
                <Link
                  className="font-bold text-slate-900 transition hover:underline"
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