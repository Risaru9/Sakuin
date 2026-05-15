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

  recentTransactions: {
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
    };
  }[];

  expenseByCategory: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    categoryColor: string | null;
    type: "EXPENSE";
    totalAmount: string;
    transactionCount: number;
  }[];

  incomeByCategory: {
    categoryId: string;
    categoryName: string;
    categoryIcon: string | null;
    categoryColor: string | null;
    type: "INCOME";
    totalAmount: string;
    transactionCount: number;
  }[];

  monthlyTrend: {
    month: string;
    income: string;
    expense: string;
    balance: string;
  }[];
};

const testRunId = Date.now();

const userA = {
  name: "Summary Test User A",
  email: `summary-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Summary Test User B",
  email: `summary-user-b-${testRunId}@example.com`,
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
    note: "Gaji user A"
  });

  await createTransaction(tokenA, {
    type: "EXPENSE",
    amount: "250000",
    categoryId: "cat_expense_food",
    note: "Makan user A"
  });

  await createTransaction(tokenB, {
    type: "INCOME",
    amount: "9000000",
    categoryId: "cat_income_salary",
    note: "Gaji user B"
  });

  await createTransaction(tokenB, {
    type: "EXPENSE",
    amount: "8000000",
    categoryId: "cat_expense_food",
    note: "Makan user B"
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

describe("Summary API", () => {
  it("GET /api/summary berhasil menghitung summary user login", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Summary berhasil diambil");

    expect(body.data.totalIncome).toBe("1000000.00");
    expect(body.data.totalExpense).toBe("250000.00");
    expect(body.data.balance).toBe("750000.00");

    expect(body.data.incomeThisMonth).toBe("1000000.00");
    expect(body.data.expenseThisMonth).toBe("250000.00");
    expect(body.data.balanceThisMonth).toBe("750000.00");

    expect(body.data.safeBalanceLimit).toBe("0.00");
    expect(body.data.isBelowSafeLimit).toBe(false);

    expect(body.data.transactionCount).toBe(2);
    expect(body.data.recentTransactions).toHaveLength(2);
  }, 20000);

  it("GET /api/summary hanya menghitung transaksi milik user login", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.totalIncome).toBe("1000000.00");
    expect(body.data.totalExpense).toBe("250000.00");
    expect(body.data.balance).toBe("750000.00");

    expect(body.data.totalIncome).not.toBe("10000000.00");
    expect(body.data.totalExpense).not.toBe("8250000.00");
  }, 20000);

  it("GET /api/summary menghasilkan incomeByCategory dan expenseByCategory", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.incomeByCategory).toHaveLength(1);
    expect(body.data.incomeByCategory[0].categoryId).toBe("cat_income_salary");
    expect(body.data.incomeByCategory[0].categoryName).toBe("Gaji");
    expect(body.data.incomeByCategory[0].totalAmount).toBe("1000000.00");
    expect(body.data.incomeByCategory[0].transactionCount).toBe(1);

    expect(body.data.expenseByCategory).toHaveLength(1);
    expect(body.data.expenseByCategory[0].categoryId).toBe("cat_expense_food");
    expect(body.data.expenseByCategory[0].categoryName).toBe("Makanan");
    expect(body.data.expenseByCategory[0].totalAmount).toBe("250000.00");
    expect(body.data.expenseByCategory[0].transactionCount).toBe(1);
  }, 20000);

  it("GET /api/summary menghasilkan monthlyTrend 6 bulan", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.monthlyTrend).toHaveLength(6);

    const currentMonth = new Date().toISOString().slice(0, 7);
    const currentMonthTrend = body.data.monthlyTrend.find(
      (item) => item.month === currentMonth
    );

    expect(currentMonthTrend).toBeTruthy();
    expect(currentMonthTrend?.income).toBe("1000000.00");
    expect(currentMonthTrend?.expense).toBe("250000.00");
    expect(currentMonthTrend?.balance).toBe("750000.00");
  }, 20000);

  it("GET /api/summary gagal tanpa token", async () => {
    const response = await app.request("/api/summary", {
      method: "GET"
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });
});