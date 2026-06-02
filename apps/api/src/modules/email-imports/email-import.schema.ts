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

export const gmailCallbackSchema = z.object({
  code: z.string().trim().min(1, "Kode OAuth wajib diisi"),
  state: z.string().trim().min(1, "State OAuth wajib diisi")
});

export const gmailSyncSchema = z.object({
  connectionId: optionalStringSchema,
  maxMessages: z.coerce.number().int().min(1).max(25).optional().default(10)
});
