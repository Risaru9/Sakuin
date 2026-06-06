import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { recordAuditEventFromContext } from "../../utils/audit-event-recorder.js";
import { HttpError } from "../../utils/http-error.js";
import {
  archiveAccount,
  createAccount,
  createAccountTransfer,
  getAccounts,
  getAccountTransfers,
  updateAccount
} from "./account.service.js";
import type {
  AccountIdParam,
  CreateAccountInput,
  CreateAccountTransferInput,
  UpdateAccountInput
} from "./account.types.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function getAccountsController(c: Context<AppEnv>) {
  const accounts = await getAccounts(getAuthenticatedUserId(c));
  return successResponse(c, "Daftar rekening berhasil diambil", accounts);
}

export async function createAccountController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as CreateAccountInput;
  const account = await createAccount(getAuthenticatedUserId(c), input);

  await recordAuditEventFromContext(c, {
    eventType: "account.created",
    status: "success",
    targetType: "account",
    targetId: account.id,
    metadata: {
      type: account.type
    }
  });

  return successResponse(c, "Rekening berhasil dibuat", account, 201);
}

export async function updateAccountController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as UpdateAccountInput;
  const param = c.get("validatedParam") as AccountIdParam;
  const account = await updateAccount(
    getAuthenticatedUserId(c),
    param.id,
    input
  );

  return successResponse(c, "Rekening berhasil diperbarui", account);
}

export async function archiveAccountController(c: Context<AppEnv>) {
  const param = c.get("validatedParam") as AccountIdParam;
  const account = await archiveAccount(getAuthenticatedUserId(c), param.id);
  return successResponse(c, "Rekening berhasil diarsipkan", account);
}

export async function createAccountTransferController(c: Context<AppEnv>) {
  const input = c.get("validatedJson") as CreateAccountTransferInput;
  const transfer = await createAccountTransfer(
    getAuthenticatedUserId(c),
    input
  );

  await recordAuditEventFromContext(c, {
    eventType: "account.transfer_created",
    status: "success",
    targetType: "account_transfer",
    targetId: transfer.id,
    metadata: {
      fromAccountId: input.fromAccountId,
      toAccountId: input.toAccountId
    }
  });

  return successResponse(c, "Transfer antar-rekening berhasil dibuat", transfer, 201);
}

export async function getAccountTransfersController(c: Context<AppEnv>) {
  const transfers = await getAccountTransfers(getAuthenticatedUserId(c));
  return successResponse(c, "Daftar transfer berhasil diambil", transfers);
}
