import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createTransactionSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema
} from "./transaction.schema.js";
import {
  createTransactionController,
  deleteTransactionController,
  getTransactionDetailController,
  getTransactionsController,
  updateTransactionController
} from "./transaction.controller.js";

export const transactionRoutes = new Hono<AppEnv>();

// Transaction routes
transactionRoutes.post(
  "/",
  authMiddleware,
  validateRequest("json", createTransactionSchema),
  createTransactionController
);

transactionRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getTransactionsQuerySchema),
  getTransactionsController
);

transactionRoutes.get(
  "/:id",
  authMiddleware,
  validateRequest("param", transactionIdParamSchema),
  getTransactionDetailController
);

transactionRoutes.put(
  "/:id",
  authMiddleware,
  validateRequest("param", transactionIdParamSchema),
  validateRequest("json", updateTransactionSchema),
  updateTransactionController
);

transactionRoutes.delete(
  "/:id",
  authMiddleware,
  validateRequest("param", transactionIdParamSchema),
  deleteTransactionController
);