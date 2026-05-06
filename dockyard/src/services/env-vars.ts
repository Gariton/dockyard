import { and, eq } from "drizzle-orm";

import { db } from "@/db";
import { appEnvVars } from "@/db/schema";
import { decryptValue, encryptValue } from "@/lib/crypto";
import type { EnvInput } from "@/lib/validation";
import { makeId } from "@/services/ids";

export type SanitizedEnvVar = {
  id: string;
  key: string;
  value: string;
  isSecret: boolean;
  required: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export function maskSecret(value: string) {
  return value.length > 0 ? "********" : "";
}

export async function listEnvVars(appId: string): Promise<SanitizedEnvVar[]> {
  const rows = await db
    .select()
    .from(appEnvVars)
    .where(eq(appEnvVars.appId, appId))
    .orderBy(appEnvVars.key);

  return rows.map((row) => {
    const value = decryptValue(row.encryptedValue);
    return {
      id: row.id,
      key: row.key,
      value: row.isSecret ? maskSecret(value) : value,
      isSecret: row.isSecret,
      required: row.required,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  });
}

export async function createEnvVar(appId: string, input: EnvInput) {
  const existing = await db
    .select({ id: appEnvVars.id })
    .from(appEnvVars)
    .where(and(eq(appEnvVars.appId, appId), eq(appEnvVars.key, input.key)))
    .limit(1);

  if (existing.length > 0) {
    throw new Error(`Env key ${input.key} already exists.`);
  }

  const [row] = await db
    .insert(appEnvVars)
    .values({
      id: makeId("env"),
      appId,
      key: input.key,
      encryptedValue: encryptValue(input.value),
      isSecret: input.isSecret,
      required: input.required,
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function updateEnvVar(
  appId: string,
  envId: string,
  input: Partial<EnvInput>
) {
  const changes: Partial<typeof appEnvVars.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.key !== undefined) changes.key = input.key;
  if (input.value !== undefined) changes.encryptedValue = encryptValue(input.value);
  if (input.isSecret !== undefined) changes.isSecret = input.isSecret;
  if (input.required !== undefined) changes.required = input.required;

  const [row] = await db
    .update(appEnvVars)
    .set(changes)
    .where(and(eq(appEnvVars.id, envId), eq(appEnvVars.appId, appId)))
    .returning();

  if (!row) {
    throw new Error("Env var not found.");
  }

  return row;
}

export async function deleteEnvVar(appId: string, envId: string) {
  await db
    .delete(appEnvVars)
    .where(and(eq(appEnvVars.id, envId), eq(appEnvVars.appId, appId)));
}

export async function buildPlainEnv(appId: string) {
  const rows = await db
    .select()
    .from(appEnvVars)
    .where(eq(appEnvVars.appId, appId));

  return Object.fromEntries(
    rows.map((row) => [row.key, decryptValue(row.encryptedValue)])
  ) as Record<string, string>;
}
