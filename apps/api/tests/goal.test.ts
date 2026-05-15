import { afterAll, beforeAll, describe, expect, it } from "vitest";
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

type GoalData = {
  id: string;
  name: string;
  targetAmount: string;
  currentAmount: string;
  progressPercentage: number;
  remainingAmount: string;
  isCompleted: boolean;
  deadline: string | null;
  isOverdue: boolean;
  createdAt: string;
  updatedAt: string;
};

const testRunId = Date.now();

const userA = {
  name: "Goal Test User A",
  email: `goal-user-a-${testRunId}@example.com`,
  password: "Password123"
};

const userB = {
  name: "Goal Test User B",
  email: `goal-user-b-${testRunId}@example.com`,
  password: "Password123"
};

let tokenA = "";
let tokenB = "";
let userAId = "";
let userBId = "";
let userAGoalId = "";
let userBGoalId = "";
let goalForDeleteId = "";

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

async function createGoal(
  token: string,
  payload?: Partial<{
    name: string;
    targetAmount: string;
    currentAmount: string;
    deadline: string | null;
  }>
) {
  const response = await app.request("/api/goals", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      name: payload?.name ?? "Dana Darurat",
      targetAmount: payload?.targetAmount ?? "10000000",
      currentAmount: payload?.currentAmount ?? "2500000",
      deadline:
        payload?.deadline === undefined
          ? "2026-12-31T00:00:00.000Z"
          : payload.deadline
    })
  });

  return {
    response,
    body: await parseJson<GoalData>(response)
  };
}

beforeAll(async () => {
  const authA = await registerUser(userA);
  const authB = await registerUser(userB);

  tokenA = authA.token;
  tokenB = authB.token;
  userAId = authA.user.id;
  userBId = authB.user.id;

  const userAGoal = await createGoal(tokenA, {
    name: "Goal User A",
    targetAmount: "10000000",
    currentAmount: "2500000"
  });

  expect(userAGoal.response.status).toBe(201);
  userAGoalId = userAGoal.body.data.id;

  const userBGoal = await createGoal(tokenB, {
    name: "Goal User B",
    targetAmount: "9000000",
    currentAmount: "3000000"
  });

  expect(userBGoal.response.status).toBe(201);
  userBGoalId = userBGoal.body.data.id;

  const goalForDelete = await createGoal(tokenA, {
    name: "Goal Untuk Delete",
    targetAmount: "5000000",
    currentAmount: "1000000"
  });

  expect(goalForDelete.response.status).toBe(201);
  goalForDeleteId = goalForDelete.body.data.id;
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

describe("Goal API", () => {
  it("Create goal berhasil", async () => {
    const { response, body } = await createGoal(tokenA, {
      name: "Beli Laptop",
      targetAmount: "10000000",
      currentAmount: "2500000",
      deadline: "2026-12-31T00:00:00.000Z"
    });

    expect(response.status).toBe(201);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Goal berhasil dibuat");
    expect(body.data.name).toBe("Beli Laptop");
    expect(body.data.targetAmount).toBe("10000000.00");
    expect(body.data.currentAmount).toBe("2500000.00");
    expect(body.data.progressPercentage).toBe(25);
    expect(body.data.remainingAmount).toBe("7500000.00");
    expect(body.data.isCompleted).toBe(false);
    expect(body.data.isOverdue).toBe(false);
  });

  it("Create goal gagal tanpa token", async () => {
    const response = await app.request("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        name: "Goal Tanpa Token",
        targetAmount: "10000000",
        currentAmount: "2500000"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Authorization header wajib diisi");
  });

  it("Create goal gagal jika currentAmount lebih besar dari targetAmount", async () => {
    const response = await app.request("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Goal Tidak Valid",
        targetAmount: "1000000",
        currentAmount: "2000000"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Current amount tidak boleh lebih besar dari target amount"
    );
  });

  it("Get goals hanya menampilkan goal milik user login", async () => {
    const response = await app.request("/api/goals", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<GoalData[]>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.length).toBeGreaterThan(0);

    const goalIds = body.data.map((goal) => goal.id);

    expect(goalIds).toContain(userAGoalId);
    expect(goalIds).not.toContain(userBGoalId);
  });

  it("Get detail goal milik sendiri berhasil", async () => {
    const response = await app.request(`/api/goals/${userAGoalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<GoalData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Detail goal berhasil diambil");
    expect(body.data.id).toBe(userAGoalId);
    expect(body.data.name).toBe("Goal User A");
  });

  it("Get detail goal user lain gagal", async () => {
    const response = await app.request(`/api/goals/${userBGoalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Goal tidak ditemukan");
  });

  it("Update goal milik sendiri berhasil", async () => {
    const response = await app.request(`/api/goals/${userAGoalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Goal User A Updated",
        currentAmount: "5000000"
      })
    });

    const body = await parseJson<GoalData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Goal berhasil diupdate");
    expect(body.data.id).toBe(userAGoalId);
    expect(body.data.name).toBe("Goal User A Updated");
    expect(body.data.currentAmount).toBe("5000000.00");
    expect(body.data.progressPercentage).toBe(50);
    expect(body.data.remainingAmount).toBe("5000000.00");
  });

  it("Update goal user lain gagal", async () => {
    const response = await app.request(`/api/goals/${userBGoalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        name: "Mencoba Update Goal User Lain",
        currentAmount: "5000000"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Goal tidak ditemukan");
  });

  it("Update goal gagal jika currentAmount lebih besar dari targetAmount", async () => {
    const response = await app.request(`/api/goals/${userAGoalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${tokenA}`
      },
      body: JSON.stringify({
        currentAmount: "20000000"
      })
    });

    const body = await parseJson(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.message).toBe(
      "Current amount tidak boleh lebih besar dari target amount"
    );
  });

  it("Delete goal milik sendiri berhasil", async () => {
    const response = await app.request(`/api/goals/${goalForDeleteId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson<GoalData>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe("Goal berhasil dihapus");
    expect(body.data.id).toBe(goalForDeleteId);
  });

  it("Delete goal user lain gagal", async () => {
    const response = await app.request(`/api/goals/${userBGoalId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Goal tidak ditemukan");
  });

  it("Goal yang sudah dihapus tidak bisa diambil lagi", async () => {
    const response = await app.request(`/api/goals/${goalForDeleteId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`
      }
    });

    const body = await parseJson(response);

    expect(response.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.message).toBe("Goal tidak ditemukan");
  });
});