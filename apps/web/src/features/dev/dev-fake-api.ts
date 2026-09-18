// Development-only in-memory API for the /dev/beranda, /dev/cari, /dev/laporan and
// /dev/lainnya previews. It answers the requests those screens make, so their flows can be
// tried without a server or real data.
// Scenario flags come from the URL the preview is first opened with:
//   ?kosong=1  a brand-new user without entries
//   ?lambat=1  every answer takes 1.5 seconds
//   ?gagal=1   loading the transaction list fails

import type { FinanceAccount } from "../accounts/account.types";
import type { Category } from "../categories/category.types";
import type { Transaction } from "../transactions/transaction.types";

type Scenario = { empty: boolean; slow: boolean; failList: boolean };

type CategorySeed = [id: string, name: string, type: Category["type"], icon: string];

const CATEGORY_SEEDS: CategorySeed[] = [
  ["cat-gaji", "Gaji", "INCOME", "wallet"],
  ["cat-bonus", "Bonus", "INCOME", "gift"],
  ["cat-masuk-lain", "Pemasukan Lainnya", "INCOME", "plus-circle"],
  ["cat-makan", "Makanan", "EXPENSE", "utensils"],
  ["cat-kopi", "Ngopi", "EXPENSE", "coffee"],
  ["cat-transport", "Transportasi", "EXPENSE", "car"],
  ["cat-belanja", "Belanja", "EXPENSE", "shopping-bag"],
  ["cat-tagihan", "Tagihan", "EXPENSE", "receipt"],
  ["cat-sehat", "Kesehatan", "EXPENSE", "heart-pulse"],
  ["cat-didik", "Pendidikan", "EXPENSE", "book-open"],
  ["cat-keluar-lain", "Pengeluaran Lainnya", "EXPENSE", "minus-circle"]
];

// [days ago, note, category id, amount]
const ENTRY_SEEDS: Array<[number, string, string, number]> = [
  [0, "Kopi susu", "cat-makan", 18000],
  [0, "Bensin", "cat-transport", 30000],
  [1, "Makan siang", "cat-makan", 25000],
  [1, "Parkir", "cat-transport", 5000],
  [1, "Sabun dan sampo", "cat-belanja", 30000],
  [2, "Token listrik", "cat-tagihan", 200000],
  [2, "Dikasih kakak", "cat-masuk-lain", 100000],
  [3, "Belanja sayur", "cat-belanja", 67000],
  [3, "Obat flu", "cat-sehat", 25000],
  [4, "Kopi sore", "cat-kopi", 32000],
  [5, "Kopi susu", "cat-makan", 18000],
  [7, "Bonus proyek", "cat-bonus", 400000],
  [12, "Kopi dan roti", "cat-makan", 25000],
  [14, "Buku tulis", "cat-didik", 12000],
  [16, "Gaji", "cat-gaji", 3000000],
  [34, "Internet rumah", "cat-tagihan", 350000],
  [40, "Makan malam keluarga", "cat-makan", 185000],
  [47, "Gaji", "cat-gaji", 3000000],
  [70, "Sepatu", "cat-belanja", 420000],
  [95, "Servis motor", "cat-transport", 260000]
];

let installed = false;

function readScenario(): Scenario {
  const params = new URLSearchParams(window.location.search);

  return {
    empty: params.get("kosong") === "1",
    slow: params.get("lambat") === "1",
    failList: params.get("gagal") === "1"
  };
}

function localMidnightIso(daysAgo: number) {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysAgo).toISOString();
}

export function installFakeApi() {
  if (installed) {
    return;
  }

  installed = true;
  const scenario = readScenario();
  const originalFetch = window.fetch.bind(window);
  let nextId = 1;

  // Some limits so the Laporan budgets have something to show.
  const seededLimits: Record<string, number> = scenario.empty
    ? {}
    : { "cat-makan": 150_000, "cat-tagihan": 800_000, "cat-transport": 60_000 };
  const categories: Category[] = CATEGORY_SEEDS.map(([id, name, type, icon]) => ({
    id,
    name,
    type,
    icon,
    color: null,
    isDefault: id !== "cat-kopi",
    limit: seededLimits[id] ?? null
  }));

  const accounts: FinanceAccount[] = [
    ["acc-dompet", "Dompet Utama", "CASH", 250000],
    ["acc-bca", "BCA", "BANK", 3500000],
    ["acc-gopay", "GoPay", "E_WALLET", 90000]
  ].map(([id, name, type, initialBalance]) => ({
    id: String(id),
    name: String(name),
    type: type as FinanceAccount["type"],
    icon: null,
    color: null,
    initialBalance: String(initialBalance),
    balance: String(initialBalance),
    transactionCount: 0,
    isArchived: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }));

  function toTransaction(input: {
    type: Transaction["type"];
    amount: string | number;
    categoryId: string;
    accountId?: string;
    date: string;
    note?: string | null;
  }): Transaction {
    const category = categories.find((item) => item.id === input.categoryId) ?? categories[0];
    const account = accounts.find((item) => item.id === input.accountId) ?? accounts[0];
    const now = new Date().toISOString();

    return {
      id: `dev-tx-${nextId++}`,
      type: input.type,
      amount: Number(input.amount).toFixed(2),
      note: input.note ?? null,
      date: input.date,
      categoryId: category.id,
      category: {
        id: category.id,
        name: category.name,
        type: category.type,
        icon: category.icon,
        color: category.color,
        isDefault: category.isDefault
      },
      account: { id: account.id, name: account.name, type: account.type, icon: null, color: null },
      createdAt: now,
      updatedAt: now
    };
  }

  let transactions: Transaction[] = scenario.empty
    ? []
    : ENTRY_SEEDS.map(([daysAgo, note, categoryId, amount]) =>
        toTransaction({
          type: categories.find((item) => item.id === categoryId)?.type ?? "EXPENSE",
          amount,
          categoryId,
          date: localMidnightIso(daysAgo),
          note
        })
      );

  function monthKeyOf(iso: string) {
    const date = new Date(iso);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
  }

  function byCategory(items: Transaction[], type: Transaction["type"]) {
    const totals = new Map<string, number>();

    for (const item of items.filter((entry) => entry.type === type)) {
      totals.set(item.categoryId, (totals.get(item.categoryId) ?? 0) + Number(item.amount));
    }

    return [...totals].map(([categoryId, total]) => {
      const category = categories.find((entry) => entry.id === categoryId);
      return {
        categoryId,
        categoryName: category?.name ?? "Kategori",
        categoryIcon: category?.icon ?? null,
        categoryColor: null,
        type,
        totalAmount: total.toFixed(2),
        transactionCount: items.filter((entry) => entry.categoryId === categoryId).length,
        limit: null
      };
    });
  }

  function buildSummary(url: URL) {
    const now = new Date();
    const month = Number(url.searchParams.get("month")) || null;
    const year = Number(url.searchParams.get("year")) || null;
    const periodKey = month && year ? `${year}-${String(month).padStart(2, "0")}` : null;
    const inPeriod = periodKey ? transactions.filter((item) => monthKeyOf(item.date) === periodKey) : transactions;
    const sum = (type: Transaction["type"]) =>
      inPeriod.filter((item) => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
    const monthlyTrend = Array.from({ length: 12 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - 11 + index, 1);
      const key = monthKeyOf(date.toISOString());
      const inMonth = transactions.filter((item) => monthKeyOf(item.date) === key);
      const income = inMonth.filter((item) => item.type === "INCOME").reduce((sum, item) => sum + Number(item.amount), 0);
      const expense = inMonth.filter((item) => item.type === "EXPENSE").reduce((sum, item) => sum + Number(item.amount), 0);

      return { month: key, income: income.toFixed(2), expense: expense.toFixed(2), balance: (income - expense).toFixed(2) };
    });

    return {
      period: { month: null, year: null, label: "Semua waktu", startDate: null, endDate: null },
      availablePeriods: { years: [...new Set([now.getFullYear(), ...transactions.map((item) => new Date(item.date).getFullYear())])] },
      totalIncome: sum("INCOME").toFixed(2),
      totalExpense: sum("EXPENSE").toFixed(2),
      balance: (sum("INCOME") - sum("EXPENSE")).toFixed(2),
      safeBalanceLimit: "0.00",
      isBelowSafeLimit: false,
      safeToSpend: {
        status: transactions.length > 0 ? "SAFE" : "UNKNOWN",
        spendingPaceStatus: "ON_TRACK",
        netCashflow: 0,
        safeBalanceLimit: 0,
        availableToSpend: 1_240_500,
        remainingDays: 14,
        suggestedDailyLimit: 82_000,
        expenseToIncomeRatio: null,
        monthProgressPercent: 50,
        expensePacePercent: null,
        projectedMonthEndExpense: 0,
        projectedNetCashflow: 0,
        topRiskCategoryName: null,
        topRiskCategoryAmount: 0,
        reason: "",
        action: "",
        warnings: []
      },
      financialCheckup: null,
      habit: transactions.length > 0 ? { currentStreakDays: 12, lastTransactionDate: transactions[0].date } : null,
      incomeThisMonth: "0.00",
      expenseThisMonth: "0.00",
      balanceThisMonth: "0.00",
      transactionCount: transactions.length,
      recentTransactions: [],
      expenseByCategory: byCategory(inPeriod, "EXPENSE"),
      incomeByCategory: byCategory(inPeriod, "INCOME"),
      monthlyTrend
    };
  }

  function listTransactions(url: URL) {
    const params = url.searchParams;
    const page = Number(params.get("page") ?? 1);
    const limit = Number(params.get("limit") ?? 10);
    const start = params.get("startDate");
    const end = params.get("endDate");
    const type = params.get("type");
    const filtered = transactions
      .filter((item) => (!start || item.date >= start) && (!end || item.date <= end))
      .filter((item) => !type || item.type === type)
      .sort((first, second) => second.date.localeCompare(first.date) || second.createdAt.localeCompare(first.createdAt));
    const totalPages = Math.ceil(filtered.length / limit);

    return {
      items: filtered.slice((page - 1) * limit, page * limit),
      pagination: { page, limit, total: filtered.length, totalPages }
    };
  }

  function respond(status: number, data: unknown, message = "OK") {
    const body = status < 400 ? { success: true, message, data } : { success: false, message };
    return new Response(JSON.stringify(body), {
      status,
      headers: { "content-type": "application/json" }
    });
  }

  function route(method: string, url: URL, body: unknown): Response {
    const path = url.pathname;
    const idMatch = path.match(/^\/api\/transactions\/([^/]+)$/);

    if (method === "GET" && path === "/api/transactions") {
      return scenario.failList ? respond(503, null, "Server sedang istirahat") : respond(200, listTransactions(url));
    }

    if (method === "POST" && path === "/api/transactions/bulk") {
      const created = (body as { transactions: Parameters<typeof toTransaction>[0][] }).transactions.map(toTransaction);
      transactions = [...created, ...transactions];
      return respond(201, created);
    }

    if (method === "POST" && path === "/api/transactions") {
      const created = toTransaction(body as Parameters<typeof toTransaction>[0]);
      transactions = [created, ...transactions];
      return respond(201, created);
    }

    if (idMatch && method === "PUT") {
      const current = transactions.find((item) => item.id === idMatch[1]);

      if (!current) {
        return respond(404, null, "Transaksi tidak ditemukan");
      }

      const patch = body as Partial<Parameters<typeof toTransaction>[0]>;
      const next = {
        ...toTransaction({
          type: patch.type ?? current.type,
          amount: patch.amount ?? current.amount,
          categoryId: patch.categoryId ?? current.categoryId,
          accountId: patch.accountId ?? current.account?.id,
          date: patch.date ?? current.date,
          note: patch.note === undefined ? current.note : patch.note
        }),
        id: current.id,
        createdAt: current.createdAt
      };
      transactions = transactions.map((item) => (item.id === current.id ? next : item));
      return respond(200, next);
    }

    if (idMatch && method === "DELETE") {
      const current = transactions.find((item) => item.id === idMatch[1]);
      transactions = transactions.filter((item) => item.id !== idMatch[1]);
      return current ? respond(200, current) : respond(404, null, "Transaksi tidak ditemukan");
    }

    if (method === "GET" && path === "/api/categories") {
      const type = url.searchParams.get("type");
      return respond(200, categories.filter((item) => !type || item.type === type));
    }

    if (method === "POST" && path === "/api/categories") {
      const input = body as Pick<Category, "name" | "type" | "icon" | "limit">;

      if (categories.some((item) => item.name.toLowerCase() === input.name.toLowerCase() && item.type === input.type)) {
        return respond(409, null, "Kategori dengan nama ini sudah ada");
      }

      const created: Category = { ...input, id: `dev-cat-${nextId++}`, color: null, isDefault: false, limit: input.limit ?? null };
      categories.push(created);
      return respond(201, created);
    }

    const limitMatch = path.match(/^\/api\/categories\/([^/]+)\/limit$/);

    if (limitMatch && method === "PUT") {
      const category = categories.find((item) => item.id === limitMatch[1]);

      if (!category) {
        return respond(404, null, "Kategori tidak ditemukan");
      }

      category.limit = (body as { limit: number | null }).limit;
      return respond(200, category);
    }

    if (method === "GET" && path === "/api/accounts") {
      return respond(200, accounts);
    }

    if (method === "GET" && path === "/api/summary") {
      return respond(200, buildSummary(url));
    }

    if (method === "GET" && path === "/api/goals") {
      return respond(200, []);
    }

    return respond(404, null, "Belum tersedia di pratinjau");
  }

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input), window.location.origin);

    if (!url.pathname.startsWith("/api/")) {
      return originalFetch(input, init);
    }

    if (scenario.slow) {
      await new Promise((resolve) => setTimeout(resolve, 1_500));
    }

    const method = (init?.method ?? "GET").toUpperCase();
    const body = typeof init?.body === "string" ? JSON.parse(init.body) : undefined;
    return route(method, url, body);
  };
}
