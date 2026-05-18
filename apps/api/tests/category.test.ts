import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import { TransactionType } from "@prisma/client";
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
  name: "Category Test User A",
  email: `category-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Category Test User B",
  email: `category-user-b-${testRunId}@example.com`,
  password: "Password123"
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";
let userACategoryId = "";
let userBCategoryId = "";
let categoryForDeleteId = "";
let usedCategoryId = "";
let usedTransactionId = "";

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerUser(user: typeof userA) {
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

async function createCategory(
  token: string,
  payload?: Partial<{
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
  }>
) {
  const response = await app.request("/api/categories", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: payload?.name ?? `Kategori Test ${Date.now()}`,
      type: payload?.type ?? "EXPENSE",
      icon: payload?.icon ?? "tag",
      color: payload?.color ?? "#0ea5e9"
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
    date?: string;
    note: string;
  }
) {
  const response = await app.request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      type: payload.type,
      amount: payload.amount,
      categoryId: payload.categoryId,
      date: payload.date ?? new Date().toISOString(),
      note: payload.note
    })
  });

  return {
    response,
    body: await parseJson<TransactionData>(response)
  };
}

beforeAll(async () => {
  await prisma.category.upsert({
    where: {
      id: "cat_expense_food"
    },
    update: {
      name: "Makanan",
      type: TransactionType.EXPENSE,
      icon: "utensils",
      color: "#f97316",
      isDefault: true,
      userId: null
    },
    create: {
      id: "cat_expense_food",
      name: "Makanan",
      type: TransactionType.EXPENSE,
      icon: "utensils",
      color: "#f97316",
      isDefault: true,
      userId: null
    }
  });

  await prisma.category.upsert({
    where: {
      id: "cat_income_salary"
    },
    update: {
      name: "Gaji",
      type: TransactionType.INCOME,
      icon: "wallet",
      color: "#22c55e",
      isDefault: true,
      userId: null
    },
    create: {
      id: "cat_income_salary",
      name: "Gaji",
      type: TransactionType.INCOME,
      icon: "wallet",
      color: "#22c55e",
      isDefault: true,
      userId: null
    }
  });

  const authA = await registerUser(userA);
  const authB = await registerUser(userB);

  tokenA = authA.token;
  tokenB = authB.token;
  userAId = authA.user.id;
  userBId = authB.user.id;

  const userACategory = await createCategory(tokenA, {
    name: `Transport User A ${testRunId}`,
    type: "EXPENSE",
    icon: "car",
    color: "#0ea5e9"
  });

  expect(userACategory.response.status).toBe(201);
  userACategoryId = userACategory.body.data.id;

  const userBCategory = await createCategory(tokenB, {
    name: `Transport User B ${testRunId}`,
    type: "EXPENSE",
    icon: "bus",
    color: "#6366f1"
  });

  expect(userBCategory.response.status).toBe(201);
  userBCategoryId = userBCategory.body.data.id;

  const deleteCategory = await createCategory(tokenA, {
    name: `Kategori Delete ${testRunId}`,
    type: "EXPENSE",
    icon: "trash",
    color: "#ef4444"
  });

  expect(deleteCategory.response.status).toBe(201);
  categoryForDeleteId = deleteCategory.body.data.id;

  const usedCategory = await createCategory(tokenA, {
    name: `Parkir Used ${testRunId}`,
    type: "EXPENSE",
    icon: "parking-circle",
    color: "#8b5cf6"
  });

  expect(usedCategory.response.status).toBe(201);
  usedCategoryId = usedCategory.body.data.id;

  const usedTransaction = await createTransaction(tokenA, {
    type: "EXPENSE",
    amount: "10000",
    categoryId: usedCategoryId,
    note: "Transaksi memakai category custom"
  });

  expect(usedTransaction.response.status).toBe(201);
  usedTransactionId = usedTransaction.body.data.id;
}, 60000);

afterEach(() => {
  resetAuditEventSink();
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
}, 30000);

describe("Category API", () => {
  it("GET /api/categories berhasil mengambil default dan custom category milik user login", async () => {
    const response = await app.request("/api/categories", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<CategoryData[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Daftar kategori berhasil diambil");
    expect(body.data.length).toBeGreaterThan(0);

    const categoryIds = body.data.map((category) => category.id);

    expect(categoryIds).toContain("cat_expense_food");
    expect(categoryIds).toContain("cat_income_salary");
    expect(categoryIds).toContain(userACategoryId);
    expect(categoryIds).not.toContain(userBCategoryId);
  });

  it("GET /api/categories?type=EXPENSE berhasil filter kategori expense", async () => {
    const response = await app.request("/api/categories?type=EXPENSE", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<CategoryData[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    for (const category of body.data) {
      expect(category.type).toBe("EXPENSE");
    }
  });

  it("GET /api/categories gagal tanpa token", async () => {
    const response = await app.request("/api/categories", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("POST /api/categories berhasil membuat custom category", async () => {
    const capturedAuditEvents: AuditEvent[] = [];

    setAuditEventSink((event) => {
      capturedAuditEvents.push(event);
    });

    const { response, body } = await createCategory(tokenA, {
      name: `Hiburan ${testRunId}`,
      type: "EXPENSE",
      icon: "gamepad-2",
      color: "#ec4899"
    });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Kategori berhasil dibuat");
    expect(body.data.name).toBe(`Hiburan ${testRunId}`);
    expect(body.data.type).toBe("EXPENSE");
    expect(body.data.icon).toBe("gamepad-2");
    expect(body.data.color).toBe("#ec4899");
    expect(body.data.isDefault).toBe(false);

    expect(capturedAuditEvents).toHaveLength(1);

    const [auditEvent] = capturedAuditEvents;
    const serializedAuditEvent = JSON.stringify(auditEvent);

    expect(auditEvent).toMatchObject({
      eventType: "category.created",
      status: "success",
      actorType: "user",
      actorUserId: userAId,
      targetType: "category",
      targetId: body.data.id,
      metadata: {
        type: "EXPENSE",
        hasIcon: true,
        hasColor: true
      }
    });

    expect(auditEvent.requestId).toBeTruthy();
    expect(serializedAuditEvent).not.toContain(`Hiburan ${testRunId}`);
    expect(serializedAuditEvent).not.toContain("gamepad-2");
    expect(serializedAuditEvent).not.toContain("#ec4899");
    expect(serializedAuditEvent).not.toContain(tokenA);
  });

  it("POST /api/categories gagal tanpa token", async () => {
    const response = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Tanpa Token",
        type: "EXPENSE"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("POST /api/categories gagal jika nama kategori duplikat untuk user dan type yang sama", async () => {
    const response = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: `Transport User A ${testRunId}`,
        type: "EXPENSE",
        icon: "car",
        color: "#0ea5e9"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Nama kategori sudah digunakan untuk tipe transaksi tersebut"
    );
  });

  it("POST /api/categories gagal jika nama kategori sama dengan default category visible", async () => {
    const response = await app.request("/api/categories", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Makanan",
        type: "EXPENSE",
        icon: "utensils",
        color: "#f97316"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(409);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Nama kategori sudah digunakan untuk tipe transaksi tersebut"
    );
  });

  it("PUT /api/categories/:id berhasil update custom category milik sendiri", async () => {
    const capturedAuditEvents: AuditEvent[] = [];

    setAuditEventSink((event) => {
      capturedAuditEvents.push(event);
    });

    const response = await app.request(`/api/categories/${userACategoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: `Transport Harian User A ${testRunId}`,
        icon: "bus",
        color: "#0284c7"
      })
    });

    const body = await parseJson<CategoryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Kategori berhasil diupdate");
    expect(body.data.id).toBe(userACategoryId);
    expect(body.data.name).toBe(`Transport Harian User A ${testRunId}`);
    expect(body.data.icon).toBe("bus");
    expect(body.data.color).toBe("#0284c7");
    expect(body.data.type).toBe("EXPENSE");
    expect(body.data.isDefault).toBe(false);

    expect(capturedAuditEvents).toHaveLength(1);

    const [auditEvent] = capturedAuditEvents;
    const serializedAuditEvent = JSON.stringify(auditEvent);

    expect(auditEvent).toMatchObject({
      eventType: "category.updated",
      status: "success",
      actorType: "user",
      actorUserId: userAId,
      targetType: "category",
      targetId: userACategoryId,
      metadata: {
        changedFields: "name,icon,color",
        typeProvided: false,
        iconProvided: true,
        hasIcon: true,
        colorProvided: true,
        hasColor: true
      }
    });

    expect(auditEvent.requestId).toBeTruthy();
    expect(serializedAuditEvent).not.toContain(
      `Transport Harian User A ${testRunId}`
    );
    expect(serializedAuditEvent).not.toContain("bus");
    expect(serializedAuditEvent).not.toContain("#0284c7");
    expect(serializedAuditEvent).not.toContain(tokenA);
  });

  it("PUT /api/categories/:id gagal untuk default category", async () => {
    const response = await app.request("/api/categories/cat_expense_food", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Default Edited"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak bisa diubah");
  });

  it("PUT /api/categories/:id gagal untuk category user lain", async () => {
    const response = await app.request(`/api/categories/${userBCategoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Mencoba Update Category User Lain"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak bisa diubah");
  });

  it("PUT /api/categories/:id gagal mengubah type jika category sudah dipakai transaksi", async () => {
    const response = await app.request(`/api/categories/${usedCategoryId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: "INCOME"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Tipe kategori tidak bisa diubah karena kategori sudah digunakan oleh transaksi"
    );
  });

  it("DELETE /api/categories/:id berhasil hapus custom category yang belum dipakai transaksi", async () => {
    const capturedAuditEvents: AuditEvent[] = [];

    setAuditEventSink((event) => {
      capturedAuditEvents.push(event);
    });

    const response = await app.request(`/api/categories/${categoryForDeleteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<CategoryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Kategori berhasil dihapus");
    expect(body.data.id).toBe(categoryForDeleteId);

    expect(capturedAuditEvents).toHaveLength(1);

    const [auditEvent] = capturedAuditEvents;
    const serializedAuditEvent = JSON.stringify(auditEvent);

    expect(auditEvent).toMatchObject({
      eventType: "category.deleted",
      status: "success",
      actorType: "user",
      actorUserId: userAId,
      targetType: "category",
      targetId: categoryForDeleteId,
      metadata: {
        reason: "user_requested"
      }
    });

    expect(auditEvent.requestId).toBeTruthy();
    expect(serializedAuditEvent).not.toContain(`Kategori Delete ${testRunId}`);
    expect(serializedAuditEvent).not.toContain("trash");
    expect(serializedAuditEvent).not.toContain("#ef4444");
    expect(serializedAuditEvent).not.toContain(tokenA);
  });

  it("DELETE /api/categories/:id gagal untuk default category", async () => {
    const response = await app.request("/api/categories/cat_expense_food", {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak bisa diubah");
  });

  it("DELETE /api/categories/:id gagal untuk category user lain", async () => {
    const response = await app.request(`/api/categories/${userBCategoryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak bisa diubah");
  });

  it("DELETE /api/categories/:id gagal jika category sudah digunakan transaksi", async () => {
    const response = await app.request(`/api/categories/${usedCategoryId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Kategori tidak bisa dihapus karena sudah digunakan oleh transaksi"
    );
  });

  it("DELETE /api/categories/:id berhasil setelah transaksi pengguna category dihapus", async () => {
    const deleteTransactionResponse = await app.request(
      `/api/transactions/${usedTransactionId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      }
    );

    const deleteTransactionBody = await parseJson<TransactionData>(
      deleteTransactionResponse
    );

    expect(deleteTransactionResponse.status).toBe(200);
    expect(deleteTransactionBody.success).toBe(true);
    expect(deleteTransactionBody.message).toBe("Transaksi berhasil dihapus");

    const deleteCategoryResponse = await app.request(
      `/api/categories/${usedCategoryId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      }
    );

    const deleteCategoryBody = await parseJson<CategoryData>(
      deleteCategoryResponse
    );

    expect(deleteCategoryResponse.status).toBe(200);
    expect(deleteCategoryBody.success).toBe(true);
    expect(deleteCategoryBody.message).toBe("Kategori berhasil dihapus");
    expect(deleteCategoryBody.data.id).toBe(usedCategoryId);
  }, 20000);
});