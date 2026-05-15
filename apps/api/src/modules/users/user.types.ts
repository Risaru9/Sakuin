import type { z } from "zod";
import type { updateUserProfileSchema } from "./user.schema.js";

export type UpdateUserProfileInput = z.infer<typeof updateUserProfileSchema>;

export type UserProfileResponse = {
  id: string;
  name: string;
  email: string;
  safeBalanceLimit: string;
  createdAt: string;
  updatedAt: string;
};