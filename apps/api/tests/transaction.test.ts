import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { TransactionType } from "@prisma/client";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

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

type TransactionListData = {
  items: TransactionData[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const testRunId = Date.now();

const userA = {
  name: "Transaction Test User A",
  email: `transaction-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Transaction Test User B",
  email: `transaction-user-b-${testRunId}@example.com`,
  password: "Password123"
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";
let userATransactionId = "";
let userBTransactionId = "";
let transactionForDeleteId = "";

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

async function createTransaction(token: string, payload?: Partial<{
  type: "INCOME" | "EXPENSE";
  amount: string;
  categoryId: string;
  date: string;
  note: string;
}>) {
  const response = await app.request("/api/transactions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      type: payload?.type ?? "EXPENSE",
      amount: payload?.amount ?? "25000",
      categoryId: payload?.categoryId ?? "cat_expense_food",
      date: payload?.date ?? new Date().toISOString(),
      note: payload?.note ?? "Test transaksi"
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
      isDefault: true
    },
    create: {
      id: "cat_expense_food",
      name: "Makanan",
      type: TransactionType.EXPENSE,
      icon: "utensils",
      color: "#f97316",
      isDefault: true
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
      isDefault: true
    },
    create: {
      id: "cat_income_salary",
      name: "Gaji",
      type: TransactionType.INCOME,
      icon: "wallet",
      color: "#22c55e",
      isDefault: true
    }
  });

  const authA = await registerUser(userA);
  const authB = await registerUser(userB);

  tokenA = authA.token;
  tokenB = authB.token;
  userAId = authA.user.id;
  userBId = authB.user.id;

  const userACreate = await createTransaction(tokenA, {
    type: "EXPENSE",
    amount: "25000",
    categoryId: "cat_expense_food",
    note: "Transaksi user A"
  });

  expect(userACreate.response.status).toBe(201);
  userATransactionId = userACreate.body.data.id;

  const userBCreate = await createTransaction(tokenB, {
    type: "EXPENSE",
    amount: "50000",
    categoryId: "cat_expense_food",
    note: "Transaksi user B"
  });

  expect(userBCreate.response.status).toBe(201);
  userBTransactionId = userBCreate.body.data.id;

  const transactionForDelete = await createTransaction(tokenA, {
    type: "EXPENSE",
    amount: "10000",
    categoryId: "cat_expense_food",
    note: "Transaksi untuk delete"
  });

  expect(transactionForDelete.response.status).toBe(201);
  transactionForDeleteId = transactionForDelete.body.data.id;
}, 60000);

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

describe("Transaction API", () => {
  it("Create transaction berhasil", async () => {
    const { response, body } = await createTransaction(tokenA, {
      type: "EXPENSE",
      amount: "30000",
      categoryId: "cat_expense_food",
      note: "Create transaction berhasil"
    });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Transaksi berhasil dibuat");
    expect(body.data.type).toBe("EXPENSE");
    expect(body.data.amount).toBe("30000");
    expect(body.data.category.id).toBe("cat_expense_food");
    expect(body.data.category.type).toBe("EXPENSE");
  });

  it("Create transaction gagal tanpa token", async () => {
    const response = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: "25000",
        categoryId: "cat_expense_food",
        date: new Date().toISOString(),
        note: "Tanpa token"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("Create transaction gagal jika categoryId tidak valid", async () => {
    const response = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: "25000",
        categoryId: "category_tidak_ada",
        date: new Date().toISOString(),
        note: "Category invalid"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi");
  });

  it("Create transaction gagal jika type EXPENSE memakai category INCOME", async () => {
    const response = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        type: "EXPENSE",
        amount: "25000",
        categoryId: "cat_income_salary",
        date: new Date().toISOString(),
        note: "Salah tipe kategori"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Kategori tidak ditemukan atau tidak sesuai dengan tipe transaksi");
  });

  it("Get transactions hanya menampilkan transaksi milik user login", async () => {
    const response = await app.request("/api/transactions?page=1&limit=50", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<TransactionListData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);

    const transactionIds = body.data.items.map((transaction) => transaction.id);

    expect(transactionIds).toContain(userATransactionId);
    expect(transactionIds).not.toContain(userBTransactionId);
  });

  it("Get detail transaction milik sendiri berhasil", async () => {
    const response = await app.request(`/api/transactions/${userATransactionId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<TransactionData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.id).toBe(userATransactionId);
    expect(body.data.note).toBe("Transaksi user A");
  });

  it("Update transaction milik sendiri berhasil", async () => {
    const response = await app.request(`/api/transactions/${userATransactionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        amount: "40000",
        note: "Transaksi user A updated"
      })
    });

    const body = await parseJson<TransactionData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Transaksi berhasil diupdate");
    expect(body.data.amount).toBe("40000");
    expect(body.data.note).toBe("Transaksi user A updated");
  });

  it("Update transaction user lain gagal", async () => {
    const response = await app.request(`/api/transactions/${userBTransactionId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        amount: "99999",
        note: "Mencoba update transaksi user lain"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Transaksi tidak ditemukan");
  });

  it("Delete transaction milik sendiri berhasil", async () => {
    const response = await app.request(`/api/transactions/${transactionForDeleteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<TransactionData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Transaksi berhasil dihapus");
    expect(body.data.id).toBe(transactionForDeleteId);
  });

  it("Delete transaction user lain gagal", async () => {
    const response = await app.request(`/api/transactions/${userBTransactionId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Transaksi tidak ditemukan");
  });

  it("Filter transaction by type berhasil", async () => {
    const response = await app.request("/api/transactions?type=EXPENSE&page=1&limit=50", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<TransactionListData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);

    for (const transaction of body.data.items) {
      expect(transaction.type).toBe("EXPENSE");
    }
  });

  it("Filter transaction by date berhasil", async () => {
    const response = await app.request(
      "/api/transactions?startDate=2000-01-01&endDate=2999-12-31&page=1&limit=50",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      }
    );

    const body = await parseJson<TransactionListData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.items.length).toBeGreaterThan(0);
  });
});