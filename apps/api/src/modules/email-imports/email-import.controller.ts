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

function buildGmailCallbackHtml({
  status,
  message
}: {
  status: "connected" | "error";
  message?: string;
}) {
  const appUrl = new URL("com.sakuin.app://email-import");
  appUrl.searchParams.set("status", status);

  const webUrl = new URL("/dashboard", env.FRONTEND_URL);
  webUrl.searchParams.set("emailImport", status);

  if (message) {
    appUrl.searchParams.set("message", message);
    webUrl.searchParams.set("message", message);
  }

  return `<!doctype html>
<html lang="id">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Koneksi Gmail Sakuin</title>
    <style>
      body {
        align-items: center;
        background: #f7f9fc;
        color: #111827;
        display: flex;
        font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        justify-content: center;
        margin: 0;
        min-height: 100vh;
        padding: 24px;
      }
      main {
        background: #ffffff;
        border: 1px solid #dbe4f0;
        border-radius: 24px;
        box-shadow: 0 22px 55px rgba(37, 99, 235, 0.14);
        max-width: 420px;
        padding: 24px;
        text-align: center;
      }
      h1 {
        font-size: 22px;
        margin: 0 0 10px;
      }
      p {
        color: #526070;
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 18px;
      }
      a {
        align-items: center;
        background: #2563eb;
        border-radius: 14px;
        color: #ffffff;
        display: inline-flex;
        font-weight: 800;
        justify-content: center;
        min-height: 44px;
        padding: 0 18px;
        text-decoration: none;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>${status === "connected" ? "Gmail terhubung" : "Koneksi Gmail gagal"}</h1>
      <p>${status === "connected" ? "Kami sedang mengembalikan kamu ke aplikasi Sakuin." : message ?? "Silakan kembali ke Sakuin dan coba lagi."}</p>
      <a href="${appUrl.toString()}">Kembali ke aplikasi</a>
    </main>
    <script>
      const appUrl = ${JSON.stringify(appUrl.toString())};
      const webUrl = ${JSON.stringify(webUrl.toString())};
      window.location.href = appUrl;
      window.setTimeout(() => {
        window.location.href = webUrl;
      }, 1600);
    </script>
  </body>
</html>`;
}

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

    return c.html(buildGmailCallbackHtml({ status: "connected" }));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Koneksi Gmail gagal";

    return c.html(buildGmailCallbackHtml({ status: "error", message }), 400);
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
