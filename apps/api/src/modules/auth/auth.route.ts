import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { loginSchema, registerSchema } from "./auth.schema.js";
import { loginController, meController, registerController } from "./auth.controller.js";

export const authRoutes = new Hono<AppEnv>();

// Auth routes
authRoutes.post(
  "/register",
  validateRequest("json", registerSchema),
  registerController
);

authRoutes.post(
  "/login",
  validateRequest("json", loginSchema),
  loginController
);

authRoutes.get(
  "/me",
  authMiddleware,
  meController
);