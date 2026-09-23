import { useCallback, useEffect, useState } from "react";
import { Browser } from "@capacitor/browser";
import { Capacitor } from "@capacitor/core";
import { getInstalledAndroidVersion, isAndroidApp, readAndroidBridgeVersion } from "../../lib/android-version";
import { fetchLatestApkVersion, type ApkVersionInfo } from "../../lib/latest-apk-version";

/** Installed APK version (null in a browser), the latest release, and a way to open its download. */
export function useAppVersion() {
  const [isApk] = useState(isAndroidApp);
  const [installed, setInstalled] = useState(readAndroidBridgeVersion);
  const [latest, setLatest] = useState<ApkVersionInfo | null>(null);
  const [checking, setChecking] = useState(false);

  const check = useCallback(async () => {
    setChecking(true);

    try {
      const info = await fetchLatestApkVersion();
      setLatest(info);
      return info;
    } catch {
      return null;
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    if (!isApk) {
      return;
    }

    let active = true;
    void getInstalledAndroidVersion().then((version) => {
      if (active) {
        setInstalled(version);
      }
    });

    return () => {
      active = false;
    };
  }, [isApk]);

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

  return { isApk, installed, latest, checking, check, openDownload, updateAvailable };
}
