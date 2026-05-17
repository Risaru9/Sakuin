import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { TransactionType } from "@prisma/client";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import {
  AUTH_LOGIN_RATE_LIMIT_MAX,
  resetRateLimitStore
} from "../src/middlewares/rate-limit.middleware.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
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

type CategoryData = {
  id: string;
  name: string;
  type: "INCOME" | "EXPENSE";
  icon: string | null;
  color: string | null;
  isDefault: boolean;
};

type TransactionData = {
  id: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note: string | null;
  date: string;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
    isDefault: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

const testRunId = Date.now();

const userA = {
  name: "Security Test User A",
  email: `security-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Security Test User B",
  email: `security-user-b-${testRunId}@example.com`,
  password: "Password123"
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";
let userBCategoryId = "";
let userBTransactionId = "";

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerUser(user: typeof userA) {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `10.24.0.${Math.floor(Math.random() * 200) + 1}`
    },
    body: JSON.stringify(user)
  });

  const body = await parseJson<AuthData>(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);
  expect(body.data.token).toBeTruthy();
  expect(body.data.user.email).toBe(user.email);

  return body.data;
}

async function createCategory(
  token: string,
  payload: {
    name: string;
    type: "INCOME" | "EXPENSE";
  }
) {
  const response = await app.request("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Forwarded-For": `10.24.1.${Math.floor(Math.random() * 200) + 1}`
    },
    body: JSON.stringify({
      name: payload.name,
      type: payload.type,
      icon: "tag",
      color: "#6366f1"
    })
  });

  return {
    response,
    body: await parseJson<CategoryData>(response)
  };
}

async function createTransaction(
  token: string,
  payload: {
    type: "INCOME" | "EXPENSE";
    amount: string;
    categoryId: string;
    note: string;
  }
) {
  const response = await app.request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "X-Forwarded-For": `10.24.2.${Math.floor(Math.random() * 200) + 1}`
    },
    body: JSON.stringify({
      type: payload.type,
      amount: payload.amount,
      categoryId: payload.categoryId,
      date: new Date().toISOString(),
      note: payload.note
    })
  });

  return {
    response,
    body: await parseJson<TransactionData>(response)
  };
}

beforeEach(() => {
  resetRateLimitStore();
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userAId, userBId].filter(Boolean)
      }
    }
  });

  await prisma.$disconnect();
});

describe("Security baseline", () => {
  it("Rate limit membatasi percobaan login berulang untuk IP dan email yang sama", async () => {
    const targetEmail = `rate-limit-${testRunId}@example.com`;
    const clientIp = "203.0.113.24";

    let latestResponse: Response | null = null;

    for (let attempt = 1; attempt <= AUTH_LOGIN_RATE_LIMIT_MAX; attempt += 1) {
      latestResponse = await app.request("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": clientIp
        },
        body: JSON.stringify({
          email: targetEmail,
          password: "WrongPassword123"
        })
      });

      expect(latestResponse.status).toBe(401);
    }

    const blockedResponse = await app.request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Forwarded-For": clientIp
      },
      body: JSON.stringify({
        email: targetEmail,
        password: "WrongPassword123"
      })
    });

    const blockedBody = await parseJson(blockedResponse);

    expect(latestResponse?.status).toBe(401);
    expect(blockedResponse.status).toBe(429);
    expect(blockedBody.success).toBe(false);
    expect(blockedBody.message).toBe(
      "Terlalu banyak percobaan login. Silakan tunggu beberapa saat lalu coba lagi."
    );
    expect(blockedResponse.headers.get("Retry-After")).toBeTruthy();
    expect(blockedResponse.headers.get("RateLimit-Limit")).toBe(
      String(AUTH_LOGIN_RATE_LIMIT_MAX)
    );
  });

  it("User tidak bisa membaca detail transaksi milik user lain", async () => {
    const authA = await registerUser(userA);
    const authB = await registerUser(userB);

    tokenA = authA.token;
    tokenB = authB.token;
    userAId = authA.user.id;
    userBId = authB.user.id;

    const userBTransaction = await createTransaction(tokenB, {
      type: "EXPENSE",
      amount: "55000",
      categoryId: "cat_expense_food",
      note: "Transaksi private user B"
    });

    expect(userBTransaction.response.status).toBe(201);
    userBTransactionId = userBTransaction.body.data.id;

    const response = await app.request(
      `/api/transactions/${userBTransactionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "X-Forwarded-For": "203.0.113.101"
        }
      }
    );

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Transaksi tidak ditemukan");
  }, 30000);

  it("User tidak bisa membuat transaksi memakai custom category milik user lain", async () => {
    if (!tokenA || !tokenB) {
      const authA = await registerUser({
        ...userA,
        email: `security-user-a-extra-${testRunId}@example.com`
      });
      const authB = await registerUser({
        ...userB,
        email: `security-user-b-extra-${testRunId}@example.com`
      });

      tokenA = authA.token;
      tokenB = authB.token;
      userAId = authA.user.id;
      userBId = authB.user.id;
    }

    const userBCategory = await createCategory(tokenB, {
      name: `Private Category User B ${testRunId}`,
      type: "EXPENSE"
    });

    expect(userBCategory.response.status).toBe(201);
    userBCategoryId = userBCategory.body.data.id;

    const response = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "203.0.113.102"
      },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: "25000",
        categoryId: userBCategoryId,
        date: new Date().toISOString(),
        note: "Mencoba memakai kategori user lain"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi"
    );
  }, 30000);
});