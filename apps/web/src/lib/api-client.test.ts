import { describe, expect, it } from "vitest";
import { buildUrl } from "./api-client";

const apiBaseUrl =
  import.meta.env.VITE_API_BASE_URL || "https://sakuin-api.vercel.app";

describe("api-client URL builder", () => {
  it("mempertahankan kontrak route /api tanpa menambahkan versi secara implisit", () => {
    expect(buildUrl("/api/auth/login")).toBe(`${apiBaseUrl}/api/auth/login`);
    expect(buildUrl("api/summary")).toBe(`${apiBaseUrl}/api/summary`);
  });
});
