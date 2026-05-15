import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  UpdateUserProfileInput,
  UserProfileResponse
} from "./user.types.js";

type UserProfileEntity = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: Prisma.Decimal;
  createdAt: Date;
  updatedAt: Date;
};

function toDecimal(value: Prisma.Decimal.Value) {
  return new Prisma.Decimal(value);
}

function decimalToString(value: Prisma.Decimal) {
  return value.toFixed(2);
}

function mapUserProfileToResponse(user: UserProfileEntity): UserProfileResponse {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    safeBalanceLimit: decimalToString(user.safeBalanceLimit),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString()
  };
}

export async function getUserProfile(
  userId: string
): Promise<UserProfileResponse> {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true,
      createdAt: true,
      updatedAt: true
    }
  });

  if (!user) {
    throw new HttpError("User tidak ditemukan", 404);
  }

  return mapUserProfileToResponse(user);
}

export async function updateUserProfile(
  userId: string,
  input: UpdateUserProfileInput
): Promise<UserProfileResponse> {
  const data: Prisma.UserUpdateInput = {};

  if (input.name !== undefined) {
    data.name = input.name;
  }

  if (input.safeBalanceLimit !== undefined) {
    data.safeBalanceLimit = toDecimal(input.safeBalanceLimit);
  }

  const user = await prisma.user.update({
    where: {
      id: userId
    },
    data,
    select: {
      id: true,
      name: true,
      email: true,
      safeBalanceLimit: true,
      createdAt: true,
      updatedAt: true
    }
  });

  return mapUserProfileToResponse(user);
}