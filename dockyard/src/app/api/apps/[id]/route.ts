import { NextRequest } from "next/server";

import { apiError, handleRouteError, json, parseJson } from "@/lib/http";
import { appPatchSchema } from "@/lib/validation";
import { deleteApp, getApp, updateApp } from "@/services/apps";

type Params = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const app = await getApp(id);

    if (!app) {
      return apiError("App not found.", 404);
    }

    return json(app);
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function PATCH(request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const input = await parseJson(request, appPatchSchema);
    const app = await updateApp(id, input);
    return json({ app });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}

export async function DELETE(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await deleteApp(id);
    return json({ ok: true });
  } catch (error) {
    return handleRouteError(error);
  }
}
