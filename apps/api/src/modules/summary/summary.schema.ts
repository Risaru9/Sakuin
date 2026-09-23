import { z } from "zod";

const optionalPeriodNumberSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().optional()
);

export const getSummaryQuerySchema = z
  .object({
    month: optionalPeriodNumberSchema.refine(
      (value) => value === undefined || (value >= 1 && value <= 12),
      "Bulan harus antara 1 sampai 12"
    ),
    year: optionalPeriodNumberSchema.refine(
      (value) => value === undefined || (value >= 1900 && value <= 9999),
      "Tahun tidak valid"
    )
  })
  .default({});

const tzOffsetSchema = z.preprocess(
  (value) => (value === "" || value === undefined || value === null ? undefined : value),
  z.coerce
    .number()
    .int("Zona waktu tidak valid")
    .min(-840, "Zona waktu tidak valid")
    .max(840, "Zona waktu tidak valid")
    .optional()
);

export const getGlanceQuerySchema = z
  .object({
    date: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus berformat YYYY-MM-DD")
      .optional(),
    tz: tzOffsetSchema
  })
  .default({});
