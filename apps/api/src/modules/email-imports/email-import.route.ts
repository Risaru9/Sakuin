import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  approveEmailImportController,
  getEmailImportOverviewController,
  getGmailAuthUrlController,
  ignoreEmailImportController,
  importEmailController
} from "./email-import.controller.js";
import { importEmailSchema, importIdParamSchema } from "./email-import.schema.js";

export const emailImportRoutes = new Hono<AppEnv>();

emailImportRoutes.get(
  "/overview",
  authMiddleware,
  getEmailImportOverviewController
);

emailImportRoutes.get(
  "/gmail/auth-url",
  authMiddleware,
  getGmailAuthUrlController
);

emailImportRoutes.post(
  "/import-email",
  authMiddleware,
  validateRequest("json", importEmailSchema),
  importEmailController
);

emailImportRoutes.post(
  "/imports/:id/approve",
  authMiddleware,
  validateRequest("param", importIdParamSchema),
  approveEmailImportController
);

emailImportRoutes.post(
  "/imports/:id/ignore",
  authMiddleware,
  validateRequest("param", importIdParamSchema),
  ignoreEmailImportController
);
