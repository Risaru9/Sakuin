import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { localDateKey, localDayStart } from "../src/modules/summary/glance-copy.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
};

type QuickResult = {
  transactions: Array<{
    id: string;
    type: "INCOME" | "EXPENSE";
    amount: string;
    note: string | null;
    date: string;
    category: { id: string; name: string };
  }>;
  budgetAlerts: Array<{ categoryId: string; level: 80 | 100; title: string; body: string }>;
  todayExpense: number;
  skippedCount: number;
};

type Glance = {
  date: string;
  todayExpense: number;
  month: { label: string; income: number; expense: number; left: number };
  budget: { categoryName: string; spent: number; limit: number; percent: number; status: string } | null;
  lastTransaction: { name: string; amount: number; type: string } | null;
  week: { expense: number; count: number; notification: { title: string; body: string } | null };
};

const WIB = -420;
const FOOD = "cat_expense_food";
const runId = Date.now();
const users = [
  { name: "Quick Test A", email: `quick-a-${runId}@example.com`, password: "Password123" },
  { name: "Quick Test B", email: `quick-b-${runId}@example.com`, password: "Password123" }
];

let tokenA = "";
let tokenB = "";
const userIds: string[] = [];
const today = localDateKey(new Date(), WIB);

async function register(user: (typeof users)[number]) {
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user)
  });
  const body = (await response.json()) as ApiResponse<{ token: string; user: { id: string } }>;

  expect(response.status).toBe(201);
  userIds.push(body.data.user.id);

  return body.data.token;
}

function post(path: string, token: string, payload: unknown) {
  return app.request(path, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(payload)
  });
}

async function quick(token: string, text: string, extra: Record<string, unknown> = {}) {
  const response = await post("/api/transactions/quick", token, { text, tzOffsetMinutes: WIB, ...extra });

  return { response, body: (await response.json()) as ApiResponse<QuickResult> };
}

beforeAll(async () => {
  tokenA = await register(users[0]);
  tokenB = await register(users[1]);

  const response = await app.request(`/api/categories/${FOOD}/limit`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ limit: 100000 })
  });

  expect(response.status).toBe(200);
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  await prisma.$disconnect();
}, 30000);

describe("Quick transactions from the Android widget", () => {
  it("parses a typed line and saves it on today's local day", async () => {
    const { response, body } = await quick(tokenA, "kopi susu 18rb");

    expect(response.status).toBe(201);
    expect(body.data.transactions).toHaveLength(1);
    expect(body.data.transactions[0]).toMatchObject({
      type: "EXPENSE",
      amount: "18000",
      note: "kopi susu",
      category: { id: FOOD, name: "Makanan" }
    });
    expect(body.data.transactions[0]!.date).toBe(localDayStart(today, WIB).toISOString());
    expect(body.data.budgetAlerts).toEqual([]);
    expect(body.data.todayExpense).toBe(18000);
  });

  it("alerts once when the limit passes 80% and once when it runs out", async () => {
    const eighty = await quick(tokenA, "makan siang 65rb");

    expect(eighty.body.data.budgetAlerts).toHaveLength(1);
    expect(eighty.body.data.budgetAlerts[0]).toMatchObject({ categoryId: FOOD, level: 80 });
    expect(eighty.body.data.budgetAlerts[0]!.title).toBe("Makanan sudah 83% dari batas");

    const stillEighty = await quick(tokenA, "roti 2rb");
    expect(stillEighty.body.data.budgetAlerts).toEqual([]);

    const full = await quick(tokenA, "bakso 20rb");
    expect(full.body.data.budgetAlerts).toHaveLength(1);
    expect(full.body.data.budgetAlerts[0]).toMatchObject({ level: 100, title: "Batas Makanan sudah habis" });

    const after = await quick(tokenA, "kopi 5rb");
    expect(after.body.data.budgetAlerts).toEqual([]);
  });

  it("never alerts for back-dated entries", async () => {
    const lastMonth = localDateKey(new Date(localDayStart(today, WIB).getTime() - 40 * 86_400_000), WIB);
    const { response, body } = await quick(tokenA, "bakso 90rb", { date: lastMonth });

    expect(response.status).toBe(201);
    expect(body.data.budgetAlerts).toEqual([]);
  });

  it("saves income and several items in one line", async () => {
    const { body } = await quick(tokenA, "gaji 5jt, parkir 5rb");

    expect(body.data.transactions.map((transaction) => transaction.type)).toEqual(["INCOME", "EXPENSE"]);
  });

  it("refuses text without an amount", async () => {
    const { response, body } = await quick(tokenA, "beli sesuatu");

    expect(response.status).toBe(400);
    expect(body.message).toBe("Nominalnya belum ketemu. Coba tulis seperti: kopi 18rb");
  });

  it("summarises today, the month, the closest limit and the week", async () => {
    const response = await app.request(`/api/summary/glance?date=${today}&tz=${WIB}`, {
      headers: { Authorization: `Bearer ${tokenA}` }
    });
    const body = (await response.json()) as ApiResponse<Glance>;

    expect(response.status).toBe(200);
    expect(body.data.todayExpense).toBe(18000 + 65000 + 2000 + 20000 + 5000 + 5000);
    expect(body.data.month.income).toBe(5_000_000);
    expect(body.data.month.left).toBe(5_000_000 - body.data.month.expense);
    expect(body.data.budget).toMatchObject({ categoryName: "Makanan", spent: 110000, limit: 100000, status: "over" });
    expect(["gaji", "parkir"]).toContain(body.data.lastTransaction?.name);
    expect(body.data.week.notification?.title).toMatch(/^Minggu ini keluar /);
  });

  it("checks budget alerts only for the caller's own transactions", async () => {
    const saved = await quick(tokenA, "kopi 1rb");
    const ids = saved.body.data.transactions.map((transaction) => transaction.id);
    const response = await post("/api/transactions/budget-alerts", tokenB, {
      transactionIds: ids,
      tzOffsetMinutes: WIB
    });
    const body = (await response.json()) as ApiResponse<{ budgetAlerts: unknown[] }>;

    expect(response.status).toBe(200);
    expect(body.data.budgetAlerts).toEqual([]);
  });

  it("requires a login", async () => {
    const response = await app.request("/api/summary/glance");

    expect(response.status).toBe(401);
  });
});

it("replays the same phone request without duplicate transactions", async () => {
  const requestId = "9662886f-fecd-4879-ae48-bc847b972441";
  const first = await quick(tokenA, "kopi 18rb, parkir 5rb", { requestId });
  const second = await quick(tokenA, "kopi 18rb, parkir 5rb", { requestId });
  expect(first.response.status).toBe(201);
  expect(second.response.status).toBe(201);
  expect(second.body.data.transactions.map((t) => t.id)).toEqual(first.body.data.transactions.map((t) => t.id));
  const otherUser = await quick(tokenB, "kopi 18rb", { requestId });
  expect(otherUser.body.data.transactions[0].id).not.toBe(first.body.data.transactions[0].id);
});
