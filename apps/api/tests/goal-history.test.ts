import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";

type ApiResponse<T = unknown> = {
  success: boolean;
  message: string;
  data: T;
  errors?: unknown;
};

type GoalHistoryData = {
  id: string;
  amount: string;
  currentAmount: string;
  createdAt: string;
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
  history?: GoalHistoryData[];
  createdAt: string;
  updatedAt: string;
};

const testRunId = Date.now();

const testUser = {
  name: "Goal History User",
  email: `goal-hist-${testRunId}@example.com`,
  password: "Password123"
};

let token = "";
let userId = "";

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

beforeAll(async () => {
  const regRes = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(testUser)
  });
  const regBody = await parseJson<any>(regRes);
  expect(regRes.status).toBe(201);
  token = regBody.data.token;
  userId = regBody.data.user.id;
}, 60000);

afterAll(async () => {
  if (userId) {
    await prisma.user.delete({
      where: { id: userId }
    });
  }
  await prisma.$disconnect();
}, 30000);

describe("Goal History API", () => {
  it("Pencatatan riwayat ketika membuat goal dengan currentAmount > 0 dan update nominal", async () => {
    // 1. Create goal with initial currentAmount = 500,000
    const createRes = await app.request("/api/goals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        name: "Dana Laptop",
        targetAmount: "2000000",
        currentAmount: "500000"
      })
    });
    const createBody = await parseJson<GoalData>(createRes);
    expect(createRes.status).toBe(201);
    const goalId = createBody.data.id;

    // 2. Fetch details and verify history has 1 entry
    const getRes = await app.request(`/api/goals/${goalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const getBody = await parseJson<GoalData>(getRes);
    expect(getRes.status).toBe(200);
    expect(getBody.data.history).toHaveLength(1);
    expect(getBody.data.history?.[0].amount).toBe("500000.00");
    expect(getBody.data.history?.[0].currentAmount).toBe("500000.00");

    // 3. Update nominal tabungan by adding Rp 300,000 (total currentAmount = 800,000)
    const updateRes = await app.request(`/api/goals/${goalId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({
        currentAmount: "800000"
      })
    });
    const updateBody = await parseJson<GoalData>(updateRes);
    expect(updateRes.status).toBe(200);

    // 4. Fetch details again and verify history contains 2 entries (newest first)
    const getRes2 = await app.request(`/api/goals/${goalId}`, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`
      }
    });
    const getBody2 = await parseJson<GoalData>(getRes2);
    expect(getBody2.data.history).toHaveLength(2);
    
    // Newest transaction (adding Rp 300,000)
    expect(getBody2.data.history?.[0].amount).toBe("300000.00");
    expect(getBody2.data.history?.[0].currentAmount).toBe("800000.00");

    // Oldest transaction (initial Rp 500,000)
    expect(getBody2.data.history?.[1].amount).toBe("500000.00");
    expect(getBody2.data.history?.[1].currentAmount).toBe("500000.00");
  });
});
