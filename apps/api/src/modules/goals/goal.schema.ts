import { z } from "zod";

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value),
    "Nominal harus angka positif dengan maksimal 2 angka desimal"
  )
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari 0")
  .refine(
    (value) => Number(value) <= 9999999999999999.99,
    "Nominal terlalu besar"
  );

const optionalAmountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value),
    "Nominal harus angka positif dengan maksimal 2 angka desimal"
  )
  .refine((value) => Number(value) >= 0, "Nominal tidak boleh negatif")
  .refine(
    (value) => Number(value) <= 9999999999999999.99,
    "Nominal terlalu besar"
  );

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return null;
    }

    return value;
  },
  z.coerce.date().nullable()
);

export const createGoalSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama goal wajib diisi")
    .max(100, "Nama goal maksimal 100 karakter"),
  targetAmount: amountSchema,
  currentAmount: optionalAmountSchema.optional(),
  deadline: optionalDateSchema.optional()
});

export const updateGoalSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama goal wajib diisi")
      .max(100, "Nama goal maksimal 100 karakter")
      .optional(),
    targetAmount: amountSchema.optional(),
    currentAmount: optionalAmountSchema.optional(),
    deadline: optionalDateSchema.optional()
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  );

export const goalIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID goal wajib diisi")
});