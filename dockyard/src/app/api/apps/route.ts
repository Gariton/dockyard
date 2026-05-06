import { NextRequest } from "next/server";

import { apiError, handleRouteError, json, parseJson } from "@/lib/http";
import { appInputSchema } from "@/lib/validation";
import { createApp, listApps } from "@/services/apps";

export async function GET() {
  try {
    return json({ apps: await listApps() });
  } catch (error) {
    return handleRouteError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const input = await parseJson(request, appInputSchema);
    const app = await createApp(input);
    return json({ app }, { status: 201 });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
