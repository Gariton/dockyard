import { eq } from "drizzle-orm";

import { db } from "@/db";
import { appRuntimeConfigs, type AppRuntimeConfig } from "@/db/schema";
import type { RuntimeConfigInput } from "@/lib/validation";
import { makeId } from "@/services/ids";

export const defaultRuntimeConfig = {
  buildContext: ".",
  dockerfilePath: "Dockerfile",
  command: null,
  workingDir: null,
  containerPort: 3000,
  healthcheckPath: "/",
  healthcheckIntervalSeconds: 30,
  healthcheckTimeoutSeconds: 5,
  cpuLimit: null,
  memoryLimitMb: null,
  restartPolicy: "unless-stopped",
} satisfies Omit<AppRuntimeConfig, "id" | "appId" | "createdAt" | "updatedAt">;

export async function createDefaultRuntimeConfig(appId: string) {
  const [row] = await db
    .insert(appRuntimeConfigs)
    .values({
      id: makeId("run"),
      appId,
      ...defaultRuntimeConfig,
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function getRuntimeConfig(appId: string) {
  const [row] = await db
    .select()
    .from(appRuntimeConfigs)
    .where(eq(appRuntimeConfigs.appId, appId))
    .limit(1);

  if (row) {
    return row;
  }

  return createDefaultRuntimeConfig(appId);
}

export async function updateRuntimeConfig(appId: string, input: RuntimeConfigInput) {
  const now = new Date();
  const existing = await getRuntimeConfig(appId);

  const [row] = await db
    .update(appRuntimeConfigs)
    .set({
      buildContext: input.buildContext,
      dockerfilePath: input.dockerfilePath,
      command: input.command,
      workingDir: input.workingDir,
      containerPort: input.containerPort,
      healthcheckPath: input.healthcheckPath,
      healthcheckIntervalSeconds: input.healthcheckIntervalSeconds,
      healthcheckTimeoutSeconds: input.healthcheckTimeoutSeconds,
      cpuLimit: input.cpuLimit,
      memoryLimitMb: input.memoryLimitMb,
      restartPolicy: input.restartPolicy,
      updatedAt: now,
    })
    .where(eq(appRuntimeConfigs.id, existing.id))
    .returning();

  return row;
}
