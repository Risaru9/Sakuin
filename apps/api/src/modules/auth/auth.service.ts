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
import type {
  AuthResponse,
  AuthUser,
  GoogleLoginInput,
  LoginInput,
  RegisterInput
} from "./auth.types.js";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;
const GOOGLE_PROVIDER = "google";

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