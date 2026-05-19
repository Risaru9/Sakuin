import { z } from "zod";

export const registerSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama wajib diisi")
    .max(100, "Nama maksimal 100 karakter"),
  email: z
    .string()
    .trim()
    .email("Email tidak valid")
    .transform((email) => email.toLowerCase()),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .regex(/[0-9]/, "Password harus mengandung angka")
});

export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Email tidak valid")
    .transform((email) => email.toLowerCase()),
  password: z.string().min(1, "Password wajib diisi")
});

export const googleLoginSchema = z.object({
  credential: z.string().trim().min(1, "Google credential wajib diisi")
});