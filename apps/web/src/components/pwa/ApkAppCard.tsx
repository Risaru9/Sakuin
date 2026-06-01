import { useEffect, useState } from "react";
import { Download, RefreshCcw, Smartphone, Wifi, WifiOff, Loader2 } from "lucide-react";
import { useToast } from "../toast/ToastProvider";
import { apiRequest } from "../../lib/api-client";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";

type ApkVersionInfo = {
  latestVersionName: string;
  latestVersionCode: number;
  apkDownloadUrl: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
};

export function ApkAppCard() {
  const { addToast } = useToast();
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator === "undefined" ? true : navigator.onLine !== false
  );
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isApk, setIsApk] = useState(false);
  const [installedVersion, setInstalledVersion] = useState({ code: 0, name: "Bukan APK / Browser" });
  const [latestVersion, setLatestVersion] = useState<ApkVersionInfo | null>(null);

  useEffect(() => {
    // 1. Cek environment
    const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
    const isCapacitor = typeof window !== "undefined" && !!(window as any).Capacitor;
    const isAndroidWidgetBridge = typeof window !== "undefined" && !!(window as any).AndroidWidgetBridge;
    const detectedApk = isAndroid && (isCapacitor || isAndroidWidgetBridge);

    setIsApk(detectedApk);

    if (detectedApk) {
      let installedCode = 2; // legacy default
      let installedName = "1.1";

      if (isAndroidWidgetBridge && typeof (window as any).AndroidWidgetBridge.getAppVersionCode === "function") {
        try {
          installedCode = (window as any).AndroidWidgetBridge.getAppVersionCode();
          installedName = (window as any).AndroidWidgetBridge.getAppVersionName 
            ? (window as any).AndroidWidgetBridge.getAppVersionName() 
            : "1.2+";
        } catch (e) {
          console.error("Gagal mendapatkan info versi dari native AndroidWidgetBridge", e);
        }
      }
      setInstalledVersion({ code: installedCode, name: `v${installedName} (${installedCode})` });
    }

    // 2. Event listener online/offline
    function handleOnlineChange() {
      setIsOnline(navigator.onLine !== false);
    }
    window.addEventListener("online", handleOnlineChange);
    window.addEventListener("offline", handleOnlineChange);

    // 3. Load latest version info on mount
    async function loadLatestVersion() {
      try {
        let data: ApkVersionInfo;
        try {
          data = await apiRequest<ApkVersionInfo>("/app-version");
        } catch {
          const response = await fetch("/latest-version.json");
          data = await response.json();
        }
        setLatestVersion(data);
      } catch (err) {
        console.error("Gagal mengambil versi APK terbaru", err);
      }
    }
    void loadLatestVersion();

    return () => {
      window.removeEventListener("online", handleOnlineChange);
      window.removeEventListener("offline", handleOnlineChange);
    };
  }, []);

  async function handleCheckUpdate() {
    try {
      setIsCheckingUpdate(true);
      
      let data: ApkVersionInfo;
      try {
        data = await apiRequest<ApkVersionInfo>("/app-version");
      } catch {
        const response = await fetch("/latest-version.json");
        data = await response.json();
      }
      setLatestVersion(data);

      if (!isApk) {
        addToast({
          variant: "info",
          title: "Bukan Aplikasi Android",
          description: "Anda membuka Sakuin lewat browser. Fitur update otomatis tidak aktif.",
          duration: 5000
        });
        return;
      }

      // Bandingkan versi
      const isAndroidWidgetBridge = typeof window !== "undefined" && !!(window as any).AndroidWidgetBridge;
      let installedCode = 2; // legacy default
      if (isAndroidWidgetBridge && typeof (window as any).AndroidWidgetBridge.getAppVersionCode === "function") {
        try {
          installedCode = (window as any).AndroidWidgetBridge.getAppVersionCode();
        } catch (e) {
          console.error(e);
        }
      }

      if (data.latestVersionCode > installedCode) {
        addToast({
          variant: "success",
          title: "Update Tersedia!",
          description: `Versi terbaru v${data.latestVersionName} tersedia untuk diunduh. Silakan ketuk tombol Perbarui.`,
          duration: 6000
        });
      } else {
        addToast({
          variant: "success",
          title: "Aplikasi Terkini",
          description: `Sakuin APK Anda sudah menggunakan versi terbaru.`,
          duration: 5000
        });
      }
    } catch {
      addToast({
        variant: "error",
        title: "Koneksi Gagal",
        description: "Gagal terhubung ke server untuk mengecek versi terbaru.",
        duration: 5000
      });
    } finally {
      setIsCheckingUpdate(false);
    }
  }

  const downloadUrl = latestVersion?.apkDownloadUrl || null;

  return (
    <section className="rounded-3xl border border-[var(--sakuin-border)] bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-black text-[var(--sakuin-text)]">Aplikasi Android (APK)</p>
          <p className="mt-1 text-xs font-semibold leading-5 text-zinc-600">
            Gunakan file APK resmi untuk menikmati fitur widget home-screen native Android.
          </p>
        </div>

        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-[var(--sakuin-border)] shadow-sm">
          <Smartphone className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-2xl bg-zinc-50 p-3">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Versi Terpasang
            </p>
            <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
              {installedVersion.name}
            </p>
          </div>

          <div className="rounded-2xl bg-[var(--sakuin-primary-soft)] p-3">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Versi Terbaru
            </p>
            <p className="mt-1 truncate text-xs font-black text-[var(--sakuin-text)]">
              {latestVersion ? `v${latestVersion.latestVersionName} (${latestVersion.latestVersionCode})` : "Mengecek..."}
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
          <div className="min-w-0 flex-1">
            <p className="text-xs font-black text-[var(--sakuin-text)]">
              {isOnline ? "Koneksi Online" : "Koneksi Offline"}
            </p>
            <p className="mt-0.5 text-xs font-semibold leading-5 text-zinc-600">
              {isOnline
                ? "Bisa mengunduh update dan mengecek rilis terbaru."
                : "Koneksi internet terputus. Silakan hubungkan kembali."}
            </p>
          </div>
        </div>

        <div className="grid gap-2">
          {downloadUrl ? (
            <a
              href={downloadUrl}
              target="_system"
              onClick={(e) => {
                if (isDownloading) {
                  e.preventDefault();
                  return;
                }

                if (Capacitor.isNativePlatform()) {
                  e.preventDefault();
                  void Browser.open({ url: downloadUrl });
                }
                
                // Beri delay pada perubahan UI
                setTimeout(() => {
                  setIsDownloading(true);
                  addToast({
                    variant: "info",
                    title: "Mengunduh Pembaruan...",
                    description: "Pengunduhan APK dimulai di latar belakang. Silakan periksa panel notifikasi Anda.",
                    duration: 7000
                  });
                  
                  // Reset state
                  setTimeout(() => setIsDownloading(false), 5000);
                }, 100);
              }}
              aria-disabled={isDownloading}
              className={`inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[var(--sakuin-secondary)] px-4 text-sm font-black text-white shadow-sm transition hover:opacity-90 ${
                isDownloading ? "opacity-70 cursor-wait pointer-events-none" : ""
              }`}
            >
              {isDownloading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin text-white" />
                  Mengunduh APK...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 text-white" />
                  {isApk ? "Unduh / Perbarui APK" : "Unduh Aplikasi (APK)"}
                </>
              )}
            </a>
          ) : (
            <div className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-zinc-100 px-4 text-sm font-black text-zinc-400 border border-zinc-200">
              Unduhan belum tersedia saat ini
            </div>
          )}

          <button
            className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-[var(--sakuin-border)] bg-white px-4 text-sm font-black text-[var(--sakuin-text)] shadow-sm transition hover:bg-[var(--sakuin-primary-soft)] disabled:cursor-not-allowed disabled:opacity-60"
            disabled={isCheckingUpdate}
            onClick={() => void handleCheckUpdate()}
            type="button"
          >
            <RefreshCcw
              className={isCheckingUpdate ? "h-4 w-4 animate-spin" : "h-4 w-4"}
            />
            Cek Pembaruan APK
          </button>
        </div>

        {latestVersion && (
          <div className="rounded-2xl border border-[var(--sakuin-border)] bg-[var(--sakuin-primary-soft)] p-3.5">
            <p className="text-[10px] font-black uppercase text-zinc-500">
              Catatan Rilis Terbaru (v{latestVersion.latestVersionName})
            </p>
            <ul className="mt-2.5 grid gap-1.5">
              {latestVersion.releaseNotes.map((note) => (
                <li
                  className="flex gap-2 text-xs font-semibold leading-relaxed text-zinc-700"
                  key={note}
                >
                  <span className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--sakuin-secondary)]" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
