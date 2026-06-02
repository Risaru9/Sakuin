import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type { ImportEmailInput } from "./email-import.types.js";
import {
  approveEmailImport,
  getEmailImportOverview,
  getGmailAuthUrl,
  ignoreEmailImport,
  importEmailTransaction
} from "./email-import.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function getEmailImportOverviewController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const overview = await getEmailImportOverview(userId);

  return successResponse(c, "Overview deteksi email berhasil diambil", overview);
}

export async function getGmailAuthUrlController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const result = await getGmailAuthUrl(userId);

  return successResponse(c, "URL koneksi Gmail berhasil dibuat", result);
}

export async function importEmailController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as ImportEmailInput;
  const result = await importEmailTransaction(userId, input);

  return successResponse(c, "Email transaksi berhasil diproses", result, 201);
}

export async function approveEmailImportController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as { id: string };
  const result = await approveEmailImport(userId, param.id);

  return successResponse(c, "Import email berhasil disetujui", result);
}

export async function ignoreEmailImportController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as { id: string };
  const result = await ignoreEmailImport(userId, param.id);

  return successResponse(c, "Import email berhasil diabaikan", result);
}
