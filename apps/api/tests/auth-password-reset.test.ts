import { afterAll, describe, expect, it } from "vitest";
import { app } from "../src/app.js";
import { prisma } from "../src/db/prisma.js";
import {
  FORGOT_PASSWORD_SUCCESS_MESSAGE,
  loginUser,
  loginWithGoogle,
  requestPasswordReset,
  resetPassword
} from "../src/modules/auth/auth.service.js";
import type { PasswordResetEmailInput } from "../src/utils/password-reset-email.js";

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

function createCapturingEmailSender(capturedEmails: PasswordResetEmailInput[]) {
  return async (input: PasswordResetEmailInput) => {
    capturedEmails.push(input);
  };
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

describe("Password Reset API", () => {
  it("POST /api/auth/forgot-password selalu mengembalikan pesan generic untuk email tidak terdaftar", async () => {
    const response = await app.request("/api/auth/forgot-password", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        email: `unknown-${testRunId}@example.com`
      })
    });

    const body = await parseJson<null>(response);

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.message).toBe(FORGOT_PASSWORD_SUCCESS_MESSAGE);
    expect(body.data).toBeNull();
  });

  it("membuat reset token hash dan mengirim token asli lewat email sender", async () => {
    const email = `reset-token-${testRunId}@example.com`;
    const capturedEmails: PasswordResetEmailInput[] = [];

    await registerPasswordUser({
      name: "Reset Token User",
      email
    });

    await requestPasswordReset(
      {
        email
      },
      createCapturingEmailSender(capturedEmails)
    );

    expect(capturedEmails).toHaveLength(1);
    expect(capturedEmails[0].to).toBe(email);
    expect(capturedEmails[0].token).toBeTruthy();

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      select: {
        resetPasswordToken: true,
        resetPasswordExpires: true
      }
    });

    expect(user?.resetPasswordToken).toBeTruthy();
    expect(user?.resetPasswordExpires).toBeInstanceOf(Date);
    expect(user?.resetPasswordToken).not.toBe(capturedEmails[0].token);
  });

  it("berhasil reset password dan token tidak bisa dipakai ulang", async () => {
    const email = `reset-success-${testRunId}@example.com`;
    const capturedEmails: PasswordResetEmailInput[] = [];

    await registerPasswordUser({
      name: "Reset Success User",
      email,
      password: "Password123"
    });

    await requestPasswordReset(
      {
        email
      },
      createCapturingEmailSender(capturedEmails)
    );

    const token = capturedEmails[0].token;

    await resetPassword({
      token,
      password: "NewPassword123"
    });

    const loginResult = await loginUser({
      email,
      password: "NewPassword123"
    });

    expect(loginResult.token).toBeTruthy();
    expect(loginResult.user.email).toBe(email);

    const user = await prisma.user.findUnique({
      where: {
        email
      },
      select: {
        resetPasswordToken: true,
        resetPasswordExpires: true
      }
    });

    expect(user?.resetPasswordToken).toBeNull();
    expect(user?.resetPasswordExpires).toBeNull();

    await expect(
      resetPassword({
        token,
        password: "AnotherPassword123"
      })
    ).rejects.toMatchObject({
      message: "Token reset password tidak valid atau sudah kedaluwarsa",
      statusCode: 400
    });
  });

  it("menolak token reset password yang sudah expired", async () => {
    const email = `reset-expired-${testRunId}@example.com`;
    const capturedEmails: PasswordResetEmailInput[] = [];

    const auth = await registerPasswordUser({
      name: "Reset Expired User",
      email
    });

    await requestPasswordReset(
      {
        email
      },
      createCapturingEmailSender(capturedEmails)
    );

    await prisma.user.update({
      where: {
        id: auth.user.id
      },
      data: {
        resetPasswordExpires: new Date(Date.now() - 60 * 1000)
      }
    });

    await expect(
      resetPassword({
        token: capturedEmails[0].token,
        password: "NewPassword123"
      })
    ).rejects.toMatchObject({
      message: "Token reset password tidak valid atau sudah kedaluwarsa",
      statusCode: 400
    });
  });

  it("Google-only user bisa membuat password lewat reset password", async () => {
    const email = `google-reset-${testRunId}@example.com`;
    const capturedEmails: PasswordResetEmailInput[] = [];

    testEmails.push(email);

    await loginWithGoogle(
      {
        credential: "fake-google-credential"
      },
      async () => ({
        providerAccountId: `google-reset-sub-${testRunId}`,
        email,
        emailVerified: true,
        name: "Google Reset User",
        pictureUrl: null
      })
    );

    await expect(
      loginUser({
        email,
        password: "NewPassword123"
      })
    ).rejects.toMatchObject({
      message: "Email atau password salah",
      statusCode: 401
    });

    await requestPasswordReset(
      {
        email
      },
      createCapturingEmailSender(capturedEmails)
    );

    await resetPassword({
      token: capturedEmails[0].token,
      password: "NewPassword123"
    });

    const loginResult = await loginUser({
      email,
      password: "NewPassword123"
    });

    expect(loginResult.token).toBeTruthy();
    expect(loginResult.user.email).toBe(email);
  });
});