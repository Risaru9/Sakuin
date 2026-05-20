import { z } from "zod";

const aiChatHistoryMessageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z
    .string()
    .trim()
    .min(1, "Isi history tidak boleh kosong")
    .max(1500, "Isi history maksimal 1500 karakter")
});

export const aiChatSchema = z.object({
  message: z
    .string()
    .trim()
    .min(1, "Pesan wajib diisi")
    .max(1000, "Pesan maksimal 1000 karakter"),
  history: z.array(aiChatHistoryMessageSchema).max(12).optional().default([])
});