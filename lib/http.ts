import "server-only";
import { z } from "zod";
import { QlooError } from "@/lib/qloo/client";
import { ModelUnavailableError } from "@/lib/agent/run";

export type ApiErrorCode =
  | "qloo_unavailable"
  | "qloo_quota"
  | "model_unavailable"
  | "invalid_input"
  | "locality_not_found"
  | "rate_limited";

// Honest, plain messages. They never pretend data exists when it does not.
export const ERROR_COPY: Record<ApiErrorCode, string> = {
  qloo_unavailable:
    "We could not reach our taste data right now, so we cannot suggest real places. Nothing is shown rather than guesses. Please try again in a few minutes.",
  qloo_quota:
    "This demo has used its taste data allowance for the month. We will not show made up places instead.",
  model_unavailable: "The planner is unavailable right now. Please try again shortly.",
  invalid_input: "Something in the request was not valid.",
  locality_not_found: "We could not find that neighborhood in the United States.",
  rate_limited: "Too many requests in a short time. Please wait a little and try again.",
};

export function toApiError(e: unknown): { code: ApiErrorCode; message: string; status: number } {
  if (e instanceof QlooError) {
    const code = e.code === "qloo_quota" ? "qloo_quota" : "qloo_unavailable";
    return { code, message: ERROR_COPY[code], status: code === "qloo_quota" ? 503 : 502 };
  }
  if (e instanceof ModelUnavailableError) return { code: "model_unavailable", message: ERROR_COPY.model_unavailable, status: 503 };
  if (e instanceof z.ZodError) return { code: "invalid_input", message: ERROR_COPY.invalid_input, status: 400 };
  return { code: "qloo_unavailable", message: ERROR_COPY.qloo_unavailable, status: 500 };
}

export function errorJson(e: unknown): Response {
  const err = toApiError(e);
  return Response.json({ error: err.code, message: err.message }, { status: err.status });
}

export async function readBody<T extends z.ZodTypeAny>(req: Request, schema: T): Promise<z.infer<T>> {
  const json = await req.json().catch(() => {
    throw new z.ZodError([]);
  });
  return schema.parse(json);
}
