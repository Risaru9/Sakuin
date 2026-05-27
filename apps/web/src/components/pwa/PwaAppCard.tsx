import { useEffect, useState } from "react";
import { RefreshCcw, Smartphone, Wifi, WifiOff } from "lucide-react";
import { useToast } from "../toast/ToastProvider";
import {
  checkForServiceWorkerUpdate,
  getInstallPlatform,
  isStandaloneMode
} from "../../lib/pwa";
import { InstallAppButton } from "./InstallAppButton";

function getPlatformLabel() {
  const platform = getInstallPlatform();

  if (platform === "ios") {
    return "iPhone/iPad";
  }

  if (platform === "android") {
    return "Android";
  }

  if (platform === "desktop") {
    return "Desktop";
  }

  return "Browser";
}

export function PwaAppCard() {
  const { addToast } = useToast();
  const [isInstalled, setIsInstalled] = useState(false);
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine
  );
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);

  useEffect(() => {
    setIsInstalled(isStandaloneMode());

    function handleOnlineChange() {
      setIsOnline(navigator.onLine);
    }

    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);

    return () => {
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
    };
  }, []);

  async function handleCheckUpdate() {
    try {
      setIsCheckingUpdate(true);
      await checkForServiceWorkerUpdate();

      addToast({
        variant: "info",
        title: "Pengecekan update selesai",
        description:
          "Jika ada versi baru, Sakuin akan menampilkan tombol update secara otomatis.",
        duration: 6000
      });
    } catch {
      addToast({
        variant: "error",
        title: "Belum bisa cek update",
        description:
          "Coba lagi saat koneksi stabil atau buka ulang Sakuin beberapa saat lagi.",
        duration: 6000
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  return (
    <section className="rounded-3xl border border-black/10 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-black">Aplikasi Sakuin</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
            Install ke home screen dan update tanpa install ulang.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-yellow-300 text-black">
          <Smartphone className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-zinc-50 p-3">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Mode
            </p>
            <p className="mt-1 text-sm font-black text-black">
              {isInstalled ? "Terinstall" : "Browser"}
            </p>
          </div>

          <div className="rounded-2xl bg-yellow-50 p-3">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Platform
            </p>
            <p className="mt-1 text-sm font-black text-black">
              {getPlatformLabel()}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 rounded-2xl bg-zinc-50 p-3">
          <div
            className={
              isOnline
                ? "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-700"
                : "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-700"
            }
          >
            {isOnline ? (
              <Wifi className="h-4 w-4" />
            ) : (
              <WifiOff className="h-4 w-4" />
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black text-black">
              {isOnline ? "Online" : "Offline"}
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-zinc-600">
              {isOnline
                ? "Data terbaru bisa diambil dari server."
                : "Sakuin akan memakai halaman fallback sampai koneksi kembali."}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          <InstallAppButton
            label="Install Sakuin"
            variant="compact"
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-black px-4 text-sm font-black text-white shadow-sm transition hover:bg-zinc-800"
          />

          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-black/10 bg-white px-4 text-sm font-black text-black shadow-sm transition hover:bg-yellow-50 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCheckingUpdate}
            onClick={() => void handleCheckUpdate()}
            type="button"
          >
            <RefreshCcw
              className={isCheckingUpdate ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Cek update
          </button>
        </div>
      </div>
    </section>
  );
}
