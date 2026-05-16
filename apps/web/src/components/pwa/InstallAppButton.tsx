import { useEffect, useState } from "react";
import { Download, Smartphone } from "lucide-react";
import { useToast } from "../toast/ToastProvider";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{
    outcome: "accepted" | "dismissed";
    platform: string;
  }>;
};

type InstallAppButtonProps = {
  className?: string;
  label?: string;
  compact?: boolean;
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
    return "Untuk iPhone/iPad: buka Safari, tap tombol Share, lalu pilih Add to Home Screen.";
  }

  if (/android/.test(userAgent)) {
    return "Untuk Android: buka menu browser Chrome/Edge, lalu pilih Install app atau Add to Home screen.";
  }

  return "Buka menu browser, lalu pilih Install app atau Apps > Install this site as an app.";
}

export function InstallAppButton({
  className,
  label = "Install Sakuin",
  compact = false
}: InstallAppButtonProps) {
  const { addToast } = useToast();
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleBeforeInstallPrompt(event: Event) {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    function handleAppInstalled() {
      setDeferredPrompt(null);
      setIsInstalled(true);

      addToast({
        variant: "success",
        title: "Sakuin berhasil diinstall",
        description: "Sakuin sekarang bisa dibuka seperti aplikasi."
      });
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
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

    if (!deferredPrompt) {
      addToast({
        variant: "info",
        title: "Install manual dari browser",
        description: getManualInstallMessage(),
        duration: 7000
      });

      return;
    }

    await deferredPrompt.prompt();

    const choice = await deferredPrompt.userChoice;

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

    setDeferredPrompt(null);
  }

  return (
    <button
      className={
        className ??
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-800 shadow-sm transition hover:bg-slate-50"
      }
      onClick={handleInstallClick}
      type="button"
    >
      {isInstalled ? (
        <Smartphone className={compact ? "h-4 w-4" : "h-5 w-5"} />
      ) : (
        <Download className={compact ? "h-4 w-4" : "h-5 w-5"} />
      )}
      {isInstalled ? "Sudah terinstall" : label}
    </button>
  );
}