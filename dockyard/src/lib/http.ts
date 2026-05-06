import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";

import { getAgentSharedToken } from "@/lib/config";

export function json(data: unknown, init?: ResponseInit) {
  return NextResponse.json(data, init);
}

export function apiError(message: string, status = 400) {
  return json({ error: message }, { status });
}

export async function parseJson<T>(
  request: NextRequest,
  parser: { parse: (value: unknown) => T }
) {
  try {
    return parser.parse(await request.json());
  } catch (error) {
    if (error instanceof ZodError) {
      throw new RequestValidationError(error.issues.map((issue) => issue.message).join(", "));
    }
    throw error;
  }
}

export class RequestValidationError extends Error {}

export function requireAgentAuth(request: NextRequest) {
  const expected = getAgentSharedToken();
  const header = request.headers.get("authorization") ?? "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || token !== expected) {
    return apiError("Unauthorized", 401);
  }

  return null;
}

export function handleRouteError(error: unknown) {
  if (error instanceof RequestValidationError) {
    return apiError(error.message, 400);
  }

  if (error instanceof Error) {
    return apiError(error.message, 500);
  }

  return apiError("Unexpected error", 500);
}
