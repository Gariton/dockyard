import { NextRequest } from "next/server";

import { apiError, handleRouteError, json, parseJson } from "@/lib/http";
import { envInputSchema } from "@/lib/validation";
import { createEnvVar, listEnvVars } from "@/services/env-vars";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    return json({ env: await listEnvVars(id) });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = await parseJson(request, envInputSchema);
    const env = await createEnvVar(id, input);
    return json({ env: { ...env, encryptedValue: undefined } }, { status: 201 });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
