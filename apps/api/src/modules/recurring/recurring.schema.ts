import { z } from "zod";

const recurringFrequencySchema = z.enum(["WEEKLY", "MONTHLY"]);

const amountSchema = z
  .union([z.string(), z.number()])
  .transform((value) => String(value).trim())
  .refine((value) => /^\d+(\.\d{1,2})?$/.test(value), "Nominal tidak valid")
  .refine((value) => Number(value) > 0, "Nominal harus lebih dari 0");

const optionalDateSchema = z.preprocess(
  (value) => {
    if (value === undefined || value === null || value === "") {
      return undefined;
    }
    return value;
  },
  z.coerce.date().optional()
);

const requiredDateSchema = z.coerce.date();

const recurringRuleBaseSchema = z.object({
  categoryId: z.string().trim().min(1, "Kategori wajib diisi"),
  type: z.enum(["INCOME", "EXPENSE"]),
  amount: amountSchema,
  note: z.string().trim().max(255).optional().nullable(),
  frequency: recurringFrequencySchema,
  interval: z.coerce.number().int().min(1).max(12).default(1),
  dayOfMonth: z.coerce.number().int().min(1).max(28).optional().nullable(),
  dayOfWeek: z.coerce.number().int().min(0).max(6).optional().nullable(),
  startDate: requiredDateSchema,
  endDate: optionalDateSchema.nullable(),
  autoPost: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(true)
});

export const createRecurringRuleSchema = recurringRuleBaseSchema
  .superRefine((input, ctx) => {
    if (input.frequency === "MONTHLY" && input.dayOfMonth == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Untuk bulanan, dayOfMonth wajib diisi",
        path: ["dayOfMonth"]
      });
    }
    if (input.frequency === "WEEKLY" && input.dayOfWeek == null) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Untuk mingguan, dayOfWeek wajib diisi",
        path: ["dayOfWeek"]
      });
    }
  });

export const updateRecurringRuleSchema = recurringRuleBaseSchema
  .partial()
  .refine(
    (input: Record<string, unknown>) =>
      Object.values(input).some((value) => value !== undefined),
    "Minimal satu field harus diisi"
  );

export const recurringRuleIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID recurring rule wajib diisi")
});
