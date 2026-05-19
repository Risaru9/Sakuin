import { GoogleLogin, GoogleOAuthProvider } from "@react-oauth/google";

type GoogleAuthButtonText = "signin_with" | "signup_with" | "continue_with";

type GoogleAuthButtonProps = {
  text: GoogleAuthButtonText;
  disabled?: boolean;
  onCredential: (credential: string) => void | Promise<void>;
  onFailure: (message: string) => void;
};

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export function GoogleAuthButton({
  text,
  disabled = false,
  onCredential,
  onFailure
}: GoogleAuthButtonProps) {
  if (!googleClientId) {
    return (
      <button
        className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-surface-soft)] px-4 text-sm font-bold text-[var(--sakuin-muted)]"
        type="button"
        disabled
      >
        Google Login belum dikonfigurasi
      </button>
    );
  }

  return (
    <div className={disabled ? "pointer-events-none opacity-60" : undefined}>
      <GoogleOAuthProvider clientId={googleClientId}>
        <div className="flex min-h-11 w-full justify-center overflow-hidden rounded-2xl border border-[var(--sakuin-border)] bg-white px-2 py-1 shadow-sm">
          <GoogleLogin
            text={text}
            size="large"
            theme="outline"
            shape="pill"
            width="320"
            onSuccess={(credentialResponse) => {
              const credential = credentialResponse.credential;

              if (!credential) {
                onFailure("Google credential tidak ditemukan. Silakan coba lagi.");
                return;
              }

              void onCredential(credential);
            }}
            onError={() => {
              onFailure("Login Google gagal. Silakan coba lagi.");
            }}
          />
        </div>
      </GoogleOAuthProvider>
    </div>
  );
}