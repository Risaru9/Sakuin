import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Download, Info, Smartphone } from "lucide-react";
import { useToast } from "../toast/ToastProvider";
import {
  clearDeferredInstallPrompt,
  getDeferredInstallPrompt,
  getManualInstallMessage,
  isStandaloneMode,
  subscribeToInstallPrompt,
  type BeforeInstallPromptEvent
} from "../../lib/pwa";

type InstallAppButtonVariant = "navbar" | "hero" | "compact";

type InstallAppButtonProps = {
  className?: string;
  fallbackToGuide?: boolean;
  label?: string;
  variant?: InstallAppButtonVariant;
};

function getButtonClassName(variant: InstallAppButtonVariant, className?: string) {
  if (className) {
    return className;
  }

  if (variant === "navbar") {
    return "hidden items-center justify-center gap-2 rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 py-2 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] md:inline-flex";
  }

  if (variant === "compact") {
    return "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)]";
  }

  return "inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-[1.35rem] border border-[var(--sakuin-border)] bg-white px-6 text-base font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] sm:w-auto";
}

export function InstallAppButton({
  className,
  fallbackToGuide = true,
  label = "Install Sakuin",
  variant = "hero"
}: InstallAppButtonProps) {
  const { addToast } = useToast();
  const navigate = useNavigate();
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
        description: "Sakuin sekarang bisa dibuka dari home screen atau daftar aplikasi.",
        duration: 6000
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
        description:
          "Update fitur akan masuk otomatis dari Sakuin. Kamu tidak perlu install ulang berkali-kali.",
        duration: 7000
      });

      return;
    }

    const installPrompt = deferredPrompt ?? getDeferredInstallPrompt();

    if (!installPrompt) {
      if (fallbackToGuide) {
        navigate("/install");
        return;
      }

      addToast({
        variant: "info",
        title: "Install manual dari browser",
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
        description: "Ikuti dialog browser untuk menyelesaikan instalasi.",
        duration: 6000
      });
    } else {
      addToast({
        variant: "info",
        title: "Install dibatalkan",
        description: "Kamu bisa mencoba install lagi nanti dari tombol ini.",
        duration: 6000
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
