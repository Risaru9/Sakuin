import { useState, type FormEvent } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LockKeyhole, Mail } from "lucide-react";
import { StickerButton } from "../../../components/saku";
import { ApiClientError } from "../../../lib/api-client";
import { AuthDivider, AuthField, AuthNotice, AuthScreen } from "../components/AuthParts";
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

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login, loginWithGoogle } = useAuth();
  const locationState = location.state as { resetPasswordSuccess?: boolean } | null;
  const searchParams = new URLSearchParams(location.search);
  const isExpired = searchParams.get("expired") === "true";
  const successMessage = locationState?.resetPasswordSuccess
    ? "Password berhasil diganti. Masuk dengan password baru, ya."
    : null;
  const expiredMessage = isExpired ? "Sesimu sudah berakhir. Silakan masuk lagi." : null;
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      await login(form);
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
          Belum punya akun?{" "}
          <Link className="font-black text-saku-accent" to="/register">
            Daftar
          </Link>
        </>
      }
      greeting="Hai lagi! Yuk lanjut mencatat."
      subtitle="Catatan keuanganmu menunggu."
      title="Masuk ke Sakuin"
    >
      {expiredMessage && !error ? <AuthNotice tone="warn">{expiredMessage}</AuthNotice> : null}
      {successMessage && !error && !expiredMessage ? <AuthNotice tone="success">{successMessage}</AuthNotice> : null}
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}

      <GoogleAuthButton
        disabled={isSubmitting || isGoogleSubmitting}
        onCredential={handleGoogleCredential}
        onFailure={setError}
        text="signin_with"
      />

      <AuthDivider>atau pakai email</AuthDivider>

      <form className="space-y-3.5" onSubmit={handleSubmit}>
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
        <AuthField
          autoComplete="current-password"
          icon={LockKeyhole}
          label="Password"
          name="password"
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Password"
          type="password"
          value={form.password}
        />
        <div className="flex justify-end">
          <Link className="text-sm font-black text-saku-accent" to="/forgot-password">
            Lupa password?
          </Link>
        </div>
        <StickerButton disabled={isGoogleSubmitting} fullWidth isLoading={isSubmitting} type="submit">
          Masuk
        </StickerButton>
      </form>
    </AuthScreen>
  );
}
