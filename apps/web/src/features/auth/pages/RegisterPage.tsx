import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail, UserRound } from "lucide-react";
import { StickerButton } from "../../../components/saku";
import { ApiClientError } from "../../../lib/api-client";
import { AuthDivider, AuthField, AuthNotice, AuthScreen, PasswordChecklist } from "../components/AuthParts";
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
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await register(form);
      navigate("/dashboard", { replace: true });
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
      await loginWithGoogle({ credential });
      navigate("/dashboard", { replace: true });
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsGoogleSubmitting(false);
    }
  }

  return (
    <AuthScreen
      footer={
        <>
          Sudah punya akun?{" "}
          <Link className="font-black text-saku-accent" to="/login">
            Masuk
          </Link>
        </>
      }
      greeting="Halo! Aku Saku, teman catat uangmu."
      subtitle="Gratis, cukup satu menit."
      title="Buat akun"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      <GoogleAuthButton
        disabled={isSubmitting || isGoogleSubmitting}
        onCredential={handleGoogleCredential}
        onFailure={setError}
        text="signup_with"
      />

      <AuthDivider>atau pakai email</AuthDivider>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <AuthField
          autoComplete="name"
          icon={UserRound}
          label="Nama"
          name="name"
          onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
          placeholder="Nama kamu"
          value={form.name}
        />
        <AuthField
          autoComplete="email"
          icon={Mail}
          label="Email"
          name="email"
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="nama@email.com"
          type="email"
          value={form.email}
        />
        <div>
          <AuthField
            autoComplete="new-password"
            icon={LockKeyhole}
            label="Password"
            name="password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            placeholder="Password"
            type="password"
            value={form.password}
          />
          <PasswordChecklist password={form.password} />
        </div>
        <StickerButton disabled={isGoogleSubmitting} fullWidth isLoading={isSubmitting} type="submit">
          Buat akun
        </StickerButton>
        <p className="text-center text-xs font-bold text-saku-muted">
          Dengan mendaftar, kamu setuju dengan{" "}
          <Link className="font-black text-saku-accent" to="/privacy">
            Kebijakan Privasi
          </Link>
          .
        </p>
      </form>
    </AuthScreen>
  );
}
