import type { Context } from "hono";
import type { TransactionType } from "@prisma/client";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
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
};

type UpdateCategoryInput = {
  name?: string;
  type?: TransactionType;
  icon?: string | null;
  color?: string | null;
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

  return successResponse(c, "Kategori berhasil dibuat", category, 201);
}

export async function updateCategoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as CategoryIdParam;
  const input = c.get("validatedJson") as UpdateCategoryInput;

  const category = await updateCategoryService(userId, param.id, input);

  return successResponse(c, "Kategori berhasil diupdate", category);
}

export async function deleteCategoryController(c: Context<AppEnv>) {
  const userId = getAuthenticatedUserId(c);
  const param = c.get("validatedParam") as CategoryIdParam;

  const category = await deleteCategoryService(userId, param.id);

  return successResponse(c, "Kategori berhasil dihapus", category);
}