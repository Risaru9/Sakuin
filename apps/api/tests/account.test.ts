import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { resetRateLimitStore } from "../src/middlewares/rate-limit.middleware.js";

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
};

type AuthData = {
  token: string;
  user: {
    id: string;
  };
};

type AccountData = {
  id: string;
  name: string;
  balance: string;
  initialBalance: string;
};

const testRunId = Date.now();
let userA: AuthData;
let userB: AuthData;
let defaultAccountA: AccountData;
let defaultAccountB: AccountData;
let bankAccountA: AccountData;

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerUser(label: string) {
  const ipSuffix = label === "a" ? 71 : label === "b" ? 72 : 73;
  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Forwarded-For": `198.51.100.${ipSuffix}`
    },
    body: JSON.stringify({
      name: `Account User ${label.toUpperCase()}`,
      email: `account-${label}-${testRunId}@example.com`,
      password: "Password123"
    })
  });

  expect(response.status).toBe(201);
  return (await parseJson<AuthData>(response)).data;
}

async function getAccounts(token: string) {
  const response = await app.request("/api/accounts", {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  expect(response.status).toBe(200);
  return (await parseJson<AccountData[]>(response)).data;
}

beforeAll(async () => {
  resetRateLimitStore();
  userA = await registerUser("a");
  userB = await registerUser("b");
  [defaultAccountA] = await getAccounts(userA.token);
  [defaultAccountB] = await getAccounts(userB.token);
});

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      id: {
        in: [userA?.user.id, userB?.user.id].filter(Boolean)
      }
    }
  });
  await prisma.$disconnect();
});

describe("Account API", () => {
  it("membuat rekening default untuk user baru", () => {
    expect(defaultAccountA.name).toBe("Dompet Utama");
    expect(defaultAccountA.balance).toBe("0");
  });

  it("membuat rekening dan menghitung transaksi serta transfer", async () => {
    const createResponse = await app.request("/api/accounts", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        name: "BRI",
        type: "BANK",
        initialBalance: "500000",
        icon: "landmark",
        color: "#1d4ed8"
      })
    });

    expect(createResponse.status).toBe(201);
    bankAccountA = (await parseJson<AccountData>(createResponse)).data;

    const transactionResponse = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        accountId: bankAccountA.id,
        categoryId: "cat_expense_food",
        type: "EXPENSE",
        amount: "50000",
        note: "Belanja dari rekening BRI",
        date: new Date().toISOString()
      })
    });

    expect(transactionResponse.status).toBe(201);

    const transferResponse = await app.request("/api/accounts/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        fromAccountId: bankAccountA.id,
        toAccountId: defaultAccountA.id,
        amount: "100000",
        note: "Isi uang tunai",
        date: new Date().toISOString()
      })
    });

    expect(transferResponse.status).toBe(201);

    const accounts = await getAccounts(userA.token);
    const bank = accounts.find((account) => account.id === bankAccountA.id);
    const wallet = accounts.find(
      (account) => account.id === defaultAccountA.id
    );

    expect(bank?.balance).toBe("350000");
    expect(wallet?.balance).toBe("100000");
  });

  it("menolak rekening milik user lain pada transaksi dan transfer", async () => {
    const transactionResponse = await app.request("/api/transactions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        accountId: defaultAccountB.id,
        categoryId: "cat_expense_food",
        type: "EXPENSE",
        amount: "1000",
        date: new Date().toISOString()
      })
    });

    expect(transactionResponse.status).toBe(404);

    const transferResponse = await app.request("/api/accounts/transfers", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${userA.token}`
      },
      body: JSON.stringify({
        fromAccountId: bankAccountA.id,
        toAccountId: defaultAccountB.id,
        amount: "1000",
        date: new Date().toISOString()
      })
    });

    expect(transferResponse.status).toBe(404);
  });

  it("mengarsipkan, menampilkan arsip, lalu mengaktifkan lagi rekening", async () => {
    const headers = {
      Authorization: `Bearer ${userA.token}`
    };

    const archiveResponse = await app.request(`/api/accounts/${bankAccountA.id}`, {
      method: "DELETE",
      headers
    });
    expect(archiveResponse.status).toBe(200);

    const activeAccounts = await getAccounts(userA.token);
    expect(activeAccounts.some((account) => account.id === bankAccountA.id)).toBe(false);

    const withArchivedResponse = await app.request("/api/accounts?includeArchived=true", {
      headers
    });
    expect(withArchivedResponse.status).toBe(200);
    const withArchived = (
      await parseJson<Array<AccountData & { isArchived: boolean }>>(withArchivedResponse)
    ).data;
    const archivedBank = withArchived.find((account) => account.id === bankAccountA.id);
    expect(archivedBank?.isArchived).toBe(true);
    expect(archivedBank?.balance).toBe("350000");

    const otherUserRestore = await app.request(`/api/accounts/${bankAccountA.id}/restore`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userB.token}`
      }
    });
    expect(otherUserRestore.status).toBe(404);

    const restoreResponse = await app.request(`/api/accounts/${bankAccountA.id}/restore`, {
      method: "POST",
      headers
    });
    expect(restoreResponse.status).toBe(200);

    const restoredAccounts = await getAccounts(userA.token);
    expect(restoredAccounts.some((account) => account.id === bankAccountA.id)).toBe(true);
  });

  it("mengembalikan 404 saat token merujuk ke user yang sudah tidak ada", async () => {
    const deletedUser = await registerUser("deleted");

    await prisma.user.delete({
      where: {
        id: deletedUser.user.id
      }
    });

    const response = await app.request("/api/accounts", {
      headers: {
        Authorization: `Bearer ${deletedUser.token}`
      }
    });
    const payload = await parseJson<null>(response);

    expect(response.status).toBe(404);
    expect(payload.message).toBe("User tidak ditemukan");
  });
});
