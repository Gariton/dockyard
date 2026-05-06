import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { apps, deployments, servers } from "@/db/schema";
import type { AppInput } from "@/lib/validation";
import { makeId } from "@/services/ids";

export async function listApps() {
  const rows = await db
    .select({
      app: apps,
      server: servers,
    })
    .from(apps)
    .leftJoin(servers, eq(apps.manualServerId, servers.id))
    .orderBy(desc(apps.updatedAt));

  return Promise.all(
    rows.map(async ({ app, server }) => {
      const [latestDeployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.appId, app.id))
        .orderBy(desc(deployments.createdAt))
        .limit(1);

      return {
        ...app,
        assignedServer: server?.hostname ?? null,
        latestDeploymentStatus: latestDeployment?.status ?? null,
        latestDeployedCommit: latestDeployment?.commitSha ?? null,
      };
    })
  );
}

export async function createApp(input: AppInput) {
  if (input.targetMode === "manual" && !input.manualServerId) {
    throw new Error("Manual target mode requires a server.");
  }

  const [row] = await db
    .insert(apps)
    .values({
      id: makeId("app"),
      name: input.name,
      gitUrl: input.gitUrl,
      branch: input.branch,
      domain: input.domain,
      composeFilePath: input.composeFilePath,
      publicPort: input.publicPort,
      healthcheckPath: input.healthcheckPath,
      targetMode: input.targetMode,
      manualServerId: input.targetMode === "manual" ? input.manualServerId : null,
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function updateApp(id: string, input: Partial<AppInput>) {
  const changes: Partial<typeof apps.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) changes.name = input.name;
  if (input.gitUrl !== undefined) changes.gitUrl = input.gitUrl;
  if (input.branch !== undefined) changes.branch = input.branch;
  if (input.domain !== undefined) changes.domain = input.domain;
  if (input.composeFilePath !== undefined) changes.composeFilePath = input.composeFilePath;
  if (input.publicPort !== undefined) changes.publicPort = input.publicPort;
  if (input.healthcheckPath !== undefined) changes.healthcheckPath = input.healthcheckPath;
  if (input.targetMode !== undefined) changes.targetMode = input.targetMode;
  if (input.manualServerId !== undefined) changes.manualServerId = input.manualServerId;
  if (input.targetMode === "auto") changes.manualServerId = null;

  const [row] = await db.update(apps).set(changes).where(eq(apps.id, id)).returning();

  if (!row) {
    throw new Error("App not found.");
  }

  return row;
}

export async function deleteApp(id: string) {
  await db.delete(apps).where(eq(apps.id, id));
}

export async function getApp(id: string) {
  const [row] = await db
    .select({
      app: apps,
      server: servers,
    })
    .from(apps)
    .leftJoin(servers, eq(apps.manualServerId, servers.id))
    .where(eq(apps.id, id))
    .limit(1);

  return row ?? null;
}
