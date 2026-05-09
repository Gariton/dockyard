import { randomBytes } from "crypto";
import { and, eq } from "drizzle-orm";
import { Client } from "pg";

import { db } from "@/db";
import {
  appEnvVars,
  appResourceBindings,
  resourceProviders,
} from "@/db/schema";
import { decryptJson, encryptJson } from "@/lib/crypto";
import type {
  ResourceBindingInput,
  ResourceProviderInput,
} from "@/lib/validation";
import { makeId } from "@/services/ids";

type JsonObject = Record<string, unknown>;

type GeneratedSecret = {
  env: Record<string, string>;
  [key: string]: unknown;
};

type PostgresAdminSecret = {
  adminUser?: string;
  adminPassword?: string;
};

type PostgresProviderConfig = {
  sslMode?: string;
  defaultDatabase?: string;
};

type PostgresBindingConfig = {
  database?: string;
  username?: string;
  envName?: string;
};

export type BindingPreview = {
  id: string;
  providerName: string;
  type: string;
  logicalName: string;
  autoCreate: boolean;
  status: string;
  configJson: JsonObject;
  generatedEnv: Record<string, string>;
  updatedAt: Date;
};

export async function listResourceProviders() {
  return db.select().from(resourceProviders).orderBy(resourceProviders.name);
}

export async function getResourceProvider(id: string) {
  const [provider] = await db
    .select()
    .from(resourceProviders)
    .where(eq(resourceProviders.id, id))
    .limit(1);

  return provider ?? null;
}

export async function createResourceProvider(input: ResourceProviderInput) {
  if (!input.adminSecretJson) {
    throw new Error("Admin secret JSON is required.");
  }

  const [row] = await db
    .insert(resourceProviders)
    .values({
      id: makeId("rp"),
      name: input.name,
      type: input.type,
      endpoint: input.endpoint,
      configJson: input.configJson,
      encryptedAdminSecretJson: encryptJson(input.adminSecretJson),
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function updateResourceProvider(
  id: string,
  input: Partial<ResourceProviderInput>
) {
  const changes: Partial<typeof resourceProviders.$inferInsert> = {
    updatedAt: new Date(),
  };

  if (input.name !== undefined) changes.name = input.name;
  if (input.type !== undefined) changes.type = input.type;
  if (input.endpoint !== undefined) changes.endpoint = input.endpoint;
  if (input.configJson !== undefined) changes.configJson = input.configJson;
  if (input.adminSecretJson !== undefined) {
    changes.encryptedAdminSecretJson = encryptJson(input.adminSecretJson);
  }

  const [row] = await db
    .update(resourceProviders)
    .set(changes)
    .where(eq(resourceProviders.id, id))
    .returning();

  if (!row) {
    throw new Error("Resource provider not found.");
  }

  return row;
}

export async function deleteResourceProvider(id: string) {
  await db.delete(resourceProviders).where(eq(resourceProviders.id, id));
}

export async function testResourceProvider(id: string) {
  const provider = await getResourceProvider(id);

  if (!provider) {
    throw new Error("Resource provider not found.");
  }

  if (provider.type !== "postgres") {
    return {
      ok: true,
      message: "Only PostgreSQL performs a live connection test in the MVP.",
    };
  }

  const client = makePostgresClient(
    provider.endpoint,
    provider.configJson as PostgresProviderConfig,
    decryptJson<PostgresAdminSecret>(provider.encryptedAdminSecretJson)
  );

  await client.connect();
  await client.query("select 1");
  await client.end();

  return { ok: true, message: "PostgreSQL connection succeeded." };
}

export async function listAppResourceBindings(appId: string): Promise<BindingPreview[]> {
  const rows = await db
    .select({
      binding: appResourceBindings,
      provider: resourceProviders,
    })
    .from(appResourceBindings)
    .innerJoin(resourceProviders, eq(appResourceBindings.providerId, resourceProviders.id))
    .where(eq(appResourceBindings.appId, appId))
    .orderBy(appResourceBindings.logicalName);

  return rows.map(({ binding, provider }) => ({
    id: binding.id,
    providerName: provider.name,
    type: binding.type,
    logicalName: binding.logicalName,
    autoCreate: binding.autoCreate,
    status: binding.status,
    configJson: binding.configJson,
    generatedEnv: binding.encryptedGeneratedSecretJson
      ? maskGeneratedEnv(
          decryptJson<GeneratedSecret>(binding.encryptedGeneratedSecretJson).env ?? {}
        )
      : {},
    updatedAt: binding.updatedAt,
  }));
}

export async function createResourceBinding(appId: string, input: ResourceBindingInput) {
  const provider = await getResourceProvider(input.providerId);

  if (!provider) {
    throw new Error("Resource provider not found.");
  }

  if (provider.type !== input.type) {
    throw new Error("Binding type must match the provider type.");
  }

  const [row] = await db
    .insert(appResourceBindings)
    .values({
      id: makeId("rb"),
      appId,
      providerId: input.providerId,
      type: input.type,
      logicalName: input.logicalName,
      configJson: input.configJson,
      autoCreate: input.autoCreate,
      status: "pending",
      updatedAt: new Date(),
    })
    .returning();

  return row;
}

export async function deleteResourceBinding(appId: string, bindingId: string) {
  await db
    .delete(appResourceBindings)
    .where(and(eq(appResourceBindings.appId, appId), eq(appResourceBindings.id, bindingId)));
}

export async function prepareResourceBindings(appId: string) {
  const rows = await db
    .select({
      binding: appResourceBindings,
      provider: resourceProviders,
    })
    .from(appResourceBindings)
    .innerJoin(resourceProviders, eq(appResourceBindings.providerId, resourceProviders.id))
    .where(eq(appResourceBindings.appId, appId));

  const generatedEnv: Record<string, string> = {};

  for (const { binding, provider } of rows) {
    let env: Record<string, string> = {};

    if (binding.encryptedGeneratedSecretJson) {
      env = decryptJson<GeneratedSecret>(binding.encryptedGeneratedSecretJson).env ?? {};
      if (binding.status !== "ready") {
        await db
          .update(appResourceBindings)
          .set({ status: "ready", updatedAt: new Date() })
          .where(eq(appResourceBindings.id, binding.id));
      }
    } else if (binding.type === "postgres" && binding.autoCreate) {
      const secret = await ensurePostgresBinding(
        provider,
        binding.configJson as PostgresBindingConfig
      );
      env = secret.env;
      await db
        .update(appResourceBindings)
        .set({
          encryptedGeneratedSecretJson: encryptJson(secret),
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(appResourceBindings.id, binding.id));
    } else if (binding.type === "elasticsearch") {
      env = buildElasticsearchFallbackEnv(provider.endpoint, binding.configJson);
      await db
        .update(appResourceBindings)
        .set({
          encryptedGeneratedSecretJson: encryptJson({ env }),
          status: "ready",
          updatedAt: new Date(),
        })
        .where(eq(appResourceBindings.id, binding.id));
    }

    Object.assign(generatedEnv, env);
  }

  return generatedEnv;
}

export async function getManualEnvKeys(appId: string) {
  const rows = await db
    .select({ key: appEnvVars.key })
    .from(appEnvVars)
    .where(eq(appEnvVars.appId, appId));

  return new Set(rows.map((row) => row.key));
}

function maskGeneratedEnv(env: Record<string, string>) {
  return Object.fromEntries(Object.keys(env).sort().map((key) => [key, "********"]));
}

async function ensurePostgresBinding(
  provider: typeof resourceProviders.$inferSelect,
  rawConfig: PostgresBindingConfig
) {
  const config = normalizePostgresBindingConfig(rawConfig);
  const providerConfig = provider.configJson as PostgresProviderConfig;
  const adminSecret = decryptJson<PostgresAdminSecret>(provider.encryptedAdminSecretJson);
  const password = randomBytes(24).toString("base64url");

  const adminClient = makePostgresClient(provider.endpoint, providerConfig, adminSecret);
  await adminClient.connect();

  try {
    const dbExists = await adminClient.query(
      "select 1 from pg_database where datname = $1",
      [config.database]
    );
    if (dbExists.rowCount === 0) {
      await adminClient.query(`create database ${quoteIdent(config.database)}`);
    }

    const roleExists = await adminClient.query(
      "select 1 from pg_roles where rolname = $1",
      [config.username]
    );
    if (roleExists.rowCount === 0) {
      await adminClient.query(
        `create user ${quoteIdent(config.username)} with password ${quoteLiteral(password)}`
      );
    } else {
      await adminClient.query(
        `alter user ${quoteIdent(config.username)} with password ${quoteLiteral(password)}`
      );
    }

    await adminClient.query(
      `grant connect, temporary on database ${quoteIdent(config.database)} to ${quoteIdent(config.username)}`
    );
    await adminClient.query(
      `grant all privileges on database ${quoteIdent(config.database)} to ${quoteIdent(config.username)}`
    );
  } finally {
    await adminClient.end();
  }

  const databaseClient = makePostgresClient(
    provider.endpoint,
    { ...providerConfig, defaultDatabase: config.database },
    adminSecret
  );
  await databaseClient.connect();
  try {
    await databaseClient.query(
      `grant usage, create on schema public to ${quoteIdent(config.username)}`
    );
    await databaseClient.query(
      `grant all privileges on all tables in schema public to ${quoteIdent(config.username)}`
    );
    await databaseClient.query(
      `grant all privileges on all sequences in schema public to ${quoteIdent(config.username)}`
    );
    await databaseClient.query(
      `alter default privileges in schema public grant all on tables to ${quoteIdent(config.username)}`
    );
    await databaseClient.query(
      `alter default privileges in schema public grant all on sequences to ${quoteIdent(config.username)}`
    );
  } finally {
    await databaseClient.end();
  }

  return {
    database: config.database,
    username: config.username,
    password,
    env: {
      [config.envName]: buildPostgresUrl(
        provider.endpoint,
        config.database,
        config.username,
        password,
        providerConfig.sslMode
      ),
    },
  } satisfies GeneratedSecret;
}

function normalizePostgresBindingConfig(config: PostgresBindingConfig) {
  const database = String(config.database ?? "").trim();
  const username = String(config.username ?? "").trim();
  const envName = String(config.envName ?? "DATABASE_URL").trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(database)) {
    throw new Error("PostgreSQL database must be a valid identifier.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(username)) {
    throw new Error("PostgreSQL username must be a valid identifier.");
  }
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(envName)) {
    throw new Error("PostgreSQL envName must be a valid env key.");
  }

  return { database, username, envName };
}

function makePostgresClient(
  endpoint: string,
  config: PostgresProviderConfig,
  secret: PostgresAdminSecret
) {
  if (!secret.adminUser || !secret.adminPassword) {
    throw new Error("PostgreSQL provider requires adminUser and adminPassword.");
  }

  const target = parsePostgresEndpoint(endpoint);

  return new Client({
    host: target.host,
    port: target.port,
    database: config.defaultDatabase ?? target.database ?? "postgres",
    user: secret.adminUser,
    password: secret.adminPassword,
    ssl: config.sslMode === "require" ? { rejectUnauthorized: false } : undefined,
  });
}

function parsePostgresEndpoint(endpoint: string) {
  const url = endpoint.includes("://")
    ? new URL(endpoint)
    : new URL(`postgres://${endpoint}`);

  return {
    host: url.hostname,
    port: url.port ? Number(url.port) : 5432,
    database: url.pathname ? url.pathname.replace(/^\//, "") : undefined,
  };
}

function buildPostgresUrl(
  endpoint: string,
  database: string,
  username: string,
  password: string,
  sslMode: unknown
) {
  const target = parsePostgresEndpoint(endpoint);
  const auth = `${encodeURIComponent(username)}:${encodeURIComponent(password)}`;
  const base = `postgresql://${auth}@${target.host}:${target.port}/${database}`;
  return sslMode === "require" ? `${base}?sslmode=require` : base;
}

function buildElasticsearchFallbackEnv(endpoint: string, config: JsonObject) {
  const prefix = String(config.envPrefix ?? "ELASTICSEARCH").trim();
  const indexPrefix = String(config.indexPrefix ?? "").trim();

  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(prefix)) {
    throw new Error("Elasticsearch envPrefix must be a valid env prefix.");
  }

  return {
    [`${prefix}_URL`]: endpoint,
    ...(indexPrefix ? { [`${prefix}_INDEX_PREFIX`]: indexPrefix } : {}),
  };
}

function quoteIdent(value: string) {
  return `"${value.replace(/"/g, '""')}"`;
}

function quoteLiteral(value: string) {
  return `'${value.replace(/'/g, "''")}'`;
}
