import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";

type SuccessResponse<T> = {
  success: true;
  message: string;
  data: T | null;
};

type ErrorResponse = {
  success: false;
  message: string;
  errors: unknown;
};

export function successResponse<T>(
  c: Context,
  message: string,
  data: T | null = null,
  status: ContentfulStatusCode = 200
) {
  const response: SuccessResponse<T> = {
    success: true,
    message,
    data
  };

  return c.json(response, status);
}

export function errorResponse(
  c: Context,
  message: string,
  errors: unknown = null,
  status: ContentfulStatusCode = 500
) {
  const response: ErrorResponse = {
    success: false,
    message,
    errors
  };

  return c.json(response, status);
}