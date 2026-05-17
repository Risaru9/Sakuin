import { afterAll, beforeAll, describe, expect, it } from "vitest";
import ExcelJS from "exceljs";
import { Buffer } from "node:buffer";
import { TransactionType } from "@prisma/client";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { resetRateLimitStore } from "../src/middlewares/rate-limit.middleware.js";

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

type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  transactionCount: number;
  recentTransactions: Array<{
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
  }>;
  expenseByCategory: Array<{
    categoryId: string;
    categoryName: string;
    type: "EXPENSE";
    totalAmount: string;
    transactionCount: number;
  }>;
  incomeByCategory: Array<{
    categoryId: string;
    categoryName: string;
    type: "INCOME";
    totalAmount: string;
    transactionCount: number;
  }>;
  monthlyTrend: Array<{
    month: string;
    income: string;
    expense: string;
    balance: string;
  }>;
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
  name: "Isolation Test User A",
  email: `isolation-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Isolation Test User B",
  email: `isolation-user-b-${testRunId}@example.com`,
  password: "Password123"
};

const userANotes = {
  salary: `ISOLATION_USER_A_SALARY_${testRunId}`,
  food: `ISOLATION_USER_A_FOOD_${testRunId}`,
  custom: `ISOLATION_USER_A_CUSTOM_${testRunId}`
};

const userBNotes = {
  salary: `ISOLATION_USER_B_SECRET_SALARY_${testRunId}`,
  food: `ISOLATION_USER_B_SECRET_FOOD_${testRunId}`,
  custom: `ISOLATION_USER_B_SECRET_CUSTOM_${testRunId}`
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";
let userACustomCategoryId = "";
let userBCustomCategoryId = "";
let userATransactionIds: string[] = [];
let userBTransactionIds: string[] = [];

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerUser(user: typeof userA) {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `198.51.100.${Math.floor(Math.random() * 200) + 1}`
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
      "X-Forwarded-For": `198.51.101.${Math.floor(Math.random() * 200) + 1}`
    },
    body: JSON.stringify({
      name: payload.name,
      type: payload.type,
      icon: "shield",
      color: "#0f172a"
    })
  });

  const body = await parseJson<CategoryData>(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

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
      Authorization: `Bearer ${token}`,
      "X-Forwarded-For": `198.51.102.${Math.floor(Math.random() * 200) + 1}`
    },
    body: JSON.stringify({
      type: payload.type,
      amount: payload.amount,
      categoryId: payload.categoryId,
      date: payload.date ?? new Date().toISOString(),
      note: payload.note
    })
  });

  const body = await parseJson<{ id: string }>(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  return body.data.id;
}

function collectSummaryNotes(summary: SummaryData) {
  return summary.recentTransactions
    .map((transaction) => transaction.note)
    .filter(Boolean);
}

function collectExportNotes(data: ExportData) {
  return data.transactions
    .map((transaction) => transaction.note)
    .filter(Boolean);
}

function expectNoUserBLeakInText(text: string) {
  expect(text).not.toContain(userBNotes.salary);
  expect(text).not.toContain(userBNotes.food);
  expect(text).not.toContain(userBNotes.custom);
  expect(text).not.toContain(userBCustomCategoryId);
}

async function getXlsxText(response: Response) {
  const arrayBuffer = await response.arrayBuffer();
  const workbook = new ExcelJS.Workbook();

  const xlsxBuffer = Buffer.from(arrayBuffer) as unknown as Parameters<
    typeof workbook.xlsx.load
  >[0];

  await workbook.xlsx.load(xlsxBuffer);

  const values: string[] = [];

  for (const worksheet of workbook.worksheets) {
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        if (cell.value !== null && cell.value !== undefined) {
          values.push(String(cell.value));
        }
      });
    });
  }

  return values.join("\n");
}

beforeAll(async () => {
  resetRateLimitStore();

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

  const authA = await registerUser(userA);
  const authB = await registerUser(userB);

  tokenA = authA.token;
  tokenB = authB.token;
  userAId = authA.user.id;
  userBId = authB.user.id;

  const userACustomCategory = await createCategory(tokenA, {
    name: `Isolation Custom User A ${testRunId}`,
    type: "EXPENSE"
  });

  const userBCustomCategory = await createCategory(tokenB, {
    name: `Isolation Secret User B ${testRunId}`,
    type: "EXPENSE"
  });

  userACustomCategoryId = userACustomCategory.id;
  userBCustomCategoryId = userBCustomCategory.id;

  userATransactionIds = [
    await createTransaction(tokenA, {
      type: "INCOME",
      amount: "1100000",
      categoryId: "cat_income_salary",
      note: userANotes.salary
    }),
    await createTransaction(tokenA, {
      type: "EXPENSE",
      amount: "210000",
      categoryId: "cat_expense_food",
      note: userANotes.food
    }),
    await createTransaction(tokenA, {
      type: "EXPENSE",
      amount: "90000",
      categoryId: userACustomCategoryId,
      note: userANotes.custom
    })
  ];

  userBTransactionIds = [
    await createTransaction(tokenB, {
      type: "INCOME",
      amount: "9100000",
      categoryId: "cat_income_salary",
      note: userBNotes.salary
    }),
    await createTransaction(tokenB, {
      type: "EXPENSE",
      amount: "8100000",
      categoryId: "cat_expense_food",
      note: userBNotes.food
    }),
    await createTransaction(tokenB, {
      type: "EXPENSE",
      amount: "7100000",
      categoryId: userBCustomCategoryId,
      note: userBNotes.custom
    })
  ];
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

describe("Summary and Export data isolation", () => {
  it("Summary hanya menghitung transaksi milik user login dan tidak memuat transaksi user lain", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "198.51.103.10"
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.totalIncome).toBe("1100000.00");
    expect(body.data.totalExpense).toBe("300000.00");
    expect(body.data.balance).toBe("800000.00");
    expect(body.data.transactionCount).toBe(3);

    const recentIds = body.data.recentTransactions.map(
      (transaction) => transaction.id
    );

    for (const transactionId of userATransactionIds) {
      expect(recentIds).toContain(transactionId);
    }

    for (const transactionId of userBTransactionIds) {
      expect(recentIds).not.toContain(transactionId);
    }

    const summaryNotes = collectSummaryNotes(body.data);

    expect(summaryNotes).toContain(userANotes.salary);
    expect(summaryNotes).toContain(userANotes.food);
    expect(summaryNotes).toContain(userANotes.custom);
    expect(summaryNotes).not.toContain(userBNotes.salary);
    expect(summaryNotes).not.toContain(userBNotes.food);
    expect(summaryNotes).not.toContain(userBNotes.custom);
  }, 20000);

  it("Summary category breakdown tidak memuat custom category milik user lain", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "198.51.103.11"
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    const expenseCategoryIds = body.data.expenseByCategory.map(
      (category) => category.categoryId
    );

    expect(expenseCategoryIds).toContain("cat_expense_food");
    expect(expenseCategoryIds).toContain(userACustomCategoryId);
    expect(expenseCategoryIds).not.toContain(userBCustomCategoryId);

    const totalExpenseFromCategories = body.data.expenseByCategory.reduce(
      (total, category) => total + Number(category.totalAmount),
      0
    );

    expect(totalExpenseFromCategories).toBe(300000);
  }, 20000);

  it("Export JSON hanya memuat transaksi dan summary milik user login", async () => {
    const response = await app.request("/api/export/transactions?format=json", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "198.51.103.12"
      }
    });

    const body = await parseJson<ExportData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.summary.totalIncome).toBe("1100000.00");
    expect(body.data.summary.totalExpense).toBe("300000.00");
    expect(body.data.summary.balance).toBe("800000.00");
    expect(body.data.summary.transactionCount).toBe(3);
    expect(body.data.transactions).toHaveLength(3);

    const exportIds = body.data.transactions.map((transaction) => transaction.id);

    for (const transactionId of userATransactionIds) {
      expect(exportIds).toContain(transactionId);
    }

    for (const transactionId of userBTransactionIds) {
      expect(exportIds).not.toContain(transactionId);
    }

    const notes = collectExportNotes(body.data);

    expect(notes).toContain(userANotes.salary);
    expect(notes).toContain(userANotes.food);
    expect(notes).toContain(userANotes.custom);
    expect(notes).not.toContain(userBNotes.salary);
    expect(notes).not.toContain(userBNotes.food);
    expect(notes).not.toContain(userBNotes.custom);
  }, 20000);

  it("Export JSON dengan filter categoryId user lain tidak membocorkan data dan menghasilkan data kosong", async () => {
    const response = await app.request(
      `/api/export/transactions?format=json&categoryId=${userBCustomCategoryId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "X-Forwarded-For": "198.51.103.13"
        }
      }
    );

    const body = await parseJson<ExportData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.filters.categoryId).toBe(userBCustomCategoryId);
    expect(body.data.summary.totalIncome).toBe("0.00");
    expect(body.data.summary.totalExpense).toBe("0.00");
    expect(body.data.summary.balance).toBe("0.00");
    expect(body.data.summary.transactionCount).toBe(0);
    expect(body.data.transactions).toHaveLength(0);
  }, 20000);

  it("Export CSV tidak memuat catatan, transaksi, atau custom category milik user lain", async () => {
    const response = await app.request("/api/export/transactions?format=csv", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "198.51.103.14"
      }
    });

    const csv = await response.text();

    expect(response.status).toBe(200);
    expect(csv).toContain(userANotes.salary);
    expect(csv).toContain(userANotes.food);
    expect(csv).toContain(userANotes.custom);
    expect(csv).toContain(userACustomCategoryId);

    expectNoUserBLeakInText(csv);
  }, 20000);

  it("Export XLSX tidak memuat catatan, transaksi, atau custom category milik user lain", async () => {
    const response = await app.request("/api/export/transactions?format=xlsx", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
        "X-Forwarded-For": "198.51.103.15"
      }
    });

    expect(response.status).toBe(200);

    const xlsxText = await getXlsxText(response);

    expect(xlsxText).toContain(userANotes.salary);
    expect(xlsxText).toContain(userANotes.food);
    expect(xlsxText).toContain(userANotes.custom);
    expect(xlsxText).toContain(userACustomCategoryId);

    expectNoUserBLeakInText(xlsxText);
  }, 30000);

  it("Export filter type tetap hanya menghitung transaksi milik user login", async () => {
    const response = await app.request(
      "/api/export/transactions?format=json&type=EXPENSE",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${tokenA}`,
          "X-Forwarded-For": "198.51.103.16"
        }
      }
    );

    const body = await parseJson<ExportData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.filters.type).toBe("EXPENSE");
    expect(body.data.summary.totalIncome).toBe("0.00");
    expect(body.data.summary.totalExpense).toBe("300000.00");
    expect(body.data.summary.balance).toBe("-300000.00");
    expect(body.data.summary.transactionCount).toBe(2);

    const notes = collectExportNotes(body.data);

    expect(notes).toContain(userANotes.food);
    expect(notes).toContain(userANotes.custom);
    expect(notes).not.toContain(userANotes.salary);
    expect(notes).not.toContain(userBNotes.food);
    expect(notes).not.toContain(userBNotes.custom);
  }, 20000);
}); 