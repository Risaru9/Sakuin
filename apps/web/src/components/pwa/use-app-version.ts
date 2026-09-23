import { useCallback, useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { apiRequest } from "../../lib/api-client";

export type ApkVersionInfo = {
  latestVersionName: string;
  latestVersionCode: number;
  apkDownloadUrl: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
};

type WidgetBridgeVersion = {
  getAppVersionCode?: () => number;
  getAppVersionName?: () => string;
};

// APKs older than the version bridge report nothing; treat them as build 2 ("1.1").
const LEGACY_VERSION = { code: 2, name: "1.1" };

function readInstalledVersion() {
  const isAndroid = typeof navigator !== "undefined" && /android/i.test(navigator.userAgent);
  const bridge = (typeof window !== "undefined" ? window.AndroidWidgetBridge : undefined) as WidgetBridgeVersion | undefined;
  const isApk = isAndroid && (Capacitor.isNativePlatform() || Boolean(bridge));

  if (!isApk) {
    return null;
  }

  try {
    if (typeof bridge?.getAppVersionCode === "function") {
      return {
        code: bridge.getAppVersionCode(),
        name: typeof bridge.getAppVersionName === "function" ? bridge.getAppVersionName() : "1.2+"
      };
    }
  } catch {
    // Fall through to the legacy default.
  }

  return LEGACY_VERSION;
}

async function fetchLatestVersion() {
  try {
    return await apiRequest<ApkVersionInfo>("/api/app-version");
  } catch {
    const response = await fetch("/latest-version.json", { cache: "no-store" });
    return (await response.json()) as ApkVersionInfo;
  }
}

/** Installed APK version (null in a browser), the latest release, and a way to open its download. */
export function useAppVersion() {
  const [installed] = useState(readInstalledVersion);
  const [latest, setLatest] = useState<ApkVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);

    try {
      const info = await fetchLatestVersion();
      setLatest(info);
      return info;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    void check();
  }, [check]);

  const openDownload = useCallback(() => {
    const url = latest?.apkDownloadUrl;

    if (!url) {
      return;
    }

    if (Capacitor.isNativePlatform()) {
      void Browser.open({ url });
    } else {
      window.open(url, "_blank", "noopener");
    }
  }, [latest]);

  const updateAvailable = Boolean(installed && latest && latest.latestVersionCode > installed.code);

  return { installed, latest, checking, check, openDownload, updateAvailable };
}
