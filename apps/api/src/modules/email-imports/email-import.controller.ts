import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { env } from "../../config/env.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type { GmailSyncInput, ImportEmailInput } from "./email-import.types.js";
import {
  approveEmailImport,
  disconnectGmailConnection,
  getEmailImportOverview,
  getGmailAuthUrl,
  handleGmailOAuthCallback,
  ignoreEmailImport,
  importEmailTransaction,
  syncGmailTransactions
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

export async function gmailOAuthCallbackController(c: Context<AppEnv>) {
  const query = c.get("validatedQuery") as { code: string; state: string };

  try {
    await handleGmailOAuthCallback(query.code, query.state);

    return c.redirect(
      `${env.FRONTEND_URL}/dashboard?emailImport=connected`,
      302
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Koneksi Gmail gagal";
    const params = new URLSearchParams({
      emailImport: "error",
      message
    });

    return c.redirect(`${env.FRONTEND_URL}/dashboard?${params.toString()}`, 302);
  }
}

export async function syncGmailController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as GmailSyncInput;
  const result = await syncGmailTransactions(userId, input);

  return successResponse(c, "Sinkronisasi Gmail berhasil", result);
}

export async function disconnectGmailController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as { id: string };
  const result = await disconnectGmailConnection(userId, param.id);

  return successResponse(c, "Koneksi Gmail berhasil diputus", result);
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
