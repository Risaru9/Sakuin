import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import { loginUser, loginWithGoogle } from "../src/modules/auth/auth.service.js";
import type { GoogleIdTokenVerifier } from "../src/utils/google-id-token.js";
import { HttpError } from "../src/utils/http-error.js";

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

const testRunId = Date.now();
const testEmails: string[] = [];

function createVerifiedGoogleVerifier({
  providerAccountId,
  email,
  name = "Google Test User"
}: {
  providerAccountId: string;
  email: string;
  name?: string;
}): GoogleIdTokenVerifier {
  return async () => ({
    providerAccountId,
    email,
    emailVerified: true,
    name,
    pictureUrl: null
  });
}

function createUnverifiedGoogleVerifier({
  providerAccountId,
  email
}: {
  providerAccountId: string;
  email: string;
}): GoogleIdTokenVerifier {
  return async () => ({
    providerAccountId,
    email,
    emailVerified: false,
    name: "Unverified Google User",
    pictureUrl: null
  });
}

async function parseJson<T>(response: Response) {
  return (await response.json()) as ApiResponse<T>;
}

async function registerPasswordUser({
  name,
  email,
  password = "Password123"
}: {
  name: string;
  email: string;
  password?: string;
}) {
  testEmails.push(email);

  const response = await app.request("/api/auth/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      name,
      email,
      password
    })
  });

  const body = await parseJson<AuthData>(response);

  expect(response.status).toBe(201);
  expect(body.success).toBe(true);

  return body.data;
}

afterAll(async () => {
  await prisma.user.deleteMany({
    where: {
      email: {
        in: testEmails
      }
    }
  });

  await prisma.$disconnect();
}, 30000);

describe("Google Auth Service", () => {
  it("membuat user baru dari Google identity yang verified", async () => {
    const email = `google-new-${testRunId}@example.com`;

    testEmails.push(email);

    const result = await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      createVerifiedGoogleVerifier({
        providerAccountId: `google-sub-new-${testRunId}`,
        email,
        name: "Google New User"
      })
    );

    expect(result.token).toBeTruthy();
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Google New User");

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      select: {
        id: true,
        passwordHash: true,
        oauthAccounts: true
      }
    });

    expect(user).not.toBeNull();
    expect(user?.passwordHash).toBeNull();
    expect(user?.oauthAccounts).toHaveLength(1);
    expect(user?.oauthAccounts[0].provider).toBe("google");
    expect(user?.oauthAccounts[0].providerAccountId).toBe(
      `google-sub-new-${testRunId}`
    );
  });

  it("login ulang memakai OAuthAccount yang sudah terhubung", async () => {
    const email = `google-existing-oauth-${testRunId}@example.com`;
    const providerAccountId = `google-sub-existing-${testRunId}`;

    testEmails.push(email);

    const firstLogin = await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      createVerifiedGoogleVerifier({
        providerAccountId,
        email,
        name: "Google Existing User"
      })
    );

    const secondLogin = await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      createVerifiedGoogleVerifier({
        providerAccountId,
        email,
        name: "Different Google Name"
      })
    );

    expect(secondLogin.token).toBeTruthy();
    expect(secondLogin.user.id).toBe(firstLogin.user.id);
    expect(secondLogin.user.email).toBe(email);
    expect(secondLogin.user.name).toBe("Google Existing User");

    const oauthAccounts = await prisma.oauthAccount.findMany({
      where: {
        userId: firstLogin.user.id,
        provider: "google"
      }
    });

    expect(oauthAccounts).toHaveLength(1);
  });

  it("menghubungkan Google account ke user email/password existing jika email verified sama", async () => {
    const email = `google-link-${testRunId}@example.com`;
    const passwordUser = await registerPasswordUser({
      name: "Password User",
      email
    });

    const result = await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      createVerifiedGoogleVerifier({
        providerAccountId: `google-sub-link-${testRunId}`,
        email,
        name: "Google Linked Name"
      })
    );

    expect(result.token).toBeTruthy();
    expect(result.user.id).toBe(passwordUser.user.id);
    expect(result.user.email).toBe(email);
    expect(result.user.name).toBe("Password User");

    const oauthAccounts = await prisma.oauthAccount.findMany({
      where: {
        userId: passwordUser.user.id,
        provider: "google"
      }
    });

    expect(oauthAccounts).toHaveLength(1);
    expect(oauthAccounts[0].providerAccountId).toBe(
      `google-sub-link-${testRunId}`
    );
  });

  it("menolak Google identity jika email belum verified", async () => {
    const email = `google-unverified-${testRunId}@example.com`;

    await expect(
      loginWithGoogle(
        {
          credential: "fake-google-credential"
        },
        createUnverifiedGoogleVerifier({
          providerAccountId: `google-sub-unverified-${testRunId}`,
          email
        })
      )
    ).rejects.toMatchObject({
      message: "Google email belum terverifikasi",
      statusCode: 401
    });

    const user = await prisma.user.findUnique({
      where: {
        email
      }
    });

    expect(user).toBeNull();
  });

  it("user Google-only tidak bisa login password sebelum membuat password Sakuin", async () => {
    const email = `google-only-password-${testRunId}@example.com`;

    testEmails.push(email);

    await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      createVerifiedGoogleVerifier({
        providerAccountId: `google-sub-password-${testRunId}`,
        email,
        name: "Google Only User"
      })
    );

    await expect(
      loginUser({
        email,
        password: "Password123"
      })
    ).rejects.toBeInstanceOf(HttpError);

    await expect(
      loginUser({
        email,
        password: "Password123"
      })
    ).rejects.toMatchObject({
      message: "Email atau password salah",
      statusCode: 401
    });
  });
});