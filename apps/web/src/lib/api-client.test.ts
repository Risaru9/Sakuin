import { afterEach, describe, expect, it, vi } from "vitest";
import { apiRequest, buildUrl } from "./api-client";
import { setCachedUser } from "./auth-storage";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

describe("api-client URL builder", () => {
  it("mempertahankan kontrak route /api tanpa menambahkan versi secara implisit", () => {
    expect(buildUrl("/api/auth/login")).toBe(`${apiBaseUrl}/api/auth/login`);
    expect(buildUrl("api/summary")).toBe(`${apiBaseUrl}/api/summary`);
  });

  it("tidak memakai cache GET milik akun lain saat koneksi gagal", async () => {
    setCachedUser({
      id: "user-a",
      name: "User A",
      email: "user-a@example.com",
      safeBalanceLimit: "0"
    });
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            success: true,
            message: "ok",
            data: { balance: "10000" }
          }),
          { headers: { "Content-Type": "application/json" } }
        )
      )
    );

    await apiRequest("/api/summary");

    setCachedUser({
      id: "user-b",
      name: "User B",
      email: "user-b@example.com",
      safeBalanceLimit: "0"
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")));

    await expect(apiRequest("/api/summary")).rejects.toThrow("offline");

    setCachedUser({
      id: "user-a",
      name: "User A",
      email: "user-a@example.com",
      safeBalanceLimit: "0"
    });
    vi.stubGlobal("fetch", vi.fn().mockRejectedValueOnce(new Error("offline")));

    await expect(apiRequest("/api/summary")).resolves.toEqual({
      balance: "10000"
    });
  });
});

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
});
