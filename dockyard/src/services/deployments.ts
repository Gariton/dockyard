import { desc, eq } from "drizzle-orm";

import { db } from "@/db";
import { agentJobs, apps, deploymentLogs, deployments, servers } from "@/db/schema";
import { makeId } from "@/services/ids";
import { getServerById, selectServerByScore } from "@/services/servers";

export async function queueDeployment(appId: string) {
  const [app] = await db.select().from(apps).where(eq(apps.id, appId)).limit(1);

  if (!app) {
    throw new Error("App not found.");
  }

  const server =
    app.targetMode === "manual" && app.manualServerId
      ? await getServerById(app.manualServerId)
      : await selectServerByScore();

  if (!server) {
    throw new Error("Target server not found.");
  }

  if (server.status !== "online") {
    throw new Error("Target server is not online.");
  }

  const deploymentId = makeId("dep");
  const jobId = makeId("job");

  return db.transaction(async (tx) => {
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
      payloadJson: { appId: app.id },
    });

    await tx.insert(deploymentLogs).values({
      id: makeId("log"),
      deploymentId,
      level: "info",
      message: `Deployment queued for ${server.hostname}.`,
    });

    return deployment;
  });
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
