import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { appRuntimeConfigs, apps, deployments, servers } from "@/db/schema";
import type { AppInput } from "@/lib/validation";
import { makeId } from "@/services/ids";
import { defaultRuntimeConfig } from "@/services/runtime-configs";

const hostPortStart = 18000;
const hostPortEnd = 19999;

export async function listApps() {
  const rows = await db.select().from(apps).orderBy(desc(apps.updatedAt));

  return Promise.all(
    rows.map(async (app) => {
      const [latestDeployment] = await db
        .select()
        .from(deployments)
        .where(eq(deployments.appId, app.id))
        .orderBy(desc(deployments.createdAt))
        .limit(1);
      const serverId = app.pinnedServerId ?? app.manualServerId;
      const [server] = serverId
        ? await db.select().from(servers).where(eq(servers.id, serverId)).limit(1)
        : [];

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
  if (input.placementStrategy === "manual" && !input.manualServerId) {
    throw new Error("Manual placement requires a server.");
  }

  const appId = makeId("app");
  const publicPort = input.publicPort ?? (await allocatePublicPort());

  return db.transaction(async (tx) => {
    const [row] = await tx
      .insert(apps)
      .values({
        id: appId,
        name: input.name,
        gitUrl: input.gitUrl,
        branch: input.branch,
        domain: input.domain,
        composeFilePath: input.composeFilePath,
        publicPort,
        healthcheckPath: input.healthcheckPath,
        targetMode: input.placementStrategy === "manual" ? "manual" : "auto",
        stateMode: input.stateMode,
        placementStrategy: input.placementStrategy,
        manualServerId:
          input.placementStrategy === "manual" ? input.manualServerId : null,
        updatedAt: new Date(),
      })
      .returning();

    await tx.insert(appRuntimeConfigs).values({
      id: makeId("run"),
      appId,
      ...defaultRuntimeConfig,
      healthcheckPath: input.healthcheckPath,
      containerPort: 3000,
      updatedAt: new Date(),
    });

    return row;
  });
}

export async function allocatePublicPort() {
  const rows = await db.select({ publicPort: apps.publicPort }).from(apps);
  const used = new Set(rows.map((row) => row.publicPort));

  for (let port = hostPortStart; port <= hostPortEnd; port++) {
    if (!used.has(port)) {
      return port;
    }
  }

  throw new Error(`No available host port in ${hostPortStart}-${hostPortEnd}.`);
}

export async function assertPublicPortAvailable(port: number, appId: string) {
  const [existing] = await db
    .select({ id: apps.id })
    .from(apps)
    .where(eq(apps.publicPort, port))
    .limit(1);

  if (existing && existing.id !== appId) {
    throw new Error(`Public port ${port} is already assigned.`);
  }
}

export async function updateApp(id: string, input: Partial<AppInput>) {
  if (input.publicPort !== undefined) {
    await assertPublicPortAvailable(input.publicPort, id);
  }

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
  if (input.stateMode !== undefined) changes.stateMode = input.stateMode;
  if (input.placementStrategy !== undefined) {
    changes.placementStrategy = input.placementStrategy;
    changes.targetMode = input.placementStrategy === "manual" ? "manual" : "auto";
    if (input.placementStrategy !== "manual") {
      changes.manualServerId = null;
    }
  }
  if (input.targetMode !== undefined && input.placementStrategy === undefined) {
    changes.targetMode = input.targetMode;
    changes.placementStrategy = input.targetMode;
  }
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
  const [app] = await db.select().from(apps).where(eq(apps.id, id)).limit(1);

  if (!app) {
    return null;
  }

  const serverId = app.pinnedServerId ?? app.manualServerId;
  const [server] = serverId
    ? await db.select().from(servers).where(eq(servers.id, serverId)).limit(1)
    : [];

  return { app, server: server ?? null };
}

export async function setPinnedServer(appId: string, serverId: string) {
  await db
    .update(apps)
    .set({ pinnedServerId: serverId, updatedAt: new Date() })
    .where(eq(apps.id, appId));
}
