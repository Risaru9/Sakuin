import { z } from "zod";

export const aiChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan wajib diisi")
    .max(1000, "Pesan maksimal 1000 karakter")
});