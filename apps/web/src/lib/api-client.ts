import type { ApiRequestOptions, ApiResponse } from "../types/api";
import { getStoredToken } from "./auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export class ApiClientError extends Error {
  status: number;
  errors: unknown;

  constructor(message: string, status: number, errors: unknown = null) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.errors = errors;
  }
}

function buildUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    throw new ApiClientError(
      "VITE_API_BASE_URL belum dikonfigurasi",
      500
    );
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {}
): Promise<T> {
  const token = options.token === undefined ? getStoredToken() : options.token;

  const headers = new Headers(options.headers);

  headers.set("Accept", "application/json");

  if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
  }

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!isJson) {
    if (!response.ok) {
      throw new ApiClientError(
        `Request gagal dengan status ${response.status}`,
        response.status
      );
    }

    return response as unknown as T;
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (result.success === false) {
    throw new ApiClientError(result.message, response.status, result.errors);
  }

  if (!response.ok) {
    throw new ApiClientError(result.message, response.status);
  }

  return result.data;
}

export async function apiDownload(
  path: string,
  options: Omit<ApiRequestOptions, "body"> = {}
) {
  const token = options.token === undefined ? getStoredToken() : options.token;

  const headers = new Headers(options.headers);

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(buildUrl(path), {
    method: options.method ?? "GET",
    headers
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type");

    if (contentType?.includes("application/json")) {
      const error = (await response.json()) as ApiResponse<unknown>;

      if (error.success === false) {
        throw new ApiClientError(error.message, response.status, error.errors);
      }

      throw new ApiClientError("Download gagal", response.status);
    }

    throw new ApiClientError("Download gagal", response.status);
  }

  return response;
}