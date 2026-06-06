import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  archiveAccountController,
  createAccountController,
  createAccountTransferController,
  getAccountsController,
  getAccountTransfersController,
  updateAccountController
} from "./account.controller.js";
import {
  accountIdParamSchema,
  createAccountSchema,
  createAccountTransferSchema,
  updateAccountSchema
} from "./account.schema.js";

export const accountRoutes = new Hono<AppEnv>();

accountRoutes.get("/", authMiddleware, getAccountsController);
accountRoutes.post(
  "/",
  authMiddleware,
  validateRequest("json", createAccountSchema),
  createAccountController
);
accountRoutes.get("/transfers", authMiddleware, getAccountTransfersController);
accountRoutes.post(
  "/transfers",
  authMiddleware,
  validateRequest("json", createAccountTransferSchema),
  createAccountTransferController
);
accountRoutes.put(
  "/:id",
  authMiddleware,
  validateRequest("param", accountIdParamSchema),
  validateRequest("json", updateAccountSchema),
  updateAccountController
);
accountRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", accountIdParamSchema),
  archiveAccountController
);
