import { useEffect, useRef, useState } from "react";
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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [buttonWidth, setButtonWidth] = useState(320);

  useEffect(() => {
    function updateButtonWidth() {
      const currentElement = containerRef.current;

      if (!currentElement) {
        return;
      }

      const width = currentElement.getBoundingClientRect().width;
      const nextWidth = Math.max(240, Math.min(400, Math.floor(width)));

      setButtonWidth(nextWidth);
    }

    const observedElement = containerRef.current;

    if (!observedElement) {
      return;
    }

    updateButtonWidth();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", updateButtonWidth);

      return () => {
        window.removeEventListener("resize", updateButtonWidth);
      };
    }

    const resizeObserver = new ResizeObserver(updateButtonWidth);
    resizeObserver.observe(observedElement);

    return () => {
      resizeObserver.disconnect();
    };
  }, []);

  const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;

  if (isCapacitor) {
    return (
      <div className="rounded-2xl border border-zinc-200 bg-zinc-50 p-3.5 text-center text-xs font-semibold text-zinc-500 leading-normal">
        🔒 Login Google hanya didukung di versi Web. Silakan masuk menggunakan Email & Password Anda di aplikasi.
      </div>
    );
  }

  if (!googleClientId) {
    return (
      <button
        className="flex min-h-11 w-full cursor-not-allowed items-center justify-center rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-surface-soft)] px-4 text-center text-sm font-bold text-[var(--sakuin-muted)]"
        type="button"
        disabled
      >
        Google Login belum dikonfigurasi
      </button>
    );
  }

  return (
    <div
      ref={containerRef}
      className={
        disabled
          ? "pointer-events-none w-full min-w-0 opacity-60"
          : "w-full min-w-0"
      }
    >
      <GoogleOAuthProvider clientId={googleClientId}>
        <div className="flex min-h-11 w-full min-w-0 items-center justify-center rounded-2xl">
          <GoogleLogin
            text={text}
            size="large"
            theme="outline"
            shape="rectangular"
            width={`${buttonWidth}`}
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
