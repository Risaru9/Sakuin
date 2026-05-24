import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  createTransactionSchema,
  createTransactionsBulkSchema,
  getTransactionsQuerySchema,
  transactionIdParamSchema,
  updateTransactionSchema
} from "./transaction.schema.js";
import {
  createTransactionController,
  createTransactionsBulkController,
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

transactionRoutes.post(
  "/bulk",
  authMiddleware,
  validateRequest("json", createTransactionsBulkSchema),
  createTransactionsBulkController
);

transactionRoutes.get(
  "/",
  authMiddleware,
  validateRequest("query", getTransactionsQuerySchema),
  getTransactionsController
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