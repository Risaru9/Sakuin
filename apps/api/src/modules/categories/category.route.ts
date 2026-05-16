import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createCategoryController,
  deleteCategoryController,
  getCategoriesController,
  updateCategoryController
} from "./category.controller.js";
import {
  categoryIdParamSchema,
  createCategorySchema,
  getCategoriesQuerySchema,
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

categoryRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", categoryIdParamSchema),
  deleteCategoryController
);