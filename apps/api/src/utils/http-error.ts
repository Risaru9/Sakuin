import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpError extends Error {
  statusCode: ContentfulStatusCode;
  errors?: unknown;

  constructor(
    message: string,
    statusCode: ContentfulStatusCode = 500,
    errors?: unknown
  ) {
    super(message);

    this.name = "HttpError";
    this.statusCode = statusCode;
    this.errors = errors;
  }
}