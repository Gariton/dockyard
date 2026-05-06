"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { appInputSchema, envInputSchema } from "@/lib/validation";
import { createApp } from "@/services/apps";
import { createEnvVar, deleteEnvVar } from "@/services/env-vars";
import { queueDeployment } from "@/services/deployments";

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
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
    targetMode: formData.get("targetMode"),
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
