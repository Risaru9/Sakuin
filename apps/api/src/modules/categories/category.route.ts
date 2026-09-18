import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  setCategoryLimitController,
  updateCategoryController
} from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  getCategoriesQuerySchema,
  setCategoryLimitSchema,
  updateCategorySchema
} from "./category.schema.js";

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getCategoriesQuerySchema),
  getCategoriesController
);

categoryRoutes.post(
  "/",
  authMiddleware,
  validateRequest("json", createCategorySchema),
  createCategoryController
);

categoryRoutes.put(
  "/:id",
  authMiddleware,
  validateRequest("param", categoryIdParamSchema),
  validateRequest("json", updateCategorySchema),
  updateCategoryController
);

// Works for default categories too; the limit is stored per user.
categoryRoutes.put(
  "/:id/limit",
  authMiddleware,
  validateRequest("param", categoryIdParamSchema),
  validateRequest("json", setCategoryLimitSchema),
  setCategoryLimitController
);

categoryRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", categoryIdParamSchema),
  deleteCategoryController
);