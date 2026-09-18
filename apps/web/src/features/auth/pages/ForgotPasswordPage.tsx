import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Mail, MailCheck } from "lucide-react";
import { StickerButton, StickerCard } from "../../../components/saku";
import { ApiClientError } from "../../../lib/api-client";
import { requestPasswordReset } from "../auth.service";
import { AuthField, AuthNotice, AuthScreen } from "../components/AuthParts";

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
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function send(address: string) {
    setError(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email: address });
      setSentTo(address);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void send(email);
  }

  const backToLogin = (
    <Link className="font-black text-saku-accent" to="/login">
      Kembali ke halaman masuk
    </Link>
  );

  return (
    <AuthScreen
      footer={backToLogin}
      greeting="Lupa password? Tenang, kita atur ulang."
      mood={sentTo ? "wow" : "worried"}
      subtitle="Masukkan email akunmu, kami kirim link untuk membuat password baru."
      title="Lupa password"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      {sentTo ? (
        <StickerCard className="flex flex-col items-center gap-2 px-5 py-5 text-center">
          <span className="saku-line-thin flex size-12 items-center justify-center rounded-full bg-saku-income-soft">
            <MailCheck aria-hidden="true" className="size-6" strokeWidth={2.3} />
          </span>
          <p className="font-saku-head text-xl font-semibold">Cek email kamu</p>
          <p className="text-sm font-bold text-saku-muted">
            Jika email terdaftar, link reset password sudah dikirim. Link berlaku 30 menit.
          </p>
          <p className="text-xs font-bold text-saku-muted">Tidak ada? Cek folder spam.</p>
          <StickerButton className="mt-1" isLoading={isSubmitting} onClick={() => void send(sentTo)} size="md" variant="plain">
            Kirim ulang
          </StickerButton>
        </StickerCard>
      ) : (
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          <AuthField
            autoComplete="email"
            icon={Mail}
            label="Email"
            name="email"
            onChange={(event) => setEmail(event.target.value)}
            placeholder="nama@email.com"
            required
            type="email"
            value={email}
          />
          <StickerButton fullWidth isLoading={isSubmitting} type="submit">
            Kirim link reset
          </StickerButton>
        </form>
      )}
    </AuthScreen>
  );
}
