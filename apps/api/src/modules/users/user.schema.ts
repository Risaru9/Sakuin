import { z } from "zod";

const safeBalanceLimitSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine(
    (value) => /^\d+(\.\d{1,2})?$/.test(value),
    "Safe balance limit harus angka positif dengan maksimal 2 angka desimal"
  )
  .refine(
    (value) => Number(value) >= 0,
    "Safe balance limit tidak boleh negatif"
  )
  .refine(
    (value) => Number(value) <= 9999999999999999.99,
    "Safe balance limit terlalu besar"
  );

export const updateUserProfileSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama wajib diisi")
      .max(100, "Nama maksimal 100 karakter")
      .optional(),
    safeBalanceLimit: safeBalanceLimitSchema.optional()
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  );