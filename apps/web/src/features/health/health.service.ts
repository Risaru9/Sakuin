import { apiRequest } from "../../lib/api-client";

export type HealthResponse = {
  status: string;
  timestamp: string;
};

export function getBackendHealth() {
  return apiRequest<HealthResponse>("/health", {
    token: null
  });
}