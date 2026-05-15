import type { Context } from "hono";
import type { TransactionType } from "@prisma/client";
import type { AppEnv } from "../../types/app.js";
import { successResponse } from "../../utils/api-response.js";
import { getCategoriesService } from "./category.service.js";

type GetCategoriesQuery = {
  type?: TransactionType;
};

export async function getCategoriesController(c: Context<AppEnv>) {
  const query = c.get("validatedQuery") as GetCategoriesQuery;

  const categories = await getCategoriesService({
    type: query.type
  });

  return successResponse(c, "Daftar kategori berhasil diambil", categories);
}