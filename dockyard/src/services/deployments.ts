import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  agentJobs,
  apps,
  deploymentLogs,
  deployments,
  servers,
  type App,
  type AppManagedVolume,
} from "@/db/schema";
import { generateComposeYaml } from "@/services/compose";
import { configureDeploymentDns } from "@/services/dns";
import { buildDeploymentEnv } from "@/services/env-vars";
import { makeId } from "@/services/ids";
import {
  getManagedVolumeRows,
  toManagedVolumePayload,
} from "@/services/managed-volumes";
import { prepareResourceBindings } from "@/services/resources";
import { getRuntimeConfig } from "@/services/runtime-configs";
import { getServerById, selectServerByScore } from "@/services/servers";

export async function queueDeployment(appId: string) {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);

  if (!app) {
    throw new Error("App not found.");
  }

  const volumes = await getManagedVolumeRows(app.id);
  const server = await selectDeploymentServer(app, volumes);

  if (!server) {
    throw new Error("Target server not found.");
  }

  if (server.status !== "online") {
    throw new Error("Target server is not online.");
  }

  const deploymentId = makeId("dep");
  const jobId = makeId("job");
  const runtime = await getRuntimeConfig(app.id);
  const resourceEnv = await prepareResourceBindings(app.id);
  const env = await buildDeploymentEnv(app.id, runtime, resourceEnv);
  const generatedComposeYaml = generateComposeYaml(app, runtime, volumes);
  const managedVolumes = toManagedVolumePayload(app.name, volumes);
  const healthcheckUrl = `http://localhost:${app.publicPort}${runtime.healthcheckPath}`;
  const dnsResult = await configureDeploymentDns({
    domain: app.domain,
    targetIp: server.ipAddress,
  });

  return db.transaction(async (tx) => {
    if (app.placementStrategy === "pinned" && !app.pinnedServerId) {
      await tx
        .update(apps)
        .set({ pinnedServerId: server.id, updatedAt: new Date() })
        .where(eq(apps.id, app.id));
    }

    const [deployment] = await tx
      .insert(deployments)
      .values({
        id: deploymentId,
        appId: app.id,
        serverId: server.id,
        status: "queued",
        gitRef: app.branch,
      })
      .returning();

    await tx.insert(agentJobs).values({
      id: jobId,
      agentId: server.agentId,
      deploymentId,
      type: "deploy",
      status: "queued",
      payloadJson: {
        jobId,
        deploymentId,
        appName: app.name,
        gitUrl: app.gitUrl,
        branch: app.branch,
        generatedComposeYaml,
        env,
        managedVolumes,
        healthcheckUrl,
      },
    });

    await tx.insert(deploymentLogs).values({
      id: makeId("log"),
      deploymentId,
      level: "info",
      message: `Deployment queued for ${server.hostname}.`,
    });

    if (dnsResult.configured) {
      await tx.insert(deploymentLogs).values({
        id: makeId("log"),
        deploymentId,
        level: "info",
        message: `PowerDNS ${dnsResult.recordType} record ${dnsResult.recordName} -> ${dnsResult.target} updated.`,
      });
    }

    return deployment;
  });
}

async function selectDeploymentServer(
  app: App,
  volumes: AppManagedVolume[]
) {
  const hasLocalVolume = volumes.some((volume) => volume.backend === "local");

  if (hasLocalVolume && app.placementStrategy === "auto") {
    throw new Error("Apps with local managed volumes must use manual or pinned placement.");
  }

  if (app.placementStrategy === "manual") {
    if (!app.manualServerId) {
      throw new Error("Manual placement requires a server.");
    }
    return getServerById(app.manualServerId);
  }

  if (app.placementStrategy === "pinned") {
    if (app.pinnedServerId) {
      return getServerById(app.pinnedServerId);
    }
    if (app.manualServerId) {
      return getServerById(app.manualServerId);
    }
  }

  return selectServerByScore();
}

export async function listDeployments() {
  return db
    .select({
      deployment: deployments,
      app: apps,
      server: servers,
    })
    .from(deployments)
    .innerJoin(apps, eq(deployments.appId, apps.id))
    .innerJoin(servers, eq(deployments.serverId, servers.id))
    .orderBy(desc(deployments.createdAt));
}

export async function listDeploymentsForApp(appId: string) {
  return db
    .select({
      deployment: deployments,
      server: servers,
    })
    .from(deployments)
    .innerJoin(servers, eq(deployments.serverId, servers.id))
    .where(eq(deployments.appId, appId))
    .orderBy(desc(deployments.createdAt));
}

export async function listLogsForDeployment(deploymentId: string) {
  return db
    .select()
    .from(deploymentLogs)
    .where(eq(deploymentLogs.deploymentId, deploymentId))
    .orderBy(desc(deploymentLogs.createdAt));
}

export async function getDashboardStats() {
  const [appRows, serverRows, deploymentRows] = await Promise.all([
    db.select().from(apps),
    db.select().from(servers),
    db.select().from(deployments).orderBy(desc(deployments.createdAt)).limit(8),
  ]);

  return {
    appCount: appRows.length,
    serverCount: serverRows.length,
    onlineServerCount: serverRows.filter((server) => server.status === "online").length,
    latestDeployments: deploymentRows,
  };
}
