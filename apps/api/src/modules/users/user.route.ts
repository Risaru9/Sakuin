import { Hono } from "hono";
import type { AppEnv } from "../../types/app.js";
import { authMiddleware } from "../../middlewares/auth.middleware.js";
import { validateRequest } from "../../middlewares/validate.middleware.js";
import { updateUserProfileSchema } from "./user.schema.js";
import {
  getUserProfileController,
  updateUserProfileController
} from "./user.controller.js";

export const userRoutes = new Hono<AppEnv>();

userRoutes.get("/profile", authMiddleware, getUserProfileController);

userRoutes.patch(
  "/profile",
  authMiddleware,
  validateRequest("json", updateUserProfileSchema),
  updateUserProfileController
);