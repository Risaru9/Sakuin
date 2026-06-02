import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  approveEmailImportController,
  disconnectGmailController,
  gmailOAuthCallbackController,
  getEmailImportOverviewController,
  getGmailAuthUrlController,
  ignoreEmailImportController,
  importEmailController,
  syncGmailController
} from "./email-import.controller.js";
import {
  gmailCallbackSchema,
  gmailSyncSchema,
  importEmailSchema,
  importIdParamSchema
} from "./email-import.schema.js";

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

emailImportRoutes.get(
  "/gmail/callback",
  validateRequest("query", gmailCallbackSchema),
  gmailOAuthCallbackController
);

emailImportRoutes.post(
  "/gmail/sync",
  authMiddleware,
  validateRequest("json", gmailSyncSchema),
  syncGmailController
);

emailImportRoutes.post(
  "/gmail/connections/:id/disconnect",
  authMiddleware,
  validateRequest("param", importIdParamSchema),
  disconnectGmailController
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
