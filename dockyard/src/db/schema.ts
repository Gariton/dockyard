import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  real,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

export const serverStatusEnum = pgEnum("server_status", [
  "online",
  "offline",
]);

export const targetModeEnum = pgEnum("target_mode", ["auto", "manual"]);

export const deploymentStatusEnum = pgEnum("deployment_status", [
  "queued",
  "running",
  "success",
  "failed",
]);

export const jobTypeEnum = pgEnum("agent_job_type", ["deploy"]);

export const jobStatusEnum = pgEnum("agent_job_status", [
  "queued",
  "running",
  "success",
  "failed",
]);

export const logLevelEnum = pgEnum("deployment_log_level", [
  "info",
  "warn",
  "error",
]);

const now = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const servers = pgTable("servers", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull().unique(),
  hostname: text("hostname").notNull(),
  ipAddress: text("ip_address").notNull(),
  status: serverStatusEnum("status").notNull().default("online"),
  cpuUsagePercent: real("cpu_usage_percent").notNull().default(0),
  memoryTotalMb: integer("memory_total_mb").notNull().default(0),
  memoryUsedMb: integer("memory_used_mb").notNull().default(0),
  diskTotalMb: integer("disk_total_mb").notNull().default(0),
  diskUsedMb: integer("disk_used_mb").notNull().default(0),
  runningAppCount: integer("running_app_count").notNull().default(0),
  lastHeartbeatAt: timestamp("last_heartbeat_at", { withTimezone: true }),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const apps = pgTable("apps", {
  id: text("id").primaryKey(),
  name: text("name").notNull().unique(),
  gitUrl: text("git_url").notNull(),
  branch: text("branch").notNull(),
  domain: text("domain").notNull(),
  composeFilePath: text("compose_file_path").notNull(),
  publicPort: integer("public_port").notNull(),
  healthcheckPath: text("healthcheck_path").notNull(),
  targetMode: targetModeEnum("target_mode").notNull().default("auto"),
  manualServerId: text("manual_server_id").references(() => servers.id, {
    onDelete: "set null",
  }),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const appEnvVars = pgTable("app_env_vars", {
  id: text("id").primaryKey(),
  appId: text("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  key: text("key").notNull(),
  encryptedValue: text("encrypted_value").notNull(),
  isSecret: boolean("is_secret").notNull().default(false),
  required: boolean("required").notNull().default(false),
  createdAt: now(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const deployments = pgTable("deployments", {
  id: text("id").primaryKey(),
  appId: text("app_id")
    .notNull()
    .references(() => apps.id, { onDelete: "cascade" }),
  serverId: text("server_id")
    .notNull()
    .references(() => servers.id, { onDelete: "restrict" }),
  status: deploymentStatusEnum("status").notNull().default("queued"),
  gitRef: text("git_ref"),
  commitSha: text("commit_sha"),
  errorMessage: text("error_message"),
  startedAt: timestamp("started_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  createdAt: now(),
});

export const deploymentLogs = pgTable("deployment_logs", {
  id: text("id").primaryKey(),
  deploymentId: text("deployment_id")
    .notNull()
    .references(() => deployments.id, { onDelete: "cascade" }),
  level: logLevelEnum("level").notNull().default("info"),
  message: text("message").notNull(),
  createdAt: now(),
});

export const agentJobs = pgTable("agent_jobs", {
  id: text("id").primaryKey(),
  agentId: text("agent_id").notNull(),
  deploymentId: text("deployment_id")
    .notNull()
    .references(() => deployments.id, { onDelete: "cascade" }),
  type: jobTypeEnum("type").notNull().default("deploy"),
  status: jobStatusEnum("status").notNull().default("queued"),
  payloadJson: jsonb("payload_json").notNull().default({}),
  createdAt: now(),
  pickedAt: timestamp("picked_at", { withTimezone: true }),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
});

export type Server = typeof servers.$inferSelect;
export type NewServer = typeof servers.$inferInsert;
export type App = typeof apps.$inferSelect;
export type NewApp = typeof apps.$inferInsert;
export type AppEnvVar = typeof appEnvVars.$inferSelect;
export type Deployment = typeof deployments.$inferSelect;
export type DeploymentLog = typeof deploymentLogs.$inferSelect;
export type AgentJob = typeof agentJobs.$inferSelect;
