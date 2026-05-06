import { handleRouteError, json } from "@/lib/http";
import { listServers } from "@/services/servers";

export async function GET() {
  try {
    return json({ servers: await listServers() });
  } catch (error) {
    return handleRouteError(error);
  }
}
