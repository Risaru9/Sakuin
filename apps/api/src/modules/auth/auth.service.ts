import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../../db/prisma.js";
import { env } from "../../config/env.js";
import { HttpError } from "../../utils/http-error.js";
import type { AuthResponse, AuthUser, LoginInput, RegisterInput } from "./auth.types.js";

const PASSWORD_SALT_ROUNDS = 12;
const TOKEN_EXPIRES_IN_SECONDS = 60 * 60 * 24 * 7;

function toAuthUser(user: {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: { toNumber: () => number };
}): AuthUser {
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

  const token = signAccessToken(user.id);

  return {
    token,
    user: toAuthUser(user)
  };
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

  if (!user) {
    throw new HttpError("Email atau password salah", 401);
  }

  const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);

  if (!isPasswordValid) {
    throw new HttpError("Email atau password salah", 401);
  }

  const token = signAccessToken(user.id);

  return {
    token,
    user: toAuthUser(user)
  };
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