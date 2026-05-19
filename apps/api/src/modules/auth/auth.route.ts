import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import {
  forgotPasswordSchema,
  googleLoginSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema
} from "./auth.schema.js";
import {
  forgotPasswordController,
  googleLoginController,
  loginController,
  meController,
  registerController,
  resetPasswordController
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

authRoutes.post(
  "/forgot-password",
  validateRequest("json", forgotPasswordSchema),
  forgotPasswordController
);

authRoutes.post(
  "/reset-password",
  validateRequest("json", resetPasswordSchema),
  resetPasswordController
);

authRoutes.get(
  "/me",
  authMiddleware,
  meController
);