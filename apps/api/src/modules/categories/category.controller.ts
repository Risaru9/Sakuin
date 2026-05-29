import type { Context } from "hono";
import type { TransactionType } from "@prisma/client";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { recordAuditEventFromContext } from "../../utils/audit-event-recorder.js";
import { HttpError } from "../../utils/http-error.js";
import {
  createCategoryService,
  deleteCategoryService,
  getCategoriesService,
  updateCategoryService
} from "./category.service.js";

type GetCategoriesQuery = {
  type?: TransactionType;
};

type CreateCategoryInput = {
  name: string;
  type: TransactionType;
  icon?: string | null;
  color?: string | null;
  limit?: number | null;
};

type UpdateCategoryInput = {
  name?: string;
  type?: TransactionType;
  icon?: string | null;
  color?: string | null;
  limit?: number | null;
};

type CategoryIdParam = {
  id: string;
};

function getAuthenticatedUserId(c: Context<AppEnv>) {
  const userId = c.get("userId");

  if (!userId) {
    throw new HttpError("User belum terautentikasi", 401);
  }

  return userId;
}

function hasNonEmptyValue(value: string | null | undefined) {
  return Boolean(value?.trim());
}

function getChangedFields(input: UpdateCategoryInput) {
  return Object.entries(input)
    .filter(([, value]) => value !== undefined)
    .map(([field]) => field)
    .join(",");
}

export async function getCategoriesController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const query = c.get("validatedQuery") as GetCategoriesQuery;

  const categories = await getCategoriesService({
    userId,
    type: query.type
  });

  return successResponse(c, "Daftar kategori berhasil diambil", categories);
}

export async function createCategoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const input = c.get("validatedJson") as CreateCategoryInput;

  const category = await createCategoryService(userId, input);

  await recordAuditEventFromContext(c, {
    eventType: "category.created",
    status: "success",
    targetType: "category",
    targetId: category.id,
    metadata: {
      type: category.type,
      hasIcon: hasNonEmptyValue(input.icon),
      hasColor: hasNonEmptyValue(input.color)
    }
  });

  return successResponse(c, "Kategori berhasil dibuat", category, 201);
}

export async function updateCategoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as CategoryIdParam;
  const input = c.get("validatedJson") as UpdateCategoryInput;

  const category = await updateCategoryService(userId, param.id, input);

  await recordAuditEventFromContext(c, {
    eventType: "category.updated",
    status: "success",
    targetType: "category",
    targetId: category.id,
    metadata: {
      changedFields: getChangedFields(input),
      typeProvided: input.type !== undefined,
      iconProvided: input.icon !== undefined,
      hasIcon: input.icon !== undefined ? hasNonEmptyValue(input.icon) : null,
      colorProvided: input.color !== undefined,
      hasColor: input.color !== undefined ? hasNonEmptyValue(input.color) : null
    }
  });

  return successResponse(c, "Kategori berhasil diupdate", category);
}

export async function deleteCategoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as CategoryIdParam;

  const category = await deleteCategoryService(userId, param.id);

  await recordAuditEventFromContext(c, {
    eventType: "category.deleted",
    status: "success",
    targetType: "category",
    targetId: category.id,
    metadata: {
      reason: "user_requested"
    }
  });

  return successResponse(c, "Kategori berhasil dihapus", category);
}