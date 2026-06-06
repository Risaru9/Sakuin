import { z } from "zod";

const MAX_ACCOUNT_BALANCE = 1_000_000_000_000;
const accountTypeSchema = z.enum([
  "CASH",
  "BANK",
  "E_WALLET",
  "SAVINGS",
  "OTHER"
]);

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^-?\d+(\.\d{1,2})?$/.test(value), "Nominal tidak valid")
  .refine(
    (value) => Math.abs(Number(value)) <= MAX_ACCOUNT_BALANCE,
    "Nominal terlalu besar"
  );

const positiveAmountSchema = amountSchema.refine(
  (value) => Number(value) > 0,
  "Nominal harus lebih dari 0"
);

const optionalTextSchema = z
  .string()
  .trim()
  .max(80)
  .optional()
  .nullable();

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, "Nama rekening wajib diisi").max(60),
  type: accountTypeSchema,
  initialBalance: amountSchema.default("0"),
  icon: optionalTextSchema,
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Warna harus memakai format hex")
    .optional()
    .nullable()
});

export const updateAccountSchema = createAccountSchema
  .partial()
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi"
  );

export const accountIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID rekening wajib diisi")
});

export const createAccountTransferSchema = z
  .object({
    fromAccountId: z.string().trim().min(1, "Rekening asal wajib diisi"),
    toAccountId: z.string().trim().min(1, "Rekening tujuan wajib diisi"),
    amount: positiveAmountSchema,
    date: z.coerce.date(),
    note: z.string().trim().max(255).optional().nullable()
  })
  .refine((data) => data.fromAccountId !== data.toAccountId, {
    path: ["toAccountId"],
    message: "Rekening tujuan harus berbeda"
  });
