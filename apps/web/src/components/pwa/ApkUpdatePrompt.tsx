import { useEffect, useState } from "react";
import { CheckCircle2, Download, X, Loader2 } from "lucide-react";
import { apiRequest } from "../../lib/api-client";
import { SakuMascot } from "../saku";
import { useToast } from "../toast/ToastProvider";
import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

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
          data = await apiRequest<ApkVersionInfo>("/api/app-version");
        } catch (apiError) {
          console.warn("Gagal fetch versi dari API, mencoba fallback ke static JSON...", apiError);
          const response = await fetch("/latest-version.json", { cache: "no-store" });
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
      if (Capacitor.isNativePlatform()) {
        e.preventDefault();
        void Browser.open({ url: updateInfo.apkDownloadUrl });
      }

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

  const notes = (
    <ul className="mt-3 space-y-1.5">
      {updateInfo.releaseNotes.map((note) => (
        <li className="flex items-start gap-2 text-sm font-bold" key={note}>
          <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-saku-income" strokeWidth={2.6} />
          <span>{note}</span>
        </li>
      ))}
    </ul>
  );
  const downloadLink = updateInfo.apkDownloadUrl ? (
    <a
      aria-disabled={isDownloading}
      className={`saku-line saku-press inline-flex min-h-13 flex-1 items-center justify-center gap-2 rounded-full bg-saku-accent px-5 font-saku-head text-lg font-semibold text-white shadow-saku ${
        isDownloading ? "pointer-events-none cursor-wait opacity-70" : ""
      }`}
      href={updateInfo.apkDownloadUrl}
      onClick={handleUpdate}
      target="_system"
    >
      {isDownloading ? <Loader2 aria-hidden="true" className="size-5 animate-spin" /> : <Download aria-hidden="true" className="size-5" strokeWidth={2.6} />}
      {isDownloading ? "Mengunduh..." : "Perbarui sekarang"}
    </a>
  ) : (
    <p className="flex-1 rounded-2xl bg-saku-bg px-3 py-2.5 text-center text-sm font-bold text-saku-muted">
      Unduhan belum tersedia untuk versi ini.
    </p>
  );

  // A required update blocks the app until it is installed.
  if (updateInfo.forceUpdate) {
    return (
      <div className="fixed inset-0 z-[300] flex items-center justify-center bg-saku-scrim p-4">
        <section className="saku-line w-full max-w-sm rounded-saku-sheet bg-saku-paper p-5 font-saku-body text-saku-ink shadow-saku" role="alertdialog" aria-labelledby="apk-force-update-title">
          <div className="flex flex-col items-center text-center">
            <SakuMascot animated mood="wow" size={72} />
            <h2 className="mt-2 font-saku-head text-2xl font-semibold" id="apk-force-update-title">
              Perlu update dulu
            </h2>
            <p className="saku-line-hair mt-1.5 rounded-full bg-saku-coin-soft px-2.5 text-xs font-black">
              v{currentVersion.name} → v{updateInfo.latestVersionName}
            </p>
            <p className="mt-2 text-sm font-bold text-saku-muted">
              Versi ini sudah tidak didukung. Pasang versi terbaru supaya Sakuin tetap aman dan lancar.
            </p>
          </div>
          {notes}
          <div className="mt-5 flex">{downloadLink}</div>
        </section>
      </div>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--sakuin-mobile-nav-height)+0.75rem)] z-[270] px-3 lg:right-5 lg:bottom-5 lg:left-auto lg:max-w-sm lg:px-0">
      <section className="saku-line rounded-saku-card bg-saku-paper p-4 font-saku-body text-saku-ink shadow-saku motion-safe:animate-saku-rise">
        <div className="flex items-start gap-3">
          <span aria-hidden="true" className="saku-line-thin flex size-11 shrink-0 items-end justify-center overflow-hidden rounded-full bg-saku-coin-soft">
            <SakuMascot mood="wow" size={40} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-saku-head text-lg font-semibold">Ada versi baru! (v{updateInfo.latestVersionName})</h3>
            <p className="text-xs font-bold text-saku-muted">Sekarang v{currentVersion.name}</p>
          </div>
          <button
            aria-label="Tutup info update"
            className="saku-line-thin flex size-9 shrink-0 items-center justify-center rounded-full bg-saku-paper focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-saku-accent/30"
            onClick={handleDismiss}
            type="button"
          >
            <X aria-hidden="true" className="size-4" strokeWidth={2.6} />
          </button>
        </div>
        {notes}
        <div className="mt-4 flex gap-2.5">
          {updateInfo.apkDownloadUrl ? (
            <button
              className="saku-line-thin min-h-13 rounded-full bg-saku-paper px-4 text-[15px] font-black"
              onClick={handleDismiss}
              type="button"
            >
              Nanti
            </button>
          ) : null}
          {downloadLink}
        </div>
      </section>
    </div>
  );
}
