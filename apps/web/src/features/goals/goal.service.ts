import { apiRequest } from "../../lib/api-client";
import type { CreateGoalInput, Goal, UpdateGoalInput } from "./goal.types";

export function getGoals() {
  return apiRequest<Goal[]>("/api/goals");
}

export function createGoal(input: CreateGoalInput) {
  return apiRequest<Goal>("/api/goals", {
    method: "POST",
    body: input
  });
}

export function updateGoal(goalId: string, input: UpdateGoalInput) {
  return apiRequest<Goal>(`/api/goals/${goalId}`, {
    method: "PUT",
    body: input
  });
}

export function getGoal(goalId: string) {
  return apiRequest<Goal>(`/api/goals/${goalId}`);
}

export function deleteGoal(goalId: string) {
  return apiRequest<Goal>(`/api/goals/${goalId}`, {
    method: "DELETE"
  });
}