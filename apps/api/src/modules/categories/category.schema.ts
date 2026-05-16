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
  color: optionalStringFieldSchema(30, "Color maksimal 30 karakter")
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
    color: optionalStringFieldSchema(30, "Color maksimal 30 karakter")
  })
  .refine(
    (data) => Object.values(data).some((value) => value !== undefined),
    "Minimal satu field harus diisi untuk update"
  );

export const categoryIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID kategori wajib diisi")
});