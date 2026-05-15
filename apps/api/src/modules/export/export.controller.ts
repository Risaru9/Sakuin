import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type { ExportTransactionsQuery } from "./export.types.js";
import {
  buildTransactionsCsv,
  buildTransactionsXlsx,
  getTransactionsExportData
} from "./export.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

function buildExportFileName(extension: "csv" | "xlsx") {
  const timestamp = new Date()
    .toISOString()
    .replace(/[:.]/g, "-")
    .replace("T", "_")
    .slice(0, 19);

  return `sakuin-transactions-${timestamp}.${extension}`;
}

function bufferToUint8Array(buffer: Buffer) {
  const uint8Array = new Uint8Array(buffer.length);
  uint8Array.set(buffer);

  return uint8Array;
}

export async function exportTransactionsController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const query = c.get("validatedQuery") as ExportTransactionsQuery;

  const exportData = await getTransactionsExportData(userId, query);

  if (query.format === "json") {
    return successResponse(c, "Export transaksi berhasil dibuat", exportData);
  }

  if (query.format === "csv") {
    const csv = buildTransactionsCsv(exportData);
    const fileName = buildExportFileName("csv");

    return c.body(csv, 200, {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${fileName}"`
    });
  }

  const xlsxBuffer = await buildTransactionsXlsx(exportData);
  const xlsxBody = bufferToUint8Array(xlsxBuffer);
  const fileName = buildExportFileName("xlsx");

  return c.body(xlsxBody, 200, {
    "Content-Type":
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    "Content-Disposition": `attachment; filename="${fileName}"`
  });
}