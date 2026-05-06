import { and, asc, eq } from "drizzle-orm";

import { db } from "@/db";
import {
  agentJobs,
  appEnvVars,
  apps,
  deploymentLogs,
  deployments,
  servers,
} from "@/db/schema";
import { decryptValue } from "@/lib/crypto";
import type { deploymentLogSchema, jobCompleteSchema } from "@/lib/validation";
import { makeId } from "@/services/ids";
import { upsertHeartbeat, type HeartbeatInput } from "@/services/servers";
import { z } from "zod";

export type CompleteJobInput = z.infer<typeof jobCompleteSchema>;
export type DeploymentLogInput = z.infer<typeof deploymentLogSchema>;

export async function receiveHeartbeat(input: HeartbeatInput) {
  return upsertHeartbeat(input);
}

export async function pickNextJob(agentId: string) {
  return db.transaction(async (tx) => {
    const [server] = await tx
      .select()
      .from(servers)
      .where(eq(servers.agentId, agentId))
      .limit(1);

    if (!server) {
      return null;
    }

    const [job] = await tx
      .select()
      .from(agentJobs)
      .where(and(eq(agentJobs.agentId, agentId), eq(agentJobs.status, "queued")))
      .orderBy(asc(agentJobs.createdAt))
      .limit(1);

    if (!job) {
      return null;
    }

    await tx
      .update(agentJobs)
      .set({ status: "running", pickedAt: new Date() })
      .where(eq(agentJobs.id, job.id));

    await tx
      .update(deployments)
      .set({ status: "running", startedAt: new Date() })
      .where(eq(deployments.id, job.deploymentId));

    const [deployment] = await tx
      .select()
      .from(deployments)
      .where(eq(deployments.id, job.deploymentId))
      .limit(1);

    const [app] = await tx
      .select()
      .from(apps)
      .where(eq(apps.id, deployment.appId))
      .limit(1);

    const envRows = await tx
      .select()
      .from(appEnvVars)
      .where(eq(appEnvVars.appId, app.id));

    const env = Object.fromEntries(
      envRows.map((row) => [row.key, decryptValue(row.encryptedValue)])
    );

    const healthcheckUrl = `http://localhost:${app.publicPort}${app.healthcheckPath}`;

    return {
      jobId: job.id,
      deploymentId: deployment.id,
      appName: app.name,
      gitUrl: app.gitUrl,
      branch: app.branch,
      composeFile: app.composeFilePath,
      env,
      healthcheckUrl,
    };
  });
}

export async function completeJob(jobId: string, input: CompleteJobInput) {
  const finishedAt = new Date();

  return db.transaction(async (tx) => {
    const [job] = await tx
      .select()
      .from(agentJobs)
      .where(eq(agentJobs.id, jobId))
      .limit(1);

    if (!job) {
      throw new Error("Job not found.");
    }

    if (job.deploymentId !== input.deploymentId) {
      throw new Error("Deployment does not match job.");
    }

    await tx
      .update(agentJobs)
      .set({ status: input.status, finishedAt })
      .where(eq(agentJobs.id, jobId));

    const [deployment] = await tx
      .update(deployments)
      .set({
        status: input.status,
        commitSha: input.commitSha,
        errorMessage: input.errorMessage,
        finishedAt,
      })
      .where(eq(deployments.id, input.deploymentId))
      .returning();

    await tx.insert(deploymentLogs).values({
      id: makeId("log"),
      deploymentId: input.deploymentId,
      level: input.status === "success" ? "info" : "error",
      message:
        input.status === "success"
          ? "Deployment completed successfully."
          : input.errorMessage ?? "Deployment failed.",
    });

    return deployment;
  });
}

export async function addDeploymentLog(input: DeploymentLogInput) {
  const [row] = await db
    .insert(deploymentLogs)
    .values({
      id: makeId("log"),
      deploymentId: input.deploymentId,
      level: input.level,
      message: input.message,
    })
    .returning();

  return row;
}
