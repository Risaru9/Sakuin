import {
  ApiClientError,
  apiDownload,
  buildUrl
} from "../../lib/api-client";
import { getStoredToken } from "../../lib/auth-storage";
import type { TransactionType } from "../transactions/transaction.types";

export type ExportFormat = "json" | "csv" | "xlsx";

export type ExportTypeFilter = "ALL" | TransactionType;

export type DownloadTransactionsExportInput = {
  format: ExportFormat;
  type: ExportTypeFilter;
  startDate?: string;
  endDate?: string;
  fileName?: string;
};

type AndroidDownloadResult = {
  ok: boolean;
  downloadId?: number;
  path?: string;
  message?: string;
};

declare global {
  interface Window {
    AndroidExportBridge?: {
      enqueueDownload: (
        url: string,
        fileName: string,
        mimeType: string,
        authToken: string
      ) => string;
    };
  }
}

function buildExportPath(input: DownloadTransactionsExportInput) {
  const searchParams = new URLSearchParams();

  searchParams.set("format", input.format);

  if (input.type !== "ALL") {
    searchParams.set("type", input.type);
  }

  if (input.startDate) {
    searchParams.set("startDate", input.startDate);
  }

  if (input.endDate) {
    searchParams.set("endDate", input.endDate);
  }

  return `/api/export/transactions?${searchParams.toString()}`;
}

function getExportMimeType(format: ExportFormat) {
  if (format === "csv") {
    return "text/csv";
  }

  if (format === "xlsx") {
    return "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  }

  return "application/json";
}

function isNativeAppRuntime() {
  const capacitor = (window as unknown as {
    Capacitor?: {
      isNativePlatform?: () => boolean;
    };
  }).Capacitor;

  return Boolean(capacitor?.isNativePlatform?.());
}

export function sanitizeExportFileName(value: string) {
  return value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDefaultFileName(input: DownloadTransactionsExportInput) {
  const date = new Date().toISOString().slice(0, 10);
  const typePart = input.type === "ALL" ? "semua" : input.type.toLowerCase();

  return `sakuin-transactions-${typePart}-${date}`;
}

function getFileNameFromContentDisposition(value: string | null) {
  if (!value) {
    return null;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1]);
    } catch {
      return utf8Match[1];
    }
  }

  const fileNameMatch = value.match(/filename="?([^"]+)"?/i);

  return fileNameMatch?.[1] ?? null;
}

export function getDownloadFileName(input: DownloadTransactionsExportInput) {
  const defaultFileName = getDefaultFileName(input);
  const customFileName = input.fileName
    ? sanitizeExportFileName(input.fileName)
    : "";

  return `${customFileName || defaultFileName}.${input.format}`;
}

export function getDownloadFileNamePreview(
  input: DownloadTransactionsExportInput
) {
  return getDownloadFileName(input);
}

export async function downloadTransactionsExport(
  input: DownloadTransactionsExportInput
) {
  const exportPath = buildExportPath(input);
  const fallbackFileName = getDownloadFileName(input);

  if (window.AndroidExportBridge) {
    const token = getStoredToken();

    if (!token) {
      throw new ApiClientError("Sesi telah berakhir, silakan login kembali", 401);
    }

    let result: AndroidDownloadResult;
    try {
      result = JSON.parse(
        window.AndroidExportBridge.enqueueDownload(
          buildUrl(exportPath),
          fallbackFileName,
          getExportMimeType(input.format),
          token
        )
      ) as AndroidDownloadResult;
    } catch {
      throw new ApiClientError("Download native Android gagal diproses.", 500);
    }

    if (!result.ok) {
      throw new ApiClientError(
        result.message || "Download native Android gagal diproses.",
        500
      );
    }

    return {
      fileName: fallbackFileName,
      location: result.path ?? `Download/Sakuin/${fallbackFileName}`,
      nativeDownload: true
    };
  }

  if (isNativeAppRuntime()) {
    throw new ApiClientError(
      "Versi aplikasi ini belum mendukung download native. Update atau install ulang APK Sakuin terbaru dulu.",
      426
    );
  }

  const response = await apiDownload(exportPath);

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new ApiClientError("File export kosong.", 500);
  }

  const responseFileName = getFileNameFromContentDisposition(
    response.headers.get("content-disposition")
  );

  const finalFileName = responseFileName || fallbackFileName;

  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");

  anchor.href = objectUrl;
  anchor.download = finalFileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);

  return {
    fileName: finalFileName,
    location: "Folder download browser",
    nativeDownload: false
  };
}
