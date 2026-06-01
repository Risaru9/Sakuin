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

type SafeToSpendData = {
  status: "SAFE" | "WATCH" | "HOLD" | "UNKNOWN";
  spendingPaceStatus: "ON_TRACK" | "WATCH" | "FAST" | "UNKNOWN";
  netCashflow: number;
  safeBalanceLimit: number;
  availableToSpend: number;
  remainingDays: number;
  suggestedDailyLimit: number | null;
  expenseToIncomeRatio: number | null;
  monthProgressPercent: number;
  expensePacePercent: number | null;
  projectedMonthEndExpense: number;
  projectedNetCashflow: number;
  topRiskCategoryName: string | null;
  topRiskCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
};

type FinancialCheckupData = {
  status: "GOOD" | "WATCH" | "RISK" | "UNKNOWN";
  priority: "MAINTAIN" | "MONITOR" | "REDUCE" | "HOLD" | "COLLECT_DATA";
  title: string;
  headline: string;
  focusCategoryName: string | null;
  focusCategoryAmount: number;
  reason: string;
  action: string;
  warnings: string[];
  metrics: {
    totalIncome: number;
    totalExpense: number;
    netCashflow: number;
    expenseToIncomeRatio: number | null;
    expenseChangePercent: number | null;
    safeToSpendStatus: "SAFE" | "WATCH" | "HOLD" | "UNKNOWN";
    spendingPaceStatus: "ON_TRACK" | "WATCH" | "FAST" | "UNKNOWN";
    availableToSpend: number;
    suggestedDailyLimit: number | null;
    projectedNetCashflow: number;
  };
};

type SummaryHabitData = {
  currentMonthTransactionDays: number;
  currentMonthDaysElapsed: number;
  currentMonthCompletenessPercent: number;
  monthActiveDays: number;
  weeklyActiveDays: number;
  currentWeekActiveDays: number;
  currentWeekExpense: string;
  previousWeekExpense: string;
  currentWeekExpenseTrend: "UP" | "DOWN" | "STABLE" | "NO_DATA";
  currentWeekTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  dayRhythm: {
    date: string;
    day: "Sen" | "Sel" | "Rab" | "Kam" | "Jum" | "Sab" | "Min";
    hasTransaction: boolean;
    transactionCount: number;
    income: string;
    expense: string;
    isToday: boolean;
    isFuture: boolean;
  }[];
  currentStreakDays: number;
  hasTransactionToday: boolean;
  transactionsToday: number;
  todayTransactionCount: number;
  expenseTransactionsToday: number;
  todayExpenseCount: number;
  todayIncomeCount: number;
  lastTransactionDate: string | null;
  daysSinceLastTransaction: number | null;
  last7DaysTransactionCount: number;
  last7DaysExpense: string;
  last7DaysTopExpenseCategory: {
    name: string;
    amount: string;
    transactionCount: number;
  } | null;
  completionStatus: "NOT_STARTED" | "STARTED" | "REVIEW_READY" | "STRONG_DAY";
  recommendedAction:
    | "ADD_TRANSACTION"
    | "REVIEW_TODAY"
    | "ASK_ASSISTANT"
    | "CONTINUE_TRACKING";
  habitStatus: "NO_DATA" | "LIGHT" | "ACTIVE" | "STALE";
  habitMessage: string;
  habitMessageDetail: {
    title: string;
    description: string;
    tone: "NEUTRAL" | "NUDGE" | "GOOD" | "READY";
  };
};

type SummaryData = {
  totalIncome: string;
  totalExpense: string;
  balance: string;
  safeBalanceLimit: string;
  isBelowSafeLimit: boolean;
  safeToSpend: SafeToSpendData;
  financialCheckup: FinancialCheckupData;
  habit: SummaryHabitData | null;

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

    const isProjectedCashflowNegative =
      body.data.safeToSpend.projectedNetCashflow < 0;
    const expectedSafeToSpendStatus = isProjectedCashflowNegative
      ? "HOLD"
      : "WATCH";
    const expectedCheckupStatus = isProjectedCashflowNegative
      ? "RISK"
      : "WATCH";
    const expectedCheckupPriority = isProjectedCashflowNegative
      ? "HOLD"
      : "REDUCE";
    const expectedCheckupTitle = isProjectedCashflowNegative
      ? "Checkup Keuangan Berisiko"
      : "Checkup Keuangan Waspada";

    expect(body.data.safeToSpend.status).toBe(expectedSafeToSpendStatus);
    expect(body.data.safeToSpend.netCashflow).toBe(750000);
    expect(body.data.safeToSpend.safeBalanceLimit).toBe(0);
    expect(body.data.safeToSpend.availableToSpend).toBe(750000);
    expect(body.data.safeToSpend.suggestedDailyLimit).not.toBeNull();
    expect(body.data.safeToSpend.expenseToIncomeRatio).toBe(25);
    expect(body.data.safeToSpend.topRiskCategoryName).toBe("Makanan");
    expect(body.data.safeToSpend.topRiskCategoryAmount).toBe(250000);
    expect(body.data.safeToSpend.reason).toBeTruthy();
    expect(body.data.safeToSpend.action).toBeTruthy();
    expect(body.data.safeToSpend.warnings).toContain(
      "Kategori Makanan mengambil porsi besar dari total pengeluaran."
    );

    expect(body.data.financialCheckup.status).toBe(expectedCheckupStatus);
    expect(body.data.financialCheckup.priority).toBe(expectedCheckupPriority);
    expect(body.data.financialCheckup.title).toBe(expectedCheckupTitle);
    expect(body.data.financialCheckup.focusCategoryName).toBe("Makanan");
    expect(body.data.financialCheckup.focusCategoryAmount).toBe(250000);
    expect(body.data.financialCheckup.headline).toContain("Makanan");
    expect(body.data.financialCheckup.reason).toBeTruthy();
    expect(body.data.financialCheckup.action).toContain("Makanan");
    expect(body.data.financialCheckup.metrics.totalIncome).toBe(1000000);
    expect(body.data.financialCheckup.metrics.totalExpense).toBe(250000);
    expect(body.data.financialCheckup.metrics.netCashflow).toBe(750000);
    expect(body.data.financialCheckup.metrics.expenseToIncomeRatio).toBe(25);
    expect(body.data.financialCheckup.metrics.safeToSpendStatus).toBe(
      expectedSafeToSpendStatus
    );
    expect(body.data.financialCheckup.warnings).toContain(
      "Kategori Makanan mengambil porsi besar dari total pengeluaran."
    );

    expect(body.data.habit).toBeTruthy();
    expect(body.data.habit?.currentMonthTransactionDays).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.currentMonthDaysElapsed).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.currentMonthCompletenessPercent).toBeGreaterThan(0);
    expect(body.data.habit?.monthActiveDays).toBe(
      body.data.habit?.currentMonthTransactionDays
    );
    expect(body.data.habit?.weeklyActiveDays).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.currentWeekActiveDays).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.currentWeekExpense).toBe("250000.00");
    expect(body.data.habit?.dayRhythm).toHaveLength(7);
    expect(body.data.habit?.hasTransactionToday).toBe(true);
    expect(body.data.habit?.transactionsToday).toBeGreaterThanOrEqual(2);
    expect(body.data.habit?.todayTransactionCount).toBe(
      body.data.habit?.transactionsToday
    );
    expect(body.data.habit?.expenseTransactionsToday).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.todayExpenseCount).toBe(
      body.data.habit?.expenseTransactionsToday
    );
    expect(body.data.habit?.todayIncomeCount).toBeGreaterThanOrEqual(1);
    expect(body.data.habit?.last7DaysTransactionCount).toBeGreaterThanOrEqual(2);
    expect(body.data.habit?.last7DaysExpense).toBe("250000.00");
    expect(body.data.habit?.last7DaysTopExpenseCategory).toMatchObject({
      name: "Makanan",
      amount: "250000.00",
      transactionCount: 1
    });
    expect(body.data.habit?.completionStatus).toMatch(
      /STARTED|REVIEW_READY|STRONG_DAY/
    );
    expect(body.data.habit?.recommendedAction).toMatch(
      /CONTINUE_TRACKING|REVIEW_TODAY|ASK_ASSISTANT/
    );
    expect(body.data.habit?.habitStatus).not.toBe("NO_DATA");
    expect(body.data.habit?.habitMessage).toBeTruthy();
    expect(body.data.habit?.habitMessageDetail.title).toBeTruthy();
    expect(body.data.habit?.habitMessageDetail.description).toBeTruthy();

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
    expect(body.data.safeToSpend.netCashflow).toBe(750000);
    expect(body.data.safeToSpend.topRiskCategoryName).toBe("Makanan");
    expect(body.data.safeToSpend.topRiskCategoryAmount).toBe(250000);
    expect(JSON.stringify(body.data.safeToSpend)).not.toContain(userBId);
    expect(JSON.stringify(body.data.safeToSpend)).not.toContain(userB.email);
    expect(JSON.stringify(body.data.safeToSpend)).not.toContain("8000000");

    expect(body.data.financialCheckup.metrics.netCashflow).toBe(750000);
    expect(body.data.financialCheckup.focusCategoryName).toBe("Makanan");
    expect(body.data.financialCheckup.focusCategoryAmount).toBe(250000);
    expect(JSON.stringify(body.data.financialCheckup)).not.toContain(userBId);
    expect(JSON.stringify(body.data.financialCheckup)).not.toContain(userB.email);
    expect(JSON.stringify(body.data.financialCheckup)).not.toContain("8000000");
    expect(JSON.stringify(body.data.habit)).not.toContain(userBId);
    expect(JSON.stringify(body.data.habit)).not.toContain(userB.email);
    expect(JSON.stringify(body.data.habit)).not.toContain("8000000");
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

  it("GET /api/summary menghasilkan monthlyTrend 12 bulan", async () => {
    const response = await app.request("/api/summary", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<SummaryData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(body.data.monthlyTrend).toHaveLength(12);

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
