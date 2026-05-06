CREATE TYPE "public"."deployment_status" AS ENUM('queued', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_job_status" AS ENUM('queued', 'running', 'success', 'failed');--> statement-breakpoint
CREATE TYPE "public"."agent_job_type" AS ENUM('deploy');--> statement-breakpoint
CREATE TYPE "public"."deployment_log_level" AS ENUM('info', 'warn', 'error');--> statement-breakpoint
CREATE TYPE "public"."server_status" AS ENUM('online', 'offline');--> statement-breakpoint
CREATE TYPE "public"."target_mode" AS ENUM('auto', 'manual');--> statement-breakpoint
CREATE TABLE "agent_jobs" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"deployment_id" text NOT NULL,
	"type" "agent_job_type" DEFAULT 'deploy' NOT NULL,
	"status" "agent_job_status" DEFAULT 'queued' NOT NULL,
	"payload_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"picked_at" timestamp with time zone,
	"finished_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "app_env_vars" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"key" text NOT NULL,
	"encrypted_value" text NOT NULL,
	"is_secret" boolean DEFAULT false NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "apps" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"git_url" text NOT NULL,
	"branch" text NOT NULL,
	"domain" text NOT NULL,
	"compose_file_path" text NOT NULL,
	"public_port" integer NOT NULL,
	"healthcheck_path" text NOT NULL,
	"target_mode" "target_mode" DEFAULT 'auto' NOT NULL,
	"manual_server_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "apps_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "deployment_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"deployment_id" text NOT NULL,
	"level" "deployment_log_level" DEFAULT 'info' NOT NULL,
	"message" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "deployments" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"server_id" text NOT NULL,
	"status" "deployment_status" DEFAULT 'queued' NOT NULL,
	"git_ref" text,
	"commit_sha" text,
	"error_message" text,
	"started_at" timestamp with time zone,
	"finished_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servers" (
	"id" text PRIMARY KEY NOT NULL,
	"agent_id" text NOT NULL,
	"hostname" text NOT NULL,
	"ip_address" text NOT NULL,
	"status" "server_status" DEFAULT 'online' NOT NULL,
	"cpu_usage_percent" real DEFAULT 0 NOT NULL,
	"memory_total_mb" integer DEFAULT 0 NOT NULL,
	"memory_used_mb" integer DEFAULT 0 NOT NULL,
	"disk_total_mb" integer DEFAULT 0 NOT NULL,
	"disk_used_mb" integer DEFAULT 0 NOT NULL,
	"running_app_count" integer DEFAULT 0 NOT NULL,
	"last_heartbeat_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "servers_agent_id_unique" UNIQUE("agent_id")
);
--> statement-breakpoint
ALTER TABLE "agent_jobs" ADD CONSTRAINT "agent_jobs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_env_vars" ADD CONSTRAINT "app_env_vars_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_manual_server_id_servers_id_fk" FOREIGN KEY ("manual_server_id") REFERENCES "public"."servers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployment_logs" ADD CONSTRAINT "deployment_logs_deployment_id_deployments_id_fk" FOREIGN KEY ("deployment_id") REFERENCES "public"."deployments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "deployments" ADD CONSTRAINT "deployments_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE restrict ON UPDATE no action;