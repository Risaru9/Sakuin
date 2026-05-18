import { describe, expect, it } from "vitest";
import app from "../src/app.js";

describe("Request ID security middleware", () => {
  it("menambahkan X-Request-Id pada response sukses", async () => {
    const response = await app.request("/health");

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("mempertahankan X-Request-Id valid dari client", async () => {
    const requestId = "test-request-123";

    const response = await app.request("/health", {
      headers: {
        "X-Request-Id": requestId
      }
    });

    expect(response.status).toBe(200);
    expect(response.headers.get("X-Request-Id")).toBe(requestId);
  });

  it("mengganti X-Request-Id client yang tidak sesuai pola aman", async () => {
    const unsafeRequestId = "bad request id with spaces";

    const response = await app.request("/health", {
      headers: {
        "X-Request-Id": unsafeRequestId
      }
    });

    const responseRequestId = response.headers.get("X-Request-Id");

    expect(response.status).toBe(200);
    expect(responseRequestId).toBeTruthy();
    expect(responseRequestId).not.toBe(unsafeRequestId);
  });

  it("menambahkan X-Request-Id pada response 404", async () => {
    const response = await app.request("/route-yang-tidak-ada");

    expect(response.status).toBe(404);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });

  it("mengizinkan X-Request-Id pada CORS preflight", async () => {
    const response = await app.request("/api/health", {
      method: "OPTIONS",
      headers: {
        Origin: "http://localhost:3000",
        "Access-Control-Request-Method": "GET",
        "Access-Control-Request-Headers": "X-Request-Id, Authorization"
      }
    });

    expect(response.headers.get("Access-Control-Allow-Headers")).toContain(
      "X-Request-Id"
    );
  });
});