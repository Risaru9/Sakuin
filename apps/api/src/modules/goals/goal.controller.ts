import type { Context } from "hono";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { HttpError } from "../../utils/http-error.js";
import type {
  CreateGoalInput,
  GoalIdParam,
  UpdateGoalInput
} from "./goal.types.js";
import {
  createGoal,
  deleteGoal,
  getGoalById,
  getGoals,
  updateGoal
} from "./goal.service.js";

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

export async function createGoalController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateGoalInput;

  const goal = await createGoal(userId, input);

  return successResponse(c, "Goal berhasil dibuat", goal, 201);
}

export async function getGoalsController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);

  const goals = await getGoals(userId);

  return successResponse(c, "Daftar goal berhasil diambil", goals);
}

export async function getGoalDetailController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as GoalIdParam;

  const goal = await getGoalById(userId, param.id);

  return successResponse(c, "Detail goal berhasil diambil", goal);
}

export async function updateGoalController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as GoalIdParam;
  const input = c.get("validatedJson") as UpdateGoalInput;

  const goal = await updateGoal(userId, param.id, input);

  return successResponse(c, "Goal berhasil diupdate", goal);
}

export async function deleteGoalController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as GoalIdParam;

  const goal = await deleteGoal(userId, param.id);

  return successResponse(c, "Goal berhasil dihapus", goal);
}