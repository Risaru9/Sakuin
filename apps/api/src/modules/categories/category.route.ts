import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { getCategoriesController } from "./category.controller.js";
import { getCategoriesQuerySchema } from "./category.schema.js";

export const categoryRoutes = new Hono<AppEnv>();

categoryRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getCategoriesQuerySchema),
  getCategoriesController
);