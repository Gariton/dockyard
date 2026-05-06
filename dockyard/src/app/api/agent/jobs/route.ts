import { NextRequest } from "next/server";

import { apiError, handleRouteError, json, requireAgentAuth } from "@/lib/http";
import { pickNextJob } from "@/services/agent";

export async function GET(request: NextRequest) {
  const unauthorized = requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const agentId = request.nextUrl.searchParams.get("agentId");

    if (!agentId) {
      return apiError("agentId is required.", 400);
    }

    const job = await pickNextJob(agentId);
    return json({ job });
  } catch (error) {
    return handleRouteError(error);
  }
}
