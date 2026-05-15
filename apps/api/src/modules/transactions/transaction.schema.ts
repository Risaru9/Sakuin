import { z } from "zod";

const MAX_TRANSACTION_AMOUNT = 1_000_000_000_000;
const MAX_TRANSACTION_AMOUNT_LABEL = "1.000.000.000.000";

const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => value.length > 0, "Amount wajib diisi")
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value),
    "Amount harus angka positif dengan maksimal 2 angka desimal"
  )
  .refine((value) => Number.isFinite(Number(value)), "Amount tidak valid")
  .refine((value) => Number(value) > 0, "Amount harus lebih dari 0")
  .refine(
    (value) => Number(value) <= MAX_TRANSACTION_AMOUNT,
    `Amount maksimal ${MAX_TRANSACTION_AMOUNT_LABEL}`
  );

const requiredDateSchema = z.coerce
  .date()
  .refine((date) => !Number.isNaN(date.getTime()), "Tanggal tidak valid");

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return value;
  },
  z.coerce.date().optional()
);

const optionalStringSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return value;
  },
  z.string().trim().optional()
);

export const createTransactionSchema = z.object({
  type: transactionTypeSchema,
  amount: amountSchema,
  categoryId: z.string().trim().min(1, "Category wajib diisi"),
  date: requiredDateSchema,
  note: z
    .string()
    .trim()
    .max(255, "Catatan maksimal 255 karakter")
    .optional()
    .nullable()
});

export const updateTransactionSchema = z
  .object({
    type: transactionTypeSchema.optional(),
    amount: amountSchema.optional(),
    categoryId: z.string().trim().min(1, "Category wajib diisi").optional(),
    date: requiredDateSchema.optional(),
    note: z
      .string()
      .trim()
      .max(255, "Catatan maksimal 255 karakter")
      .optional()
      .nullable()
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  );

export const transactionIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID transaksi wajib diisi")
});

export const getTransactionsQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(10),
    type: transactionTypeSchema.optional(),
    categoryId: optionalStringSchema,
    search: optionalStringSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema,
    sort: z
      .enum(["date_desc", "date_asc", "created_desc", "created_asc"])
      .default("date_desc")
  })
  .superRefine((data, ctx) => {
    if (data.startDate && Number.isNaN(data.startDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["startDate"],
        message: "startDate tidak valid"
      });
    }

    if (data.endDate && Number.isNaN(data.endDate.getTime())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate tidak valid"
      });
    }

    if (data.startDate && data.endDate && data.startDate > data.endDate) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["endDate"],
        message: "endDate tidak boleh lebih awal dari startDate"
      });
    }
  });