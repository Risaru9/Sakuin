import { afterAll, describe, expect, it } from "vitest";
import jwt from "jsonwebtoken";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prisma.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
};

type AuthData = {
  token: string;
  user: {
    id: string;
    name: string;
    email: string;
    safeBalanceLimit: number | string;
  };
};

const testRunId = Date.now();
const createdUserIds: string[] = [];

async function parseJson<T = unknown>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

function getUniqueIp(lastOctet: number) {
  return `203.0.113.${lastOctet}`;
}

function expectDefined<T>(value: T | undefined, message: string): T {
  if (value === undefined) {
    throw new Error(message);
  }

  return value;
}

async function registerAuthSecurityUser(emailSuffix: string): Promise<AuthData> {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": getUniqueIp(30)
    },
    body: JSON.stringify({
      name: "Auth Token Security User",
      email: `auth-security-${emailSuffix}-${testRunId}@example.com`,
      password: "Password123"
    })
  });

  const body = await parseJson<AuthData>(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  const authData = expectDefined(
    body.data,
    "Register response tidak memiliki data auth."
  );

  expect(authData.token).toBeTypeOf("string");
  expect(authData.user.id).toBeTypeOf("string");

  createdUserIds.push(authData.user.id);

  return authData;
}

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      id: {
        in: createdUserIds
      }
    }
  });

  await prisma.$disconnect();
});

describe("Auth token security", () => {
  it("Authorization Bearer tanpa token valid ditolak", async () => {
    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: "Bearer"
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Format token harus Bearer token");
  });

  it("Token dengan signature salah ditolak", async () => {
    const token = jwt.sign(
      {
        userId: "fake-user-id"
      },
      "wrong-secret-for-auth-security-test",
      {
        expiresIn: "1h"
      }
    );

    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Token tidak valid atau sudah kedaluwarsa");
  });

  it("Token expired ditolak", async () => {
    const token = jwt.sign(
      {
        userId: "expired-user-id"
      },
      env.JWT_SECRET,
      {
        expiresIn: -1
      }
    );

    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Token tidak valid atau sudah kedaluwarsa");
  });

  it("Token tanpa userId ditolak", async () => {
    const token = jwt.sign(
      {
        purpose: "auth-security-test"
      },
      env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Payload token tidak valid");
  });

  it("Token dengan userId bukan string ditolak", async () => {
    const token = jwt.sign(
      {
        userId: 123456
      },
      env.JWT_SECRET,
      {
        expiresIn: "1h"
      }
    );

    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Payload token tidak valid");
  });

  it("Token valid milik user yang sudah dihapus tidak bisa mengambil profile", async () => {
    const authData = await registerAuthSecurityUser("deleted-user");
    const deletedUserId = authData.user.id;

    await prisma.user.delete({
      where: {
        id: deletedUserId
      }
    });

    const response = await app.request("/api/auth/me", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${authData.token}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("User tidak ditemukan");
  });

  it("Register dengan password lemah ditolak", async () => {
    const response = await app.request("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": getUniqueIp(31)
      },
      body: JSON.stringify({
        name: "Weak Password User",
        email: `auth-security-weak-password-${testRunId}@example.com`,
        password: "password"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validasi request gagal");
  });

  it("Login dengan email tidak valid ditolak sebelum proses auth service", async () => {
    const response = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": getUniqueIp(32)
      },
      body: JSON.stringify({
        email: "email-tidak-valid",
        password: "Password123"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validasi request gagal");
  });
});