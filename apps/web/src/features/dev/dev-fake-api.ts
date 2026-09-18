// Development-only in-memory API for the /dev/beranda, /dev/cari, /dev/laporan and
// /dev/lainnya(/...) previews. It answers the requests those screens make, so their flows can be
// tried without a server or real data.
// Scenario flags come from the URL the preview is first opened with:
//   ?kosong=1  a brand-new user without entries
//   ?lambat=1  every answer takes 1.5 seconds
//   ?gagal=1   loading the transaction list fails

import type { AccountTransfer, FinanceAccount } from "../accounts/account.types";
import type { Category } from "../categories/category.types";
import type { Goal } from "../goals/goal.types";
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
    ["acc-dompet", "Dompet Utama", "CASH", 250000, false],
    ["acc-bca", "BCA", "BANK", 3500000, false],
    ["acc-gopay", "GoPay", "E_WALLET", 90000, false],
    ["acc-jenius", "Jenius", "BANK", 120000, true]
  ]
    .filter(([, , , , archived]) => !scenario.empty || !archived)
    .map(([id, name, type, initialBalance, archived]) => ({
      id: String(id),
      name: String(name),
      type: type as FinanceAccount["type"],
      icon: null,
      color: null,
      initialBalance: String(initialBalance),
      balance: String(initialBalance),
      transactionCount: 0,
      isArchived: Boolean(archived),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

  let transfers: AccountTransfer[] = [];

  function daysFromNowIso(days: number) {
    return new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
  }

  let goals: Goal[] = scenario.empty
    ? []
    : [
        ["dev-goal-laptop", "Laptop baru", 8_000_000, 3_200_000, daysFromNowIso(104)],
        ["dev-goal-darurat", "Dana darurat", 5_000_000, 1_500_000, null],
        ["dev-goal-konser", "Tiket konser", 750_000, 750_000, null]
      ].map(([id, name, target, current, deadline]) => ({
        id: String(id),
        name: String(name),
        targetAmount: String(target),
        currentAmount: String(current),
        deadline: deadline ? String(deadline) : null,
        description: null,
        history: [
          { id: `${id}-h1`, amount: "500000", currentAmount: String(current), createdAt: daysFromNowIso(-17) },
          { id: `${id}-h2`, amount: "250000", currentAmount: String(Number(current) - 500000), createdAt: daysFromNowIso(-34) }
        ],
        createdAt: daysFromNowIso(-60),
        updatedAt: daysFromNowIso(-16)
      }));

  function accountSummary(account: FinanceAccount) {
    return { id: account.id, name: account.name, type: account.type, icon: account.icon, color: account.color };
  }

  /** Balances follow the entries and transfers, like the real server computes them. */
  function withBalances(list: FinanceAccount[]) {
    return list.map((account) => {
      const own = transactions.filter((item) => item.account?.id === account.id);
      const moved =
        own.reduce((sum, item) => sum + (item.type === "INCOME" ? 1 : -1) * Number(item.amount), 0) +
        transfers.reduce(
          (sum, item) =>
            sum +
            (item.toAccount.id === account.id ? Number(item.amount) : 0) -
            (item.fromAccount.id === account.id ? Number(item.amount) : 0),
          0
        );

      return {
        ...account,
        balance: String(Number(account.initialBalance) + moved),
        transactionCount: own.length
      };
    });
  }

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
          accountId: categoryId === "cat-gaji" || categoryId === "cat-bonus" ? "acc-bca" : "acc-dompet",
          date: localMidnightIso(daysAgo),
          note
        })
      );

  if (!scenario.empty) {
    const [, bca, gopay] = accounts;
    transfers = [
      {
        id: "dev-transfer-1",
        fromAccount: accountSummary(bca),
        toAccount: accountSummary(gopay),
        amount: "100000.00",
        note: "Top up GoPay",
        date: localMidnightIso(2),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }
    ];
  }

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
      const includeArchived = url.searchParams.get("includeArchived") === "true";
      return respond(200, withBalances(accounts.filter((item) => includeArchived || !item.isArchived)));
    }

    if (method === "GET" && path === "/api/accounts/transfers") {
      return respond(200, [...transfers].sort((first, second) => second.date.localeCompare(first.date)));
    }

    if (method === "POST" && path === "/api/accounts/transfers") {
      const input = body as { fromAccountId: string; toAccountId: string; amount: string; date: string; note?: string | null };
      const from = accounts.find((item) => item.id === input.fromAccountId && !item.isArchived);
      const to = accounts.find((item) => item.id === input.toAccountId && !item.isArchived);

      if (!from || !to || from.id === to.id) {
        return respond(404, null, "Rekening asal atau tujuan tidak ditemukan");
      }

      const now = new Date().toISOString();
      const created: AccountTransfer = {
        id: `dev-transfer-${nextId++}`,
        fromAccount: accountSummary(from),
        toAccount: accountSummary(to),
        amount: Number(input.amount).toFixed(2),
        note: input.note ?? null,
        date: input.date,
        createdAt: now,
        updatedAt: now
      };
      transfers = [created, ...transfers];
      return respond(201, created);
    }

    if (method === "POST" && path === "/api/accounts") {
      const input = body as Pick<FinanceAccount, "name" | "type" | "color"> & { initialBalance?: string };

      if (accounts.some((item) => item.name.toLowerCase() === input.name.toLowerCase())) {
        return respond(409, null, "Nama rekening sudah digunakan");
      }

      if (accounts.filter((item) => !item.isArchived).length >= 20) {
        return respond(400, null, "Maksimal 20 rekening aktif");
      }

      const now = new Date().toISOString();
      const created: FinanceAccount = {
        id: `dev-acc-${nextId++}`,
        name: input.name,
        type: input.type,
        icon: null,
        color: input.color ?? null,
        initialBalance: input.initialBalance ?? "0",
        balance: input.initialBalance ?? "0",
        transactionCount: 0,
        isArchived: false,
        createdAt: now,
        updatedAt: now
      };
      accounts.push(created);
      return respond(201, created);
    }

    const accountMatch = path.match(/^\/api\/accounts\/([^/]+)(\/restore)?$/);
    const account = accountMatch ? accounts.find((item) => item.id === accountMatch[1]) : undefined;

    if (accountMatch && !account) {
      return respond(404, null, "Rekening tidak ditemukan");
    }

    if (account && accountMatch?.[2] && method === "POST") {
      account.isArchived = false;
      return respond(200, account);
    }

    if (account && method === "PUT") {
      const patch = body as Partial<Pick<FinanceAccount, "name" | "type" | "color" | "initialBalance">>;

      if (patch.name && accounts.some((item) => item !== account && item.name.toLowerCase() === patch.name?.toLowerCase())) {
        return respond(409, null, "Nama rekening sudah digunakan");
      }

      Object.assign(account, patch, { updatedAt: new Date().toISOString() });
      return respond(200, withBalances([account])[0]);
    }

    if (account && method === "DELETE") {
      if (accounts.filter((item) => !item.isArchived).length <= 1) {
        return respond(400, null, "Minimal satu rekening harus tetap aktif");
      }

      account.isArchived = true;
      return respond(200, account);
    }

    if (method === "GET" && path === "/api/summary") {
      return respond(200, buildSummary(url));
    }

    if (method === "GET" && path === "/api/goals") {
      return respond(200, goals.map(({ history: _history, ...goal }) => goal));
    }

    if (method === "POST" && path === "/api/goals") {
      const input = body as { name: string; targetAmount: string; currentAmount?: string; deadline?: string | null };
      const now = new Date().toISOString();
      const current = input.currentAmount ?? "0";
      const created: Goal = {
        id: `dev-goal-${nextId++}`,
        name: input.name,
        targetAmount: input.targetAmount,
        currentAmount: current,
        deadline: input.deadline ? new Date(input.deadline).toISOString() : null,
        description: null,
        history: Number(current) > 0 ? [{ id: `dev-gh-${nextId++}`, amount: current, currentAmount: current, createdAt: now }] : [],
        createdAt: now,
        updatedAt: now
      };
      goals.push(created);
      return respond(201, created);
    }

    const goalMatch = path.match(/^\/api\/goals\/([^/]+)$/);
    const goal = goalMatch ? goals.find((item) => item.id === goalMatch[1]) : undefined;

    if (goalMatch && !goal) {
      return respond(404, null, "Goal tidak ditemukan");
    }

    if (goal && method === "GET") {
      return respond(200, goal);
    }

    if (goal && method === "PUT") {
      const patch = body as Partial<Pick<Goal, "name" | "targetAmount" | "currentAmount" | "deadline">>;
      const target = Number(patch.targetAmount ?? goal.targetAmount);
      const current = Number(patch.currentAmount ?? goal.currentAmount);

      if (current > target) {
        return respond(400, null, "Jumlah terkumpul tidak boleh melebihi target");
      }

      const now = new Date().toISOString();
      const diff = current - Number(goal.currentAmount);

      if (diff !== 0) {
        goal.history = [{ id: `dev-gh-${nextId++}`, amount: String(diff), currentAmount: String(current), createdAt: now }, ...(goal.history ?? [])];
      }

      Object.assign(goal, patch, {
        deadline: patch.deadline === undefined ? goal.deadline : patch.deadline ? new Date(patch.deadline).toISOString() : null,
        updatedAt: now
      });
      return respond(200, goal);
    }

    if (goal && method === "DELETE") {
      goals = goals.filter((item) => item !== goal);
      return respond(200, goal);
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
