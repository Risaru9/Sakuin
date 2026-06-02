import { z } from "zod";

const optionalStringSchema = z.preprocess(
  (value) => (value === "" || value === null ? undefined : value),
  z.string().trim().optional()
);

export const importEmailSchema = z.object({
  emailAddress: optionalStringSchema,
  from: optionalStringSchema,
  subject: optionalStringSchema,
  body: z.string().trim().min(10, "Isi email minimal 10 karakter"),
  messageId: optionalStringSchema,
  receivedAt: z.coerce.date().optional(),
  autoImport: z.boolean().optional().default(true)
});

export const importIdParamSchema = z.object({
  id: z.string().trim().min(1, "ID import wajib diisi")
});
