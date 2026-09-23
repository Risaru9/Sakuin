import { buildUrl } from "./api-client";

export type ApkVersionInfo = {
  latestVersionName: string;
  latestVersionCode: number;
  apkDownloadUrl: string;
  releaseNotes: string[];
  forceUpdate: boolean;
  publishedAt: string;
};

function parseVersionInfo(value: unknown): ApkVersionInfo {
  if (!value || typeof value !== "object") {
    throw new Error("Data versi APK tidak valid.");
  }

  const info = value as Partial<ApkVersionInfo>;
  if (
    !Number.isInteger(info.latestVersionCode) ||
    typeof info.latestVersionName !== "string" || !info.latestVersionName.trim() ||
    typeof info.apkDownloadUrl !== "string" || !info.apkDownloadUrl.trim()
  ) {
    throw new Error("Data versi APK tidak lengkap.");
  }

  return {
    latestVersionCode: info.latestVersionCode!,
    latestVersionName: info.latestVersionName,
    apkDownloadUrl: info.apkDownloadUrl,
    releaseNotes: Array.isArray(info.releaseNotes)
      ? info.releaseNotes.filter((note): note is string => typeof note === "string")
      : [],
    forceUpdate: info.forceUpdate === true,
    publishedAt: typeof info.publishedAt === "string" ? info.publishedAt : ""
  };
}

async function readVersion(url: string, wrapped: boolean) {
  const response = await fetch(url, { cache: "no-store", headers: { Accept: "application/json" } });
  if (!response.ok) {
    throw new Error(`Cek versi gagal: ${response.status}`);
  }

  const payload = await response.json();
  return parseVersionInfo(wrapped ? payload?.data : payload);
}

/** Version metadata must come from a live response, never an old private API cache. */
export async function fetchLatestApkVersion(): Promise<ApkVersionInfo> {
  try {
    return await readVersion(buildUrl("/api/app-version"), true);
  } catch {
    return readVersion("/latest-version.json", false);
  }
}
