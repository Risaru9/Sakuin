import { z } from "zod";

const transactionTypeSchema = z.enum(["INCOME", "EXPENSE"]);

const optionalStringSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return value;
  },
  z.string().trim().optional()
);

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === "" || value === undefined || value === null) {
      return undefined;
    }

    return value;
  },
  z.coerce.date().optional()
);

export const exportTransactionsQuerySchema = z
  .object({
    format: z.enum(["json", "csv", "xlsx"]).default("json"),
    type: transactionTypeSchema.optional(),
    categoryId: optionalStringSchema,
    startDate: optionalDateSchema,
    endDate: optionalDateSchema
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