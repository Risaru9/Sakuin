import type { ApiRequestOptions, ApiResponse } from "../types/api";
import { getStoredToken, removeStoredToken } from "./auth-storage";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

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

  // Arahkan ke /api/v1/... jika path diawali /api/
  let finalPath = normalizedPath;
  if (normalizedPath.startsWith("/api/")) {
    finalPath = "/api/v1/" + normalizedPath.slice(5);
  }

  return `${API_BASE_URL}${finalPath}`;
}

function handleUnauthorized() {
  removeStoredToken();
  const currentPath = window.location.pathname;
  if (currentPath !== "/login") {
    window.location.replace("/login?expired=true");
  }
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

  const method = options.method ?? "GET";
  const cacheKey = `api_cache:${path}`;

  let response: Response;
  try {
    response = await fetch(buildUrl(path), {
      method,
      headers,
      body: options.body === undefined ? undefined : JSON.stringify(options.body)
    });
  } catch (error) {
    // Jika fetch gagal (koneksi terputus/server mati) dan metode GET, gunakan cache jika tersedia
    if (method === "GET") {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn(`[ApiClient] Koneksi gagal. Menggunakan data cache untuk path: ${path}`);
        try {
          // Trigger custom event untuk memberi tahu UI bahwa kita menyajikan data offline
          window.dispatchEvent(new CustomEvent("sakuin-offline-cache-hit", { detail: { path } }));
          return JSON.parse(cached) as T;
        } catch (e) {
          console.error("[ApiClient] Gagal mem-parse cache localStorage:", e);
        }
      }
    }
    throw error;
  }

  const contentType = response.headers.get("content-type");
  const isJson = contentType?.includes("application/json");

  if (!isJson) {
    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiClientError("Sesi telah berakhir, silakan login kembali", 401);
    }

    if (!response.ok) {
      // Jika server error (>= 500) dan metode GET, coba ambil dari cache
      if (method === "GET" && response.status >= 500) {
        const cached = localStorage.getItem(cacheKey);
        if (cached) {
          console.warn(`[ApiClient] Server error (${response.status}). Menggunakan data cache untuk path: ${path}`);
          try {
            window.dispatchEvent(new CustomEvent("sakuin-offline-cache-hit", { detail: { path } }));
            return JSON.parse(cached) as T;
          } catch (e) {}
        }
      }
      throw new ApiClientError(
        `Request gagal dengan status ${response.status}`,
        response.status
      );
    }

    return response as unknown as T;
  }

  const result = (await response.json()) as ApiResponse<T>;

  if (response.status === 401) {
    handleUnauthorized();
    const errMessage = result.success === false ? result.message : undefined;
    const errErrors = result.success === false ? result.errors : undefined;
    throw new ApiClientError(errMessage || "Sesi telah berakhir, silakan login kembali", 401, errErrors);
  }

  if (result.success === false) {
    // Jika server error (>= 500) dan metode GET, coba ambil dari cache
    if (method === "GET" && response.status >= 500) {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        console.warn(`[ApiClient] Server error (${response.status}). Menggunakan data cache untuk path: ${path}`);
        try {
          window.dispatchEvent(new CustomEvent("sakuin-offline-cache-hit", { detail: { path } }));
          return JSON.parse(cached) as T;
        } catch (e) {}
      }
    }
    throw new ApiClientError(result.message, response.status, result.errors);
  }

  if (!response.ok) {
    throw new ApiClientError(result.message, response.status);
  }

  // Simpan data sukses ke cache jika metode GET
  if (method === "GET") {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(result.data));
    } catch (e) {
      console.error("[ApiClient] Gagal menyimpan ke cache localStorage:", e);
    }
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
    if (response.status === 401) {
      handleUnauthorized();
      throw new ApiClientError("Sesi telah berakhir, silakan login kembali", 401);
    }

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