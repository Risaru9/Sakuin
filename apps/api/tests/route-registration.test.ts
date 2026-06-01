import { describe, expect, it } from "vitest";
import { app } from "../src/app.js";

async function readJson(response: Response) {
  return (await response.json()) as {
    success: boolean;
    message: string;
    errors: unknown;
  };
}

describe("API route registration", () => {
  it("mendaftarkan route recurring sehingga tidak jatuh ke 404", async () => {
    const response = await app.request("/api/recurring", {
      method: "GET"
    });
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("mendaftarkan route reminder settings sehingga tidak jatuh ke 404", async () => {
    const response = await app.request("/api/reminders/settings", {
      method: "GET"
    });
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("mendaftarkan route reminder cron sehingga tidak jatuh ke 404", async () => {
    const response = await app.request("/api/reminders/run", {
      method: "GET"
    });
    const body = await readJson(response);

    expect(response.status).not.toBe(404);
    expect(body.message).not.toBe("Route tidak ditemukan");
  });

  it("mempertahankan alias /api/v1 untuk rollout frontend bertahap", async () => {
    const response = await app.request("/api/v1/summary", {
      method: "GET"
    });
    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.message).toBe("Authorization header wajib diisi");
  });
});
