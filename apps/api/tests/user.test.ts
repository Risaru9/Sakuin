import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import type { AuditEvent } from "../src/utils/audit-event.js";
import {
  resetAuditEventSink,
  setAuditEventSink
} from "../src/utils/audit-event-recorder.js";

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

type UserProfileData = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: string;
  createdAt: string;
  updatedAt: string;
};

type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  safeBalanceLimit: string;
  isBelowSafeLimit: boolean;
  incomeThisMonth: string;
  expenseThisMonth: string;
  balanceThisMonth: string;
  transactionCount: number;
  recentTransactions: unknown[];
  expenseByCategory: unknown[];
  incomeByCategory: unknown[];
  monthlyTrend: {
    month: string;
    income: string;
    expense: string;
    balance: string;
  }[];
};

const testRunId = Date.now();

const user = {
  name: "User Profile Test",
  email: `user-profile-${testRunId}@example.com`,
  password: "Password123"
};

let token = "";
let userId = "";

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerUser() {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
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

beforeAll(async () => {
  const auth = await registerUser();

  token = auth.token;
  userId = auth.user.id;
}, 60000);

afterEach(() => {
  resetAuditEventSink();
});

afterAll(async () => {
  if (userId) {
    await prisma.user.deleteMany({
      where: {
        id: userId
      }
    });
  }

  await prisma.$disconnect();
}, 30000);

describe("User Profile API", () => {
  it("GET /api/users/profile berhasil mengambil profile user login", async () => {
    const response = await app.request("/api/users/profile", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson<UserProfileData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Profile berhasil diambil");

    expect(body.data.id).toBe(userId);
    expect(body.data.name).toBe(user.name);
    expect(body.data.email).toBe(user.email);
    expect(body.data.safeBalanceLimit).toBe("0.00");

    expect("passwordHash" in body.data).toBe(false);
    expect("resetPasswordToken" in body.data).toBe(false);
    expect("resetPasswordExpires" in body.data).toBe(false);
  });

  it("PATCH /api/users/profile berhasil update name dan safeBalanceLimit", async () => {
    const capturedAuditEvents: AuditEvent[] = [];

    setAuditEventSink((event) => {
      capturedAuditEvents.push(event);
    });

    const response = await app.request("/api/users/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: "User Profile Updated",
        safeBalanceLimit: "500000"
      })
    });

    const body = await parseJson<UserProfileData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Profile berhasil diupdate");

    expect(body.data.id).toBe(userId);
    expect(body.data.name).toBe("User Profile Updated");
    expect(body.data.email).toBe(user.email);
    expect(body.data.safeBalanceLimit).toBe("500000.00");

    expect("passwordHash" in body.data).toBe(false);

    expect(capturedAuditEvents).toHaveLength(1);

    const [auditEvent] = capturedAuditEvents;
    const serializedAuditEvent = JSON.stringify(auditEvent);

    expect(auditEvent).toMatchObject({
      eventType: "profile.updated",
      status: "success",
      actorType: "user",
      actorUserId: userId,
      targetType: "profile",
      targetId: userId,
      metadata: {
        changedFields: "name,safeBalanceLimit"
      }
    });

    expect(auditEvent.requestId).toBeTruthy();
    expect(serializedAuditEvent).not.toContain("User Profile Updated");
    expect(serializedAuditEvent).not.toContain("500000.00");
    expect(serializedAuditEvent).not.toContain("500000");
    expect(serializedAuditEvent).not.toContain(token);
  });

  it("GET /api/summary membaca safeBalanceLimit terbaru", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Summary berhasil diambil");

    expect(body.data.totalIncome).toBe("0.00");
    expect(body.data.totalExpense).toBe("0.00");
    expect(body.data.balance).toBe("0.00");
    expect(body.data.safeBalanceLimit).toBe("500000.00");
    expect(body.data.isBelowSafeLimit).toBe(true);
    expect(body.data.transactionCount).toBe(0);
  }, 20000);

  it("PATCH /api/users/profile gagal jika safeBalanceLimit negatif", async () => {
    const response = await app.request("/api/users/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        safeBalanceLimit: "-1000"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validasi request gagal");
  });

  it("GET /api/users/profile gagal tanpa token", async () => {
    const response = await app.request("/api/users/profile", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });
});