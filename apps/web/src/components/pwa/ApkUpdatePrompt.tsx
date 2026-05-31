import { useEffect, useState } from "react";
import { CheckCircle2, Download, Smartphone, X, Loader2 } from "lucide-react";
import { apiRequest } from "../../lib/api-client";
import { useToast } from "../toast/ToastProvider";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

type ApkVersionInfo = {
  latestVersionName: string;
  latestVersionCode: number;
  apkDownloadUrl: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
};

export function ApkUpdatePrompt() {
  const [updateInfo, setUpdateInfo] = useState<ApkVersionInfo | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [currentVersion, setCurrentVersion] = useState({ code: 2, name: "1.1" });
  const [isDownloading, setIsDownloading] = useState(false);
  const { addToast } = useToast();

  useEffect(() => {
    // 1. Cek apakah berjalan di dalam environment Android APK
    const isNativeCapacitor = Capacitor.isNativePlatform();
    const isAndroidWidgetBridge = typeof window !== "undefined" && !!(window as any).AndroidWidgetBridge;
    const isAndroidApk = isNativeCapacitor || isAndroidWidgetBridge;

    if (!isAndroidApk) {
      return;
    }

    // 2. Ambil data versi terbaru dari server API (dengan pembacaan bridge versi terbaru)
    async function checkApkVersion() {
      try {
        const isAndroidWidgetBridgeNow = typeof window !== "undefined" && !!(window as any).AndroidWidgetBridge;
        let installedCode = 2;
        let installedName = "1.1";

        if (isNativeCapacitor) {
          try {
            const info = await CapacitorApp.getInfo();
            installedCode = parseInt(info.build || "2", 10);
            installedName = info.version || "1.1";
          } catch (e) {
            console.error("Gagal mendapatkan info versi dari Capacitor", e);
          }
        } else if (isAndroidWidgetBridgeNow && typeof (window as any).AndroidWidgetBridge.getAppVersionCode === "function") {
          try {
            installedCode = (window as any).AndroidWidgetBridge.getAppVersionCode();
            installedName = (window as any).AndroidWidgetBridge.getAppVersionName 
              ? (window as any).AndroidWidgetBridge.getAppVersionName() 
              : "1.2+";
          } catch (e) {
            console.error("Gagal mendapatkan info versi dari native AndroidWidgetBridge", e);
          }
        }

        setCurrentVersion({ code: installedCode, name: installedName });

        let data: ApkVersionInfo;
        try {
          data = await apiRequest<ApkVersionInfo>("/app-version");
        } catch (apiError) {
          console.warn("Gagal fetch versi dari API, mencoba fallback ke static JSON...", apiError);
          const response = await fetch("/latest-version.json");
          if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          data = await response.json();
        }

        if (data && data.latestVersionCode > installedCode && data.apkDownloadUrl) {
          // Cek jika update ini sudah pernah di-dismiss oleh user sebelumnya
          const dismissedCode = localStorage.getItem("sakuin_dismissed_apk_version");
          const hasBeenDismissed = dismissedCode === String(data.latestVersionCode);

          if (data.forceUpdate || !hasBeenDismissed) {
            setUpdateInfo(data);
            setShowPrompt(true);
          }
        }
      } catch (err) {
        console.error("Gagal mengecek update APK Sakuin", err);
      }
    }

    // Jalankan setelah delay singkat agar tidak mengganggu inisialisasi app utama
    const timer = setTimeout(() => {
      void checkApkVersion();
    }, 1500);

    return () => clearTimeout(timer);
  }, []);

  function handleDismiss() {
    if (updateInfo) {
      localStorage.setItem("sakuin_dismissed_apk_version", String(updateInfo.latestVersionCode));
    }
    setShowPrompt(false);
  }

  function handleUpdate(e: React.MouseEvent<HTMLAnchorElement>) {
    if (isDownloading) {
      e.preventDefault();
      return;
    }

    if (updateInfo && updateInfo.apkDownloadUrl) {
      // 2. Beri delay pada perubahan UI agar intent OS tidak terinterupsi/dibatalkan
      setTimeout(() => {
        setIsDownloading(true);
        addToast({
          variant: "info",
          title: "Mengunduh Pembaruan...",
          description: "Pengunduhan APK dimulai di latar belakang. Silakan periksa panel notifikasi Anda.",
          duration: 7000
        });

        // 3. Reset state setelah beberapa detik
        setTimeout(() => {
          setIsDownloading(false);
          // Jika force update, kita biarkan saja prompt-nya tidak tertutup agar user menginstallnya
          if (!updateInfo.forceUpdate) {
             setShowPrompt(false);
          }
        }, 5000);
      }, 100);
    }
  }

  if (!showPrompt || !updateInfo) {
    return null;
  }

  // Render modal backdrop fullscreen jika forceUpdate aktif
  if (updateInfo.forceUpdate) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
        <section className="w-full max-w-sm overflow-hidden rounded-[2rem] border border-[var(--sakuin-border)] bg-white shadow-2xl">
          <div className="h-1.5 w-full bg-rose-600" />
          <div className="p-6">
            <div className="flex flex-col items-center text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600 shadow-sm">
                <Smartphone className="h-8 w-8" />
              </div>
              <h2 className="mt-4 text-lg font-black text-rose-900">
                Update Wajib Tersedia
              </h2>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-rose-700 bg-rose-50 px-2.5 py-1 rounded-full">
                Versi Saat Ini: v{currentVersion.name} &rarr; Terbaru: v{updateInfo.latestVersionName}
              </p>
              <p className="mt-3 text-xs font-semibold leading-relaxed text-zinc-500">
                Kamu harus memperbarui aplikasi ke versi terbaru untuk tetap dapat menggunakan Sakuin secara aman dan stabil.
              </p>
            </div>

            <div className="mt-4 rounded-2xl border border-[var(--sakuin-border)] bg-zinc-50 p-3.5">
              <p className="text-[10px] font-black uppercase tracking-wider text-zinc-400">Catatan Pembaruan:</p>
              <ul className="mt-2 grid gap-1.5 text-left">
                {updateInfo.releaseNotes.map((note) => (
                  <li className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-zinc-700" key={note}>
                    <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>

            {updateInfo.apkDownloadUrl ? (
              <a
                href={updateInfo.apkDownloadUrl}
                target="_system"
                onClick={handleUpdate}
                aria-disabled={isDownloading}
                className={`mt-5 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-rose-600 px-5 text-sm font-black text-white shadow-md transition hover:bg-rose-700 active:scale-98 ${
                  isDownloading ? "opacity-70 cursor-wait pointer-events-none" : ""
                }`}
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin text-white" />
                    Sedang Mengunduh...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 text-white" />
                    Perbarui Sekarang
                  </>
                )}
              </a>
            ) : (
              <div className="mt-5 p-3 text-center text-xs font-semibold leading-relaxed text-rose-700 bg-rose-50 rounded-2xl border border-rose-100">
                Pembaruan terdeteksi, tetapi tautan unduhan belum tersedia saat ini.
              </div>
            )}
          </div>
        </section>
      </div>
    );
  }

  // Render bottom-right card floating jika normal update
  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-[270] px-4 lg:bottom-5 lg:left-auto lg:right-5 lg:max-w-sm lg:px-0">
      <section className="overflow-hidden rounded-3xl border border-[var(--sakuin-border)] bg-white shadow-[0_24px_70px_rgba(0,0,0,0.16)]">
        <div className="h-1.5 w-full bg-[var(--sakuin-primary)]" />
        
        <div className="p-5">
          <div className="flex items-start gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 shadow-sm">
              <Smartphone className="h-6 w-6" />
            </div>

            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-black text-[var(--sakuin-text)]">
                Update Aplikasi Sakuin (v{updateInfo.latestVersionName})
              </h3>
              <p className="mt-0.5 text-[10px] font-bold text-zinc-400">
                Versi Saat Ini: v{currentVersion.name}
              </p>
              <p className="mt-1.5 text-xs font-semibold leading-relaxed text-zinc-500">
                Versi APK terbaru sudah tersedia. Nikmati pembaruan fitur dan widget yang lebih lancar.
              </p>
            </div>

            <button
              aria-label="Tutup info update"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-zinc-50 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 transition"
              onClick={handleDismiss}
              type="button"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3.5 rounded-2xl border border-[var(--sakuin-border)] bg-zinc-50 p-3.5">
            <p className="text-[9px] font-black uppercase tracking-wider text-zinc-400">Catatan Pembaruan:</p>
            <ul className="mt-2 grid gap-1.5">
              {updateInfo.releaseNotes.map((note) => (
                <li className="flex items-start gap-2 text-xs font-semibold leading-relaxed text-zinc-700" key={note}>
                  <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                  <span>{note}</span>
                </li>
              ))}
            </ul>
          </div>

          {updateInfo.apkDownloadUrl ? (
            <div className="mt-4 grid grid-cols-2 gap-2.5">
              <a
                href={updateInfo.apkDownloadUrl}
                target="_system"
                onClick={handleUpdate}
                aria-disabled={isDownloading}
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-2xl bg-[var(--sakuin-secondary)] px-4 text-xs font-black text-white shadow-sm transition hover:opacity-90 ${
                  isDownloading ? "opacity-70 cursor-wait pointer-events-none" : ""
                }`}
              >
                {isDownloading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-white" />
                ) : (
                  <Download className="h-3.5 w-3.5 text-white" />
                )}
                {isDownloading ? "Mengunduh..." : "Perbarui"}
              </a>
              <button
                onClick={handleDismiss}
                className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-zinc-100 px-4 text-xs font-black text-zinc-700 transition hover:bg-zinc-200"
                type="button"
              >
                Nanti
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-2">
              <div className="p-3 text-center text-xs font-semibold text-zinc-500 bg-zinc-50 rounded-xl">
                Unduhan belum tersedia untuk versi ini.
              </div>
              <button
                onClick={handleDismiss}
                className="inline-flex min-h-11 w-full items-center justify-center rounded-2xl bg-zinc-100 px-4 text-xs font-black text-zinc-700 transition hover:bg-zinc-200"
                type="button"
              >
                Tutup
              </button>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
