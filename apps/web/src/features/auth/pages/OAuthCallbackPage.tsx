import { useEffect } from "react";

export function OAuthCallbackPage() {
  useEffect(() => {
    if (window.location.hash) {
      const params = new URLSearchParams(window.location.hash.substring(1));
      const idToken = params.get("id_token");

      if (idToken) {
        // Redirect to custom URL scheme
        window.location.assign(`com.sakuin.app://login?id_token=${idToken}`);
      }
    }
  }, []);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-white px-4 text-center text-[var(--sakuin-text)]">
      <div className="max-w-sm">
        <h1 className="text-xl font-black">Menghubungkan kembali...</h1>
        <p className="mt-2 text-sm text-zinc-500">
          Mengalihkan Anda kembali ke aplikasi Sakuin. Jika tidak terjadi apa-apa, pastikan Anda membuka halaman ini dari aplikasi mobile.
        </p>
        <div className="mt-6 flex justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--sakuin-secondary)] border-t-transparent" />
        </div>
      </div>
    </div>
  );
}
