import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateRecurringRuleInput,
  RecurringRuleIdParam,
  UpdateRecurringRuleInput
} from "./recurring.types.js";
import {
  createRecurringRule,
  deleteRecurringRule,
  getRecurringRules,
  runDueRecurringRules,
  updateRecurringRule
} from "./recurring.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");
  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }
  return userId;
}

export async function createRecurringRuleController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateRecurringRuleInput;
  const recurringRule = await createRecurringRule(userId, input);
  return successResponse(c, "Recurring rule berhasil dibuat", recurringRule, 201);
}

export async function getRecurringRulesController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const recurringRules = await getRecurringRules(userId);
  return successResponse(c, "Daftar recurring rule berhasil diambil", recurringRules);
}

export async function updateRecurringRuleController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as RecurringRuleIdParam;
  const input = c.get("validatedJson") as UpdateRecurringRuleInput;
  const recurringRule = await updateRecurringRule(userId, param.id, input);
  return successResponse(c, "Recurring rule berhasil diupdate", recurringRule);
}

export async function deleteRecurringRuleController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as RecurringRuleIdParam;
  const recurringRule = await deleteRecurringRule(userId, param.id);
  return successResponse(c, "Recurring rule berhasil dihapus", recurringRule);
}

export async function runDueRecurringRulesController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const result = await runDueRecurringRules(userId);
  return successResponse(c, "Recurring due berhasil diproses", result);
}
