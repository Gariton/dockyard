import { NextRequest } from "next/server";

import {
  apiError,
  handleRouteError,
  json,
  parseJson,
  requireAgentAuth,
} from "@/lib/http";
import { deploymentLogSchema } from "@/lib/validation";
import { addDeploymentLog } from "@/services/agent";

export async function POST(request: NextRequest) {
  const unauthorized = requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const input = await parseJson(request, deploymentLogSchema);
    const log = await addDeploymentLog(input);
    return json({ log }, { status: 201 });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
