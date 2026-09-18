import { z } from "zod";

const categoryTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const optionalStringFieldSchema = (maxLength: number, message: string) =>
  z.preprocess(
    (value) => {
      if (value === "" || value === undefined || value === null) {
        return null;
      }

      return value;
    },
    z.string().trim().max(maxLength, message).nullable().optional()
  );

const limitSchema = z.preprocess(
  (val) => {
    if (val === undefined) {
      return undefined;
    }
    if (val === "" || val === null) {
      return null;
    }
    const parsed = Number(val);
    return Number.isNaN(parsed) ? undefined : parsed;
  },
  z.number().nonnegative("Batas anggaran harus berupa angka positif").nullable().optional()
);

export const getCategoriesQuerySchema = z.object({
  type: categoryTypeSchema.optional()
});

export const createCategorySchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "Nama kategori wajib diisi")
    .max(50, "Nama kategori maksimal 50 karakter"),
  type: categoryTypeSchema,
  icon: optionalStringFieldSchema(50, "Icon maksimal 50 karakter"),
  color: optionalStringFieldSchema(30, "Color maksimal 30 karakter"),
  limit: limitSchema
});

export const updateCategorySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Nama kategori wajib diisi")
      .max(50, "Nama kategori maksimal 50 karakter")
      .optional(),
    type: categoryTypeSchema.optional(),
    icon: optionalStringFieldSchema(50, "Icon maksimal 50 karakter"),
    color: optionalStringFieldSchema(30, "Color maksimal 30 karakter"),
    limit: limitSchema
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  );

export const setCategoryLimitSchema = z.object({
  limit: z.preprocess(
    (value) => (value === "" ? null : value),
    z
      .number({ invalid_type_error: "Batas bulanan harus berupa angka" })
      .positive("Batas bulanan harus lebih dari 0")
      .max(999_999_999_999, "Batas bulanan terlalu besar")
      .nullable()
  )
});

export const categoryIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID kategori wajib diisi")
});