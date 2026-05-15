import { ApiClientError } from "../../lib/api-client";
import type { TransactionType } from "../transactions/transaction.types";

export type ExportFormat = "json" | "csv" | "xlsx";

export type ExportTypeFilter = "ALL" | TransactionType;

type DownloadTransactionsExportInput = {
  format: ExportFormat;
  type: ExportTypeFilter;
  startDate?: string;
  endDate?: string;
  fileName?: string;
};

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:5000";

function isJwtLike(value: string) {
  return /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+$/.test(value);
}

function extractTokenFromValue(value: unknown): string | null {
  if (!value) {
    return null;
  }

  if (typeof value === "string") {
    if (isJwtLike(value)) {
      return value;
    }

    try {
      const parsed = JSON.parse(value);
      return extractTokenFromValue(parsed);
    } catch {
      return null;
    }
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>;

    const directToken =
      record.token ??
      record.accessToken ??
      record.authToken ??
      record.jwt ??
      record.access_token;

    if (typeof directToken === "string" && directToken.length > 0) {
      return directToken;
    }

    for (const nestedValue of Object.values(record)) {
      const nestedToken = extractTokenFromValue(nestedValue);

      if (nestedToken) {
        return nestedToken;
      }
    }
  }

  return null;
}

function getAuthTokenFromLocalStorage() {
  const preferredKeys = [
    "sakuin_token",
    "sakuin_access_token",
    "sakuin_auth",
    "sakuin_user",
    "auth",
    "token",
    "accessToken",
    "authToken"
  ];

  for (const key of preferredKeys) {
    const value = localStorage.getItem(key);
    const token = extractTokenFromValue(value);

    if (token) {
      return token;
    }
  }

  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index);

    if (!key) {
      continue;
    }

    const value = localStorage.getItem(key);
    const token = extractTokenFromValue(value);

    if (token) {
      return token;
    }
  }

  return null;
}

function buildExportUrl(input: DownloadTransactionsExportInput) {
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

  return `${API_BASE_URL}/api/export/transactions?${searchParams.toString()}`;
}

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/\.[^/.]+$/, "")
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, "-")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDownloadFileName(input: DownloadTransactionsExportInput) {
  const date = new Date().toISOString().slice(0, 10);
  const typePart = input.type === "ALL" ? "semua" : input.type.toLowerCase();

  const defaultFileName = `sakuin-transactions-${typePart}-${date}`;
  const baseFileName = input.fileName
    ? sanitizeFileName(input.fileName)
    : defaultFileName;

  return `${baseFileName || defaultFileName}.${input.format}`;
}

async function getErrorMessageFromResponse(response: Response) {
  try {
    const result = (await response.json()) as {
      message?: string;
      errors?: unknown;
    };

    return result.message ?? "Export gagal.";
  } catch {
    return "Export gagal.";
  }
}

export async function downloadTransactionsExport(
  input: DownloadTransactionsExportInput
) {
  const token = getAuthTokenFromLocalStorage();

  if (!token) {
    throw new ApiClientError(
      "Token login tidak ditemukan. Silakan login ulang.",
      401
    );
  }

  const response = await fetch(buildExportUrl(input), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    const message = await getErrorMessageFromResponse(response);
    throw new ApiClientError(message, response.status);
  }

  const blob = await response.blob();
  const objectUrl = URL.createObjectURL(blob);

  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = getDownloadFileName(input);
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  URL.revokeObjectURL(objectUrl);
}