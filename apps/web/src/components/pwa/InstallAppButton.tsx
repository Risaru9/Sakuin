import { useEffect, useState } from "react";
import { Download, Info, Smartphone } from "lucide-react";
import { useToast } from "../toast/ToastProvider";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent
} from "../../lib/pwa";

type InstallAppButtonVariant = "navbar" | "hero" | "compact";

type InstallAppButtonProps = {
  className?: string;
  label?: string;
  variant?: InstallAppButtonVariant;
};

function isStandaloneMode() {
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    window.matchMedia("(display-mode: fullscreen)").matches ||
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function getManualInstallMessage() {
  const userAgent = window.navigator.userAgent.toLowerCase();

  if (/iphone|ipad|ipod/.test(userAgent)) {
    return "Dialog install belum tersedia. Untuk iPhone/iPad: buka Safari, tap Share, lalu pilih Add to Home Screen.";
  }

  if (/android/.test(userAgent)) {
    return "Dialog install belum tersedia. Coba tunggu beberapa detik, refresh halaman, atau gunakan menu browser Chrome/Edge > Install app/Add to Home screen.";
  }

  return "Dialog install belum tersedia. Buka menu browser, lalu pilih Install app atau Apps > Install this site as an app.";
}

function getButtonClassName(variant: InstallAppButtonVariant, className?: string) {
  if (className) {
    return className;
  }

  if (variant === "navbar") {
    return "hidden items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50 md:inline-flex";
  }

  if (variant === "compact") {
    return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50";
  }

  return "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] border border-slate-200 bg-white px-6 text-base font-black text-slate-800 shadow-sm transition hover:bg-slate-50 sm:w-auto";
}

export function InstallAppButton({
  className,
  label = "Install Sakuin",
  variant = "hero"
}: InstallAppButtonProps) {
  const { addToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());
    setDeferredPrompt(getDeferredInstallPrompt());

    const unsubscribe = subscribeToInstallPrompt((event) => {
      setDeferredPrompt(event);
    });

    function handleAppInstalled() {
      clearDeferredInstallPrompt();
      setDeferredPrompt(null);
      setIsInstalled(true);

      addToast({
        variant: "success",
        title: "Sakuin berhasil diinstall",
        description: "Sakuin sekarang bisa dibuka seperti aplikasi."
      });
    }

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      unsubscribe();
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, [addToast]);

  async function handleInstallClick() {
    if (isInstalled) {
      addToast({
        variant: "info",
        title: "Sakuin sudah terinstall",
        description: "Buka Sakuin dari home screen atau daftar aplikasi perangkatmu."
      });

      return;
    }

    const installPrompt = deferredPrompt ?? getDeferredInstallPrompt();

    if (!installPrompt) {
      addToast({
        variant: "info",
        title: "Dialog install belum tersedia",
        description: getManualInstallMessage(),
        duration: 8000
      });

      return;
    }

    await installPrompt.prompt();

    const choice = await installPrompt.userChoice;

    if (choice.outcome === "accepted") {
      addToast({
        variant: "success",
        title: "Install Sakuin diproses",
        description: "Ikuti dialog browser untuk menyelesaikan instalasi."
      });
    } else {
      addToast({
        variant: "info",
        title: "Install dibatalkan",
        description: "Kamu bisa mencoba install lagi nanti dari tombol ini."
      });
    }

    clearDeferredInstallPrompt();
    setDeferredPrompt(null);
  }

  const Icon = isInstalled ? Smartphone : deferredPrompt ? Download : Info;

  return (
    <button
      className={getButtonClassName(variant, className)}
      onClick={handleInstallClick}
      type="button"
    >
      <Icon className="h-5 w-5" />
      <span>{isInstalled ? "Sudah terinstall" : label}</span>
    </button>
  );
}