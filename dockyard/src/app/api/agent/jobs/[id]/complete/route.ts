import { NextRequest } from "next/server";

import {
  apiError,
  handleRouteError,
  json,
  parseJson,
  requireAgentAuth,
} from "@/lib/http";
import { jobCompleteSchema } from "@/lib/validation";
import { completeJob } from "@/services/agent";

type Params = { params: Promise<{ id: string }> };

export async function POST(request: NextRequest, { params }: Params) {
  const unauthorized = requireAgentAuth(request);
  if (unauthorized) return unauthorized;

  try {
    const { id } = await params;
    const input = await parseJson(request, jobCompleteSchema);
    const deployment = await completeJob(id, input);
    return json({ deployment });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
