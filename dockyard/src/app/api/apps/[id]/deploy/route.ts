import { NextRequest } from "next/server";

import { apiError, handleRouteError, json } from "@/lib/http";
import { queueDeployment } from "@/services/deployments";

type Params = { params: Promise<{ id: string }> };

export async function POST(_: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const deployment = await queueDeployment(id);
    return json({ deployment }, { status: 202 });
  } catch (error) {
    return error instanceof Error
      ? apiError(error.message, 400)
      : handleRouteError(error);
  }
}
