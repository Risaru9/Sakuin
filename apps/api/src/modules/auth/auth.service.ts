import { createHash, randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import {
  verifyGoogleIdToken,
  type GoogleIdTokenVerifier,
  type VerifiedGoogleIdentity
} from "../../utils/google-id-token.js";
import { EmailSenderError } from "../../utils/email-sender.js";
import {
  sendPasswordResetEmail,
  type PasswordResetEmailSender
} from "../../utils/password-reset-email.js";
import type {
  AuthResponse,
  AuthUser,
  ForgotPasswordInput,
  GoogleLoginInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput
} from "./auth.types.js";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const RESET_PASSWORD_TOKEN_BYTES = 32;
const RESET_PASSWORD_EXPIRES_IN_MINUTES = 30;
const GOOGLE_PROVIDER = "google";

export const FORGOT_PASSWORD_SUCCESS_MESSAGE =
  "Jika email terdaftar, link reset password akan dikirim.";

type AuthUserEntity = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: { toNumber: () => number };
};

function toAuthUser(user: AuthUserEntity): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    safeBalanceLimit: user.safeBalanceLimit.toNumber()
  };
}

function signAccessToken(userId: string): string {
  return jwt.sign(
    {
      userId
    },
    env.JWT_SECRET,
    {
      expiresIn: TOKEN_EXPIRES_IN_SECONDS
    }
  );
}

function buildGoogleUserName(identity: VerifiedGoogleIdentity) {
  if (identity.name) {
    return identity.name;
  }

  const [emailName] = identity.email.split("@");

  return emailName || "Pengguna Google";
}

function createAuthResponse(user: AuthUserEntity): AuthResponse {
  return {
    token: signAccessToken(user.id),
    user: toAuthUser(user)
  };
}

function createPasswordResetToken() {
  return randomBytes(RESET_PASSWORD_TOKEN_BYTES).toString("hex");
}

function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function createPasswordResetExpiry() {
  const expiresAt = new Date();

  expiresAt.setMinutes(
    expiresAt.getMinutes() + RESET_PASSWORD_EXPIRES_IN_MINUTES
  );

  return expiresAt;
}

function hashEmailForLog(email: string) {
  return createHash("sha256")
    .update(email.trim().toLowerCase())
    .digest("hex");
}

function shouldWritePasswordResetDiagnosticLog() {
  return env.NODE_ENV !== "test";
}

function writePasswordResetLog(
  event: string,
  metadata: Record<string, string | number | boolean | null>
) {
  if (!shouldWritePasswordResetDiagnosticLog()) {
    return;
  }

  console.info(
    JSON.stringify({
      level: "info",
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    })
  );
}

function writePasswordResetErrorLog(
  event: string,
  metadata: Record<string, string | number | boolean | null>
) {
  if (!shouldWritePasswordResetDiagnosticLog()) {
    return;
  }

  console.error(
    JSON.stringify({
      level: "error",
      event,
      ...metadata,
      timestamp: new Date().toISOString()
    })
  );
}

function logPasswordResetEmailFailure(userId: string, error: unknown) {
  const status = error instanceof EmailSenderError ? error.status : 500;
  const reason =
    error instanceof EmailSenderError
      ? error.reason
      : "password_reset_email_unknown_error";

  writePasswordResetErrorLog("password_reset_email_failed", {
    userId,
    status,
    reason
  });
}

export async function registerUser(input: RegisterInput): Promise<AuthResponse> {
  const existingUser = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true
    }
  });

  if (existingUser) {
    throw new HttpError("Email sudah digunakan", 409);
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      name: input.name,
      email: input.email,
      passwordHash
    },
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true
    }
  });

  return createAuthResponse(user);
}

export async function loginUser(input: LoginInput): Promise<AuthResponse> {
  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true,
      name: true,
      email: true,
      passwordHash: true,
      safeBalanceLimit: true
    }
  });

  if (!user?.passwordHash) {
    throw new HttpError("Email atau password salah", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError("Email atau password salah", 401);
  }

  return createAuthResponse(user);
}

export async function loginWithGoogle(
  input: GoogleLoginInput,
  verifier: GoogleIdTokenVerifier = verifyGoogleIdToken
): Promise<AuthResponse> {
  const identity = await verifier(input.credential);

  if (!identity.emailVerified) {
    throw new HttpError("Google email belum terverifikasi", 401);
  }

  const existingOauthAccount = await prisma.oauthAccount.findUnique({
    where: {
      provider_providerAccountId: {
        provider: GOOGLE_PROVIDER,
        providerAccountId: identity.providerAccountId
      }
    },
    select: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          safeBalanceLimit: true
        }
      }
    }
  });

  if (existingOauthAccount) {
    return createAuthResponse(existingOauthAccount.user);
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      email: identity.email
    },
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true
    }
  });

  if (existingUser) {
    await prisma.oauthAccount.create({
      data: {
        userId: existingUser.id,
        provider: GOOGLE_PROVIDER,
        providerAccountId: identity.providerAccountId
      }
    });

    return createAuthResponse(existingUser);
  }

  const user = await prisma.user.create({
    data: {
      name: buildGoogleUserName(identity),
      email: identity.email,
      passwordHash: null,
      oauthAccounts: {
        create: {
          provider: GOOGLE_PROVIDER,
          providerAccountId: identity.providerAccountId
        }
      }
    },
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true
    }
  });

  return createAuthResponse(user);
}

export async function requestPasswordReset(
  input: ForgotPasswordInput,
  emailSender: PasswordResetEmailSender = sendPasswordResetEmail
): Promise<void> {
  const identifierHash = hashEmailForLog(input.email);

  writePasswordResetLog("password_reset_requested", {
    identifierHash
  });

  const user = await prisma.user.findUnique({
    where: {
      email: input.email
    },
    select: {
      id: true,
      name: true,
      email: true
    }
  });

  if (!user) {
    writePasswordResetLog("password_reset_user_not_found", {
      identifierHash
    });

    return;
  }

  const token = createPasswordResetToken();
  const tokenHash = hashPasswordResetToken(token);

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: createPasswordResetExpiry()
    }
  });

  writePasswordResetLog("password_reset_email_attempted", {
    userId: user.id
  });

  try {
    await emailSender({
      to: user.email,
      name: user.name,
      token
    });

    writePasswordResetLog("password_reset_email_sent", {
      userId: user.id
    });
  } catch (error) {
    await prisma.user.update({
      where: {
        id: user.id
      },
      data: {
        resetPasswordToken: null,
        resetPasswordExpires: null
      }
    });

    logPasswordResetEmailFailure(user.id, error);
  }
}

export async function resetPassword(input: ResetPasswordInput): Promise<void> {
  const tokenHash = hashPasswordResetToken(input.token);
  const now = new Date();

  const user = await prisma.user.findFirst({
    where: {
      resetPasswordToken: tokenHash,
      resetPasswordExpires: {
        gt: now
      }
    },
    select: {
      id: true
    }
  });

  if (!user) {
    throw new HttpError(
      "Token reset password tidak valid atau sudah kedaluwarsa",
      400
    );
  }

  const passwordHash = await bcrypt.hash(input.password, PASSWORD_SALT_ROUNDS);

  await prisma.user.update({
    where: {
      id: user.id
    },
    data: {
      passwordHash,
      resetPasswordToken: null,
      resetPasswordExpires: null
    }
  });
}

export async function getCurrentUser(userId: string): Promise<AuthUser> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true
    }
  });

  if (!user) {
    throw new HttpError("User tidak ditemukan", 404);
  }

  return toAuthUser(user);
}