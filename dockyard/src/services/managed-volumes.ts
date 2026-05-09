import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appManagedVolumes, servers, type AppManagedVolume } from "@/db/schema";
import type { ManagedVolumeInput } from "@/lib/validation";
import { makeId } from "@/services/ids";

export type ManagedVolumePayload = {
  name: string;
  backend: "local" | "nfs";
  hostPath?: string;
  mountPath: string;
};

export function localVolumeHostPath(appName: string, volumeName: string) {
  return `/opt/dockyard/volumes/${appName}/${volumeName}`;
}

export async function listManagedVolumes(appId: string) {
  return db
    .select({
      volume: appManagedVolumes,
      server: servers,
    })
    .from(appManagedVolumes)
    .leftJoin(servers, eq(appManagedVolumes.serverId, servers.id))
    .where(eq(appManagedVolumes.appId, appId))
    .orderBy(appManagedVolumes.name);
}

export async function createManagedVolume(appId: string, input: ManagedVolumeInput) {
  if (input.backend === "local" && input.movable) {
    throw new Error("Local managed volumes cannot be movable.");
  }

  if (input.backend === "nfs" && (!input.nfsServer || !input.nfsPath)) {
    throw new Error("NFS volumes require both nfsServer and nfsPath.");
  }

  const [row] = await db
    .insert(appManagedVolumes)
    .values({
      id: makeId("vol"),
      appId,
      name: input.name,
      mountPath: input.mountPath,
      backend: input.backend,
      movable: input.backend === "nfs" ? input.movable : false,
      serverId: input.serverId,
      sizeLimitMb: input.sizeLimitMb,
      nfsServer: input.backend === "nfs" ? input.nfsServer : null,
      nfsPath: input.backend === "nfs" ? input.nfsPath : null,
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function deleteManagedVolume(appId: string, volumeId: string) {
  await db
    .delete(appManagedVolumes)
    .where(and(eq(appManagedVolumes.appId, appId), eq(appManagedVolumes.id, volumeId)));
}

export async function getManagedVolumeRows(appId: string) {
  return db.select().from(appManagedVolumes).where(eq(appManagedVolumes.appId, appId));
}

export function toManagedVolumePayload(
  appName: string,
  volumes: AppManagedVolume[]
): ManagedVolumePayload[] {
  return volumes.map((volume) => ({
    name: volume.name,
    backend: volume.backend,
    hostPath:
      volume.backend === "local"
        ? localVolumeHostPath(appName, volume.name)
        : undefined,
    mountPath: volume.mountPath,
  }));
}
