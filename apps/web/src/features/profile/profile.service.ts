import { apiRequest } from "../../lib/api-client";
import type { UpdateUserProfileInput, UserProfile } from "./profile.types";

export function getUserProfile() {
  return apiRequest<UserProfile>("/api/users/profile");
}

export function updateUserProfile(input: UpdateUserProfileInput) {
  return apiRequest<UserProfile>("/api/users/profile", {
    method: "PATCH",
    body: input
  });
}