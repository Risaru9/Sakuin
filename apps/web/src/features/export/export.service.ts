import {
  ApiClientError,
  apiDownload
} from "../../lib/api-client";
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
  const response = await apiDownload(buildExportPath(input));

  const blob = await response.blob();

  if (blob.size === 0) {
    throw new ApiClientError("File export kosong.", 500);
  }

  const responseFileName = getFileNameFromContentDisposition(
    response.headers.get("content-disposition")
  );

  const finalFileName = responseFileName || getDownloadFileName(input);

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
}