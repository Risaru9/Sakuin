import { config } from "dotenv";
import { z } from "zod";

config();

const optionalBooleanStringSchema = z.preprocess((value) => {
  if (value === undefined || value === null || value === "") {
    return undefined;
  }

  if (value === "true" || value === true) {
    return true;
  }

  if (value === "false" || value === false) {
    return false;
  }

  return value;
}, z.boolean().optional());

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().positive().default(5000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL wajib diisi"),
  DIRECT_URL: z.string().optional(),
  JWT_SECRET: z.string().min(32, "JWT_SECRET minimal 32 karakter"),
  FRONTEND_URL: z
    .string()
    .url("FRONTEND_URL harus berupa URL valid")
    .default("http://localhost:3000"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_ID: z.string().optional(),
  GMAIL_CLIENT_SECRET: z.string().optional(),
  GMAIL_REDIRECT_URI: z.string().optional(),
  EMAIL_TOKEN_ENCRYPTION_KEY: z.string().optional(),

  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_SECURE: optionalBooleanStringSchema.default(true),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  EMAIL_FROM: z.string().optional(),

  GEMINI_API_KEY: z.string().optional(),
  GEMINI_MODEL: z.string().optional(),
  GEMINI_MODEL_DEFAULT: z.string().optional(),
  GEMINI_MODEL_COMPLEX: z.string().optional(),
  GEMINI_MODEL_FALLBACK: z.string().optional(),

  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  VAPID_SUBJECT: z.string().optional(),
  CRON_SECRET: z.string().optional()
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("Environment variable tidak valid:");
  console.error(parsedEnv.error.flatten().fieldErrors);

  throw new Error("Konfigurasi environment tidak valid.");
}

const parsedData = parsedEnv.data;

export const env = {
  ...parsedData,
  GEMINI_MODEL_DEFAULT:
    parsedData.GEMINI_MODEL_DEFAULT ??
    parsedData.GEMINI_MODEL ??
    "gemini-3.1-flash-lite",
  GEMINI_MODEL_COMPLEX:
    parsedData.GEMINI_MODEL_COMPLEX ??
    parsedData.GEMINI_MODEL_DEFAULT ??
    parsedData.GEMINI_MODEL ??
    "gemini-3.5-flash",
  GEMINI_MODEL_FALLBACK:
    parsedData.GEMINI_MODEL_FALLBACK ??
    parsedData.GEMINI_MODEL_DEFAULT ??
    parsedData.GEMINI_MODEL ??
    "gemini-3.1-flash-lite"
};
