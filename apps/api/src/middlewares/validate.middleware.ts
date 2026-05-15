import type { MiddlewareHandler } from "hono";
import type { ZodTypeAny } from "zod";
import type { AppEnv } from "../types/app.js";
import { HttpError } from "../utils/http-error.js";

type ValidateTarget = "json" | "query" | "param";

export function validateRequest(
  target: ValidateTarget,
  schema: ZodTypeAny
): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    let requestData: unknown;

    if (target === "json") {
      const contentType = c.req.header("content-type");

      if (!contentType?.includes("application/json")) {
        throw new HttpError("Content-Type harus application/json", 400);
      }

      try {
        requestData = await c.req.json();
      } catch {
        throw new HttpError("Body JSON tidak valid", 400);
      }
    }

    if (target === "query") {
      requestData = c.req.query();
    }

    if (target === "param") {
      requestData = c.req.param();
    }

    const result = schema.safeParse(requestData);

    if (!result.success) {
      throw new HttpError(
        "Validasi request gagal",
        400,
        result.error.flatten()
      );
    }

    if (target === "json") {
      c.set("validatedJson", result.data);
    }

    if (target === "query") {
      c.set("validatedQuery", result.data);
    }

    if (target === "param") {
      c.set("validatedParam", result.data);
    }

    await next();
  };
}