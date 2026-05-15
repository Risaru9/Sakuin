import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

const testEmail = `auth-test-${Date.now()}@example.com`;
const testPassword = "Password123";
let token = "";

async function readJson(response: Response) {
  return response.json() as Promise<{
    success: boolean;
    message: string;
    data?: any;
    errors?: any;
  }>;
}

describe("Auth API", () => {
  afterAll(async () => {
    await prisma.user.deleteMany({
      where: {
        email: {
          startsWith: "auth-test-"
        }
      }
    });

    await prisma.$disconnect();
  });

  it("Register berhasil", async () => {
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Auth Test User",
        email: testEmail,
        password: testPassword
      })
    });

    const body = await readJson(response);

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTypeOf("string");
    expect(body.data.user.email).toBe(testEmail);
    expect(body.data.user.passwordHash).toBeUndefined();

    token = body.data.token;
  });

  it("Register gagal jika email sudah dipakai", async () => {
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Duplicate User",
        email: testEmail,
        password: testPassword
      })
    });

    const body = await readJson(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Email sudah digunakan");
  });

  it("Login berhasil", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword
      })
    });

    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.token).toBeTypeOf("string");
    expect(body.data.user.email).toBe(testEmail);

    token = body.data.token;
  });

  it("Login gagal jika password salah", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: testEmail,
        password: "PasswordSalah123"
      })
    });

    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Email atau password salah");
  });

  it("GET /api/auth/me gagal tanpa token", async () => {
    const response = await app.request("/api/auth/me", {
      method: "GET"
    });

    const body = await readJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("GET /api/auth/me berhasil dengan token valid", async () => {
    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await readJson(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.email).toBe(testEmail);
    expect(body.data.passwordHash).toBeUndefined();
  });
});