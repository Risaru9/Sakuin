import jwt from "jsonwebtoken";
import { afterEach, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { env } from "../src/config/env.js";
import { prisma } from "../src/db/prisma.js";
import type { AiChatResponse } from "../src/modules/ai/ai.types.js";

type ApiSuccessResponse<T> = {
  success: true;
  message: string;
  data: T;
};

type ApiErrorResponse = {
  success: false;
  message: string;
  errors: unknown;
};

async function readJson<T>(response: Response): Promise<T> {
  return (await response.json()) as T;
}

function createTestToken(userId: string) {
  return jwt.sign(
    {
      userId
    },
    env.JWT_SECRET,
    {
      expiresIn: 60 * 60
    }
  );
}

function createUniqueEmail(label: string) {
  return `sakuin+ai-chat-api-${label}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2)}@example.com`;
}

async function createTestUser(label: string) {
  return prisma.user.create({
    data: {
      name: "AI Test User",
      email: createUniqueEmail(label),
      passwordHash: "hashed-password-for-ai-test"
    }
  });
}

afterEach(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        contains: "sakuin+ai-chat-api-"
      }
    }
  });
});

describe("AI Chat API", () => {
  it("POST /api/ai/chat gagal tanpa token", async () => {
    const response = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "pengeluaran saya bulan ini gimana?"
      })
    });

    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(401);
    expect(body.success).toBe(false);
  });

  it("POST /api/ai/chat menolak pesan kosong", async () => {
    const user = await createTestUser("empty-message");
    const token = createTestToken(user.id);

    const response = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "   "
      })
    });

    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(JSON.stringify(body.errors)).toContain("Pesan wajib diisi");
  });

  it("POST /api/ai/chat menolak pesan terlalu panjang", async () => {
    const user = await createTestUser("long-message");
    const token = createTestToken(user.id);

    const response = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "a".repeat(1001)
      })
    });

    const body = await readJson<ApiErrorResponse>(response);

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(JSON.stringify(body.errors)).toContain(
      "Pesan maksimal 1000 karakter"
    );
  });

  it("POST /api/ai/chat membalas out-of-scope tanpa data sensitif", async () => {
    const user = await createTestUser("out-of-scope");
    const token = createTestToken(user.id);

    const response = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "buatkan cerpen tentang kerajaan"
      })
    });

    const body = await readJson<ApiSuccessResponse<AiChatResponse>>(response);
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.intent).toBe("OUT_OF_SCOPE");
    expect(body.data.reply).toContain("Asisten Sakuin hanya bisa membantu");
    expect(body.data.cards).toEqual([]);
    expect(body.data.suggestions.length).toBeGreaterThan(0);

    expect(serializedBody).not.toContain(user.id);
    expect(serializedBody).not.toContain(user.email);
    expect(serializedBody).not.toContain(token);
  });

  it("POST /api/ai/chat membalas financial intent dengan contract response", async () => {
    const user = await createTestUser("financial-summary");
    const token = createTestToken(user.id);

    const response = await app.request("/api/ai/chat", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message: "pengeluaran saya bulan ini gimana?"
      })
    });

    const body = await readJson<ApiSuccessResponse<AiChatResponse>>(response);
    const serializedBody = JSON.stringify(body);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.intent).toBe("SPENDING_ANALYSIS");
    expect(body.data.reply).toContain("menganalisis pengeluaran");
    expect(body.data.cards).toEqual([
      {
        label: "Topik",
        value: "Analisis Pengeluaran"
      },
      {
        label: "Status",
        value: "Siap dihubungkan ke data Sakuin"
      }
    ]);
    expect(body.data.suggestions).toContain("Saya boros di mana?");

    expect(serializedBody).not.toContain(user.id);
    expect(serializedBody).not.toContain(user.email);
    expect(serializedBody).not.toContain(token);
  });
});