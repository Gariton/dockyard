"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  appInputSchema,
  envInputSchema,
  managedVolumeInputSchema,
  resourceBindingInputSchema,
  resourceProviderInputSchema,
  resourceProviderPatchSchema,
  runtimeConfigInputSchema,
} from "@/lib/validation";
import { createApp } from "@/services/apps";
import { createEnvVar, deleteEnvVar } from "@/services/env-vars";
import { queueDeployment } from "@/services/deployments";
import {
  createManagedVolume,
  deleteManagedVolume,
} from "@/services/managed-volumes";
import {
  createResourceBinding,
  createResourceProvider,
  deleteResourceBinding,
  deleteResourceProvider,
  testResourceProvider,
  updateResourceProvider,
} from "@/services/resources";
import { updateRuntimeConfig } from "@/services/runtime-configs";

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function jsonObjectFromForm(formData: FormData, key: string, required = false) {
  const raw = String(formData.get(key) ?? "").trim();

  if (!raw) {
    if (required) {
      throw new Error(`${key} is required.`);
    }
    return undefined;
  }

  const parsed = JSON.parse(raw) as unknown;

  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${key} must be a JSON object.`);
  }

  return parsed as Record<string, unknown>;
}

export async function createAppAction(formData: FormData) {
  const input = appInputSchema.parse({
    name: formData.get("name"),
    gitUrl: formData.get("gitUrl"),
    branch: formData.get("branch"),
    domain: formData.get("domain"),
    composeFilePath: formData.get("composeFilePath"),
    publicPort: formData.get("publicPort"),
    healthcheckPath: formData.get("healthcheckPath"),
    targetMode: formData.get("placementStrategy") === "manual" ? "manual" : "auto",
    stateMode: formData.get("stateMode"),
    placementStrategy: formData.get("placementStrategy"),
    manualServerId: formData.get("manualServerId"),
  });

  const app = await createApp(input);
  revalidatePath("/apps");
  redirect(`/apps/${app.id}`);
}

export async function createEnvVarAction(appId: string, formData: FormData) {
  const input = envInputSchema.parse({
    key: formData.get("key"),
    value: formData.get("value"),
    isSecret: checkbox(formData, "isSecret"),
    required: checkbox(formData, "required"),
  });

  await createEnvVar(appId, input);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function deleteEnvVarAction(appId: string, envId: string) {
  await deleteEnvVar(appId, envId);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function deployAppAction(appId: string) {
  await queueDeployment(appId);
  revalidatePath(`/apps/${appId}`);
  revalidatePath("/deployments");
  redirect(`/apps/${appId}`);
}

export async function updateRuntimeConfigAction(appId: string, formData: FormData) {
  const input = runtimeConfigInputSchema.parse({
    buildContext: formData.get("buildContext"),
    dockerfilePath: formData.get("dockerfilePath"),
    command: formData.get("command"),
    workingDir: formData.get("workingDir"),
    containerPort: formData.get("containerPort"),
    healthcheckPath: formData.get("healthcheckPath"),
    healthcheckIntervalSeconds: formData.get("healthcheckIntervalSeconds"),
    healthcheckTimeoutSeconds: formData.get("healthcheckTimeoutSeconds"),
    cpuLimit: formData.get("cpuLimit"),
    memoryLimitMb: formData.get("memoryLimitMb"),
    restartPolicy: formData.get("restartPolicy"),
  });

  await updateRuntimeConfig(appId, input);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function createResourceProviderAction(formData: FormData) {
  const input = resourceProviderInputSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    endpoint: formData.get("endpoint"),
    configJson: jsonObjectFromForm(formData, "configJson") ?? {},
    adminSecretJson: jsonObjectFromForm(formData, "adminSecretJson", true),
  });

  const provider = await createResourceProvider(input);
  revalidatePath("/resources");
  redirect(`/resources/${provider.id}`);
}

export async function updateResourceProviderAction(id: string, formData: FormData) {
  const adminSecretJson = jsonObjectFromForm(formData, "adminSecretJson");
  const input = resourceProviderPatchSchema.parse({
    name: formData.get("name"),
    type: formData.get("type"),
    endpoint: formData.get("endpoint"),
    configJson: jsonObjectFromForm(formData, "configJson") ?? {},
    ...(adminSecretJson ? { adminSecretJson } : {}),
  });

  await updateResourceProvider(id, input);
  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}`);
}

export async function deleteResourceProviderAction(id: string) {
  await deleteResourceProvider(id);
  revalidatePath("/resources");
  redirect("/resources");
}

export async function testResourceProviderAction(id: string) {
  await testResourceProvider(id);
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}?test=ok`);
}

export async function createResourceBindingAction(appId: string, formData: FormData) {
  const input = resourceBindingInputSchema.parse({
    providerId: formData.get("providerId"),
    type: formData.get("type"),
    logicalName: formData.get("logicalName"),
    configJson: jsonObjectFromForm(formData, "configJson") ?? {},
    autoCreate: checkbox(formData, "autoCreate"),
  });

  await createResourceBinding(appId, input);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function deleteResourceBindingAction(appId: string, bindingId: string) {
  await deleteResourceBinding(appId, bindingId);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function createManagedVolumeAction(appId: string, formData: FormData) {
  const input = managedVolumeInputSchema.parse({
    name: formData.get("name"),
    mountPath: formData.get("mountPath"),
    backend: formData.get("backend"),
    movable: checkbox(formData, "movable"),
    serverId: formData.get("serverId"),
    sizeLimitMb: formData.get("sizeLimitMb"),
    nfsServer: formData.get("nfsServer"),
    nfsPath: formData.get("nfsPath"),
  });

  await createManagedVolume(appId, input);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}

export async function deleteManagedVolumeAction(appId: string, volumeId: string) {
  await deleteManagedVolume(appId, volumeId);
  revalidatePath(`/apps/${appId}`);
  redirect(`/apps/${appId}`);
}
