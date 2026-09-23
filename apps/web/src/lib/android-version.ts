import { App as CapacitorApp } from "@capacitor/app";
import { Capacitor } from "@capacitor/core";

export type InstalledAndroidVersion = { code: number; name: string };

export function isAndroidApp() {
  return typeof window !== "undefined" &&
    (Capacitor.getPlatform() === "android" || Boolean(window.AndroidWidgetBridge));
}

export function readAndroidBridgeVersion(): InstalledAndroidVersion | null {
  if (!isAndroidApp()) {
    return null;
  }

  try {
    const code = Number(window.AndroidWidgetBridge?.getAppVersionCode?.());
    if (Number.isInteger(code) && code > 0) {
      const name = window.AndroidWidgetBridge?.getAppVersionName?.();
      return { code, name: name?.trim() || String(code) };
    }
  } catch {
    // A Capacitor APK may still report its version through the App plugin.
  }

  return null;
}

export async function getInstalledAndroidVersion(): Promise<InstalledAndroidVersion | null> {
  const bridgeVersion = readAndroidBridgeVersion();
  if (bridgeVersion) {
    return bridgeVersion;
  }

  if (Capacitor.getPlatform() !== "android") {
    return null;
  }

  try {
    const info = await CapacitorApp.getInfo();
    const code = Number(info.build);
    if (Number.isInteger(code) && code > 0) {
      return { code, name: info.version?.trim() || String(code) };
    }
  } catch {
    // Unknown is safer than claiming a legacy version and showing a false update.
  }

  return null;
}
