import { apiRequest } from "../../lib/api-client";
import type {
  AuthResponse,
  AuthUser,
  GoogleLoginInput,
  LoginInput,
  RegisterInput
} from "./auth.types";

export function loginUser(input: LoginInput) {
  return apiRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: input,
    token: null
  });
}

export function registerUser(input: RegisterInput) {
  return apiRequest<AuthResponse>("/api/auth/register", {
    method: "POST",
    body: input,
    token: null
  });
}

export function googleLoginUser(input: GoogleLoginInput) {
  return apiRequest<AuthResponse>("/api/auth/google", {
    method: "POST",
    body: input,
    token: null
  });
}

export function getCurrentUser() {
  return apiRequest<AuthUser>("/api/auth/me");
}