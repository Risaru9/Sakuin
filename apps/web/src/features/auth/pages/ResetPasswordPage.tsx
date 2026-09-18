import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { LockKeyhole } from "lucide-react";
import { StickerButton } from "../../../components/saku";
import { ApiClientError } from "../../../lib/api-client";
import { resetPasswordUser } from "../auth.service";
import { AuthField, AuthNotice, AuthScreen, PasswordChecklist } from "../components/AuthParts";

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

const INVALID_LINK_MESSAGE = "Link reset password tidak valid atau token tidak ditemukan.";

export function ResetPasswordPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTimeoutRef = useRef<number | null>(null);
  const token = searchParams.get("token")?.trim() ?? "";
  const hasToken = token.length > 0;
  const [form, setForm] = useState({ password: "", confirmPassword: "" });
  const [error, setError] = useState<string | null>(hasToken ? null : INVALID_LINK_MESSAGE);
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
      setError(INVALID_LINK_MESSAGE);
      return;
    }

    const validationError = validatePassword(form.password, form.confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await resetPasswordUser({ token, password: form.password });
      setSuccessMessage("Password baru tersimpan. Sebentar lagi kamu diarahkan ke halaman masuk.");
      redirectTimeoutRef.current = window.setTimeout(() => {
        navigate("/login", { replace: true, state: { resetPasswordSuccess: true } });
      }, 1200);
    } catch (caughtError) {
      setError(getErrorMessage(caughtError));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthScreen
      footer={
        hasToken ? (
          "Link ini hanya berlaku 30 menit sejak dikirim."
        ) : (
          <Link className="font-black text-saku-accent" to="/forgot-password">
            Minta link baru
          </Link>
        )
      }
      greeting="Sedikit lagi! Buat password baru, ya."
      mood={successMessage ? "wow" : "happy"}
      subtitle="Setelah disimpan, masuk lagi dengan password ini."
      title="Password baru"
    >
      {error ? <AuthNotice tone="error">{error}</AuthNotice> : null}
      {successMessage ? <AuthNotice tone="success">{successMessage}</AuthNotice> : null}

      <form className="space-y-3.5" onSubmit={handleSubmit}>
        <div>
          <AuthField
            autoComplete="new-password"
            disabled={!hasToken}
            icon={LockKeyhole}
            label="Password baru"
            name="password"
            onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
            type="password"
            value={form.password}
          />
          <PasswordChecklist password={form.password} />
        </div>
        <div>
          <AuthField
            autoComplete="new-password"
            disabled={!hasToken}
            icon={LockKeyhole}
            label="Ulangi password baru"
            name="confirmPassword"
            onChange={(event) => setForm((current) => ({ ...current, confirmPassword: event.target.value }))}
            type="password"
            value={form.confirmPassword}
          />
          {form.confirmPassword ? (
            <p className={form.confirmPassword === form.password ? "mt-1.5 text-xs font-black text-saku-income" : "mt-1.5 text-xs font-black text-saku-over-text"}>
              {form.confirmPassword === form.password ? "Password sama" : "Belum sama dengan password di atas"}
            </p>
          ) : null}
        </div>
        <StickerButton disabled={!hasToken || Boolean(successMessage)} fullWidth isLoading={isSubmitting} type="submit">
          Simpan password baru
        </StickerButton>
      </form>
    </AuthScreen>
  );
}
