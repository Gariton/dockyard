import { NextRequest } from "next/server";

import { apiError, handleRouteError, json, parseJson } from "@/lib/http";
import { envPatchSchema } from "@/lib/validation";
import { deleteEnvVar, updateEnvVar } from "@/services/env-vars";

type Params = { params: Promise<{ id: string; envId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id, envId } = await params;
    const input = await parseJson(request, envPatchSchema);
    const env = await updateEnvVar(id, envId, input);
    return json({ env: { ...env, encryptedValue: undefined } });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id, envId } = await params;
    await deleteEnvVar(id, envId);
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
