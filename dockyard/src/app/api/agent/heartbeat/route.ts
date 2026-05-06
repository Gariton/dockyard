import { NextRequest } from "next/server";

import {
  apiError,
  handleRouteError,
  json,
  parseJson,
  requireAgentAuth,
} from "@/lib/http";
import { heartbeatSchema } from "@/lib/validation";
import { receiveHeartbeat } from "@/services/agent";

export async function POST(request: NextRequest) {
  const unauthorized = requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const input = await parseJson(request, heartbeatSchema);
    const server = await receiveHeartbeat(input);
    return json({ server });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
