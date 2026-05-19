import type { z } from "zod";
import type {
  googleLoginSchema,
  loginSchema,
  registerSchema
} from "./auth.schema.js";

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: number;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};