import type { JwtPayload } from "jsonwebtoken";
import jwt from "jsonwebtoken";
import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../types/app.js";
import { env } from "../config/env.js";
import { HttpError } from "../utils/http-error.js";

type AccessTokenPayload = JwtPayload & {
  userId?: string;
};

export const authMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  const authorization = c.req.header("Authorization");

  if (!authorization) {
    throw new HttpError("Authorization header wajib diisi", 401);
  }

  if (!authorization.startsWith("Bearer ")) {
    throw new HttpError("Format token harus Bearer token", 401);
  }

  const token = authorization.split(" ")[1];

  if (!token) {
    throw new HttpError("Token tidak ditemukan", 401);
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as AccessTokenPayload;

    if (!decoded.userId || typeof decoded.userId !== "string") {
      throw new HttpError("Payload token tidak valid", 401);
    }

    c.set("userId", decoded.userId);

    await next();
  } catch (error) {
    if (error instanceof HttpError) {
      throw error;
    }

    throw new HttpError("Token tidak valid atau sudah kedaluwarsa", 401);
  }
};