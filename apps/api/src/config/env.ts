import { config } from "dotenv";
import { z } from "zod";

config();

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z
    .string()
    .min(32, "JWT_SECRET minimal 32 karakter"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL harus berupa URL valid")
    .default("http://localhost:3000")
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Environment variable tidak valid:");
  console.error(parsedEnv.error.flatten().fieldErrors);

  throw new Error("Konfigurasi environment tidak valid.");
}

export const env = parsedEnv.data;