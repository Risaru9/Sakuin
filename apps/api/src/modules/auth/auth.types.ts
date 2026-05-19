import type { z } from "zod";
import type {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "./auth.schema.js";

export type RegisterInput = z.infer<typeof registerSchema>;

export type LoginInput = z.infer<typeof loginSchema>;

export type GoogleLoginInput = z.infer<typeof googleLoginSchema>;

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

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