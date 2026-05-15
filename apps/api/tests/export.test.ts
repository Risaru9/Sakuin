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

type ExportTransactionRow = {
  id: string;
  date: string;
  type: "INCOME" | "EXPENSE";
  amount: string;
  note: string | null;
  category: {
    id: string;
    name: string;
    type: "INCOME" | "EXPENSE";
    icon: string | null;
    color: string | null;
  };
  createdAt: string;
  updatedAt: string;
};

type ExportData = {
  generatedAt: string;
  filters: {
    type: "INCOME" | "EXPENSE" | null;
    categoryId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  summary: {
    totalIncome: string;
    totalExpense: string;
    balance: string;
    transactionCount: number;
  };
  transactions: ExportTransactionRow[];
};

const testRunId = Date.now();

const userA = {
  name: "Export Test User A",
  email: `export-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Export Test User B",
  email: `export-user-b-${testRunId}@example.com`,
  password: "Password123"
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";

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

async function createTransaction(
  token: string,
  payload: {
    type: "INCOME" | "EXPENSE";
    amount: string;
    categoryId: string;
    note: string;
    date?: string;
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

  const body = await parseJson(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  return body;
}

beforeAll(async () => {
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

  const authA = await registerUser(userA);
  const authB = await registerUser(userB);

  tokenA = authA.token;
  tokenB = authB.token;
  userAId = authA.user.id;
  userBId = authB.user.id;

  await createTransaction(tokenA, {
    type: "INCOME",
    amount: "1000000",
    categoryId: "cat_income_salary",
    note: "Gaji untuk export user A"
  });

  await createTransaction(tokenA, {
    type: "EXPENSE",
    amount: "250000",
    categoryId: "cat_expense_food",
    note: "Makan untuk export user A"
  });

  await createTransaction(tokenB, {
    type: "INCOME",
    amount: "9000000",
    categoryId: "cat_income_salary",
    note: "Gaji rahasia user B"
  });

  await createTransaction(tokenB, {
    type: "EXPENSE",
    amount: "8000000",
    categoryId: "cat_expense_food",
    note: "Makan rahasia user B"
  });
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

describe("Export API", () => {
  it("GET /api/export/transactions?format=json berhasil export transaksi user login", async () => {
    const response = await app.request("/api/export/transactions?format=json", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<ExportData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Export transaksi berhasil dibuat");

    expect(body.data.summary.totalIncome).toBe("1000000.00");
    expect(body.data.summary.totalExpense).toBe("250000.00");
    expect(body.data.summary.balance).toBe("750000.00");
    expect(body.data.summary.transactionCount).toBe(2);

    expect(body.data.transactions).toHaveLength(2);

    const notes = body.data.transactions.map((transaction) => transaction.note);

    expect(notes).toContain("Gaji untuk export user A");
    expect(notes).toContain("Makan untuk export user A");
    expect(notes).not.toContain("Gaji rahasia user B");
    expect(notes).not.toContain("Makan rahasia user B");
  }, 20000);

  it("GET /api/export/transactions?format=json&type=EXPENSE berhasil filter expense", async () => {
    const response = await app.request(
      "/api/export/transactions?format=json&type=EXPENSE",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      }
    );

    const body = await parseJson<ExportData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.filters.type).toBe("EXPENSE");
    expect(body.data.summary.totalIncome).toBe("0.00");
    expect(body.data.summary.totalExpense).toBe("250000.00");
    expect(body.data.summary.balance).toBe("-250000.00");
    expect(body.data.summary.transactionCount).toBe(1);

    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.transactions[0].type).toBe("EXPENSE");
    expect(body.data.transactions[0].note).toBe("Makan untuk export user A");
  }, 20000);

  it("GET /api/export/transactions?format=csv berhasil export CSV", async () => {
    const response = await app.request("/api/export/transactions?format=csv", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(contentType).toContain("text/csv");
    expect(contentDisposition).toContain("attachment");
    expect(contentDisposition).toContain(".csv");

    expect(csv).toContain("Sakuin Export Transaksi");
    expect(csv).toContain("Total Income,1000000.00");
    expect(csv).toContain("Total Expense,250000.00");
    expect(csv).toContain("Balance,750000.00");
    expect(csv).toContain("Transaction Count,2");
    expect(csv).toContain("ID,Tanggal,Tipe,Kategori ID,Kategori,Nominal,Catatan,Created At,Updated At");

    expect(csv).toContain("Gaji untuk export user A");
    expect(csv).toContain("Makan untuk export user A");
    expect(csv).not.toContain("Gaji rahasia user B");
    expect(csv).not.toContain("Makan rahasia user B");
  }, 20000);

  it("GET /api/export/transactions?format=xlsx berhasil export XLSX", async () => {
    const response = await app.request("/api/export/transactions?format=xlsx", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const contentType = response.headers.get("content-type");
    const contentDisposition = response.headers.get("content-disposition");
    const arrayBuffer = await response.arrayBuffer();

    expect(response.status).toBe(200);
    expect(contentType).toContain(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    expect(contentDisposition).toContain("attachment");
    expect(contentDisposition).toContain(".xlsx");

    expect(arrayBuffer.byteLength).toBeGreaterThan(1000);
  }, 30000);

  it("GET /api/export/transactions gagal jika format tidak valid", async () => {
    const response = await app.request("/api/export/transactions?format=pdf", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validasi request gagal");
  });

  it("GET /api/export/transactions gagal jika endDate lebih awal dari startDate", async () => {
    const response = await app.request(
      "/api/export/transactions?format=json&startDate=2026-12-31&endDate=2026-01-01",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`
        }
      }
    );

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Validasi request gagal");
  });

  it("GET /api/export/transactions gagal tanpa token", async () => {
    const response = await app.request("/api/export/transactions?format=json", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });
});