import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  googleLoginSchema,
  loginSchema,
  registerSchema
} from "./auth.schema.js";
import {
  googleLoginController,
  loginController,
  meController,
  registerController
} from "./auth.controller.js";

export const authRoutes = new Hono<AppEnv>();

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

authRoutes.post(
  "/google",
  validateRequest("json", googleLoginSchema),
  googleLoginController
);

authRoutes.get(
  "/me",
  authMiddleware,
  meController
);