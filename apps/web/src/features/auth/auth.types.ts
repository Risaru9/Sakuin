export type AuthUser = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: number | string;
};

export type AuthResponse = {
  token: string;
  user: AuthUser;
};

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
};

export type GoogleLoginInput = {
  credential: string;
};

export type ForgotPasswordInput = {
  email: string;
};

export type ResetPasswordInput = {
  token: string;
  password: string;
};