import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { servers, type Server } from "@/db/schema";
import type { heartbeatSchema } from "@/lib/validation";
import { makeId } from "@/services/ids";
import { z } from "zod";

export type HeartbeatInput = z.infer<typeof heartbeatSchema>;

export async function listServers() {
  return db.select().from(servers).orderBy(desc(servers.lastHeartbeatAt));
}

export async function listOnlineServers() {
  return db.select().from(servers).where(eq(servers.status, "online"));
}

export async function upsertHeartbeat(input: HeartbeatInput) {
  const now = new Date();

  const [row] = await db
    .insert(servers)
    .values({
      id: makeId("srv"),
      agentId: input.agentId,
      hostname: input.hostname,
      ipAddress: input.ipAddress,
      status: "online",
      cpuUsagePercent: input.cpuUsagePercent,
      memoryTotalMb: input.memoryTotalMb,
      memoryUsedMb: input.memoryUsedMb,
      diskTotalMb: input.diskTotalMb,
      diskUsedMb: input.diskUsedMb,
      runningAppCount: input.runningAppCount,
      lastHeartbeatAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: servers.agentId,
      set: {
        hostname: input.hostname,
        ipAddress: input.ipAddress,
        status: "online",
        cpuUsagePercent: input.cpuUsagePercent,
        memoryTotalMb: input.memoryTotalMb,
        memoryUsedMb: input.memoryUsedMb,
        diskTotalMb: input.diskTotalMb,
        diskUsedMb: input.diskUsedMb,
        runningAppCount: input.runningAppCount,
        lastHeartbeatAt: now,
        updatedAt: now,
      },
    })
    .returning();

  return row;
}

export function scoreServer(server: Server) {
  const freeMemoryMb = Math.max(0, server.memoryTotalMb - server.memoryUsedMb);
  const freeDiskMb = Math.max(0, server.diskTotalMb - server.diskUsedMb);

  return (
    freeMemoryMb +
    freeDiskMb / 1024 -
    server.runningAppCount * 512 -
    server.cpuUsagePercent * 10
  );
}

export async function selectServerByScore() {
  const candidates = await listOnlineServers();

  if (candidates.length === 0) {
    throw new Error("No online server is available.");
  }

  return candidates.toSorted((a, b) => scoreServer(b) - scoreServer(a))[0];
}

export async function getServerById(id: string) {
  const [server] = await db.select().from(servers).where(eq(servers.id, id)).limit(1);
  return server ?? null;
}
