CREATE TYPE "public"."state_mode" AS ENUM('stateless', 'stateful');--> statement-breakpoint
CREATE TYPE "public"."placement_strategy" AS ENUM('auto', 'manual', 'pinned');--> statement-breakpoint
CREATE TYPE "public"."managed_volume_backend" AS ENUM('local', 'nfs');--> statement-breakpoint
CREATE TYPE "public"."resource_provider_type" AS ENUM('postgres', 's3', 'elasticsearch', 'redis');--> statement-breakpoint
CREATE TYPE "public"."resource_binding_status" AS ENUM('pending', 'ready', 'failed');--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "state_mode" "state_mode" DEFAULT 'stateless' NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "placement_strategy" "placement_strategy" DEFAULT 'auto' NOT NULL;--> statement-breakpoint
ALTER TABLE "apps" ADD COLUMN "pinned_server_id" text;--> statement-breakpoint
UPDATE "apps" SET "placement_strategy" = "target_mode"::text::"placement_strategy";--> statement-breakpoint
CREATE TABLE "app_runtime_configs" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"build_context" text DEFAULT '.' NOT NULL,
	"dockerfile_path" text DEFAULT 'Dockerfile' NOT NULL,
	"command" text,
	"working_dir" text,
	"container_port" integer DEFAULT 3000 NOT NULL,
	"healthcheck_path" text DEFAULT '/' NOT NULL,
	"healthcheck_interval_seconds" integer DEFAULT 30 NOT NULL,
	"healthcheck_timeout_seconds" integer DEFAULT 5 NOT NULL,
	"cpu_limit" text,
	"memory_limit_mb" integer,
	"restart_policy" text DEFAULT 'unless-stopped' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "app_managed_volumes" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"name" text NOT NULL,
	"mount_path" text NOT NULL,
	"backend" "managed_volume_backend" NOT NULL,
	"movable" boolean DEFAULT false NOT NULL,
	"server_id" text,
	"size_limit_mb" integer,
	"nfs_server" text,
	"nfs_path" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "resource_providers" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"type" "resource_provider_type" NOT NULL,
	"endpoint" text NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encrypted_admin_secret_json" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "resource_providers_name_unique" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "app_resource_bindings" (
	"id" text PRIMARY KEY NOT NULL,
	"app_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"type" "resource_provider_type" NOT NULL,
	"logical_name" text NOT NULL,
	"config_json" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"encrypted_generated_secret_json" text,
	"auto_create" boolean DEFAULT true NOT NULL,
	"status" "resource_binding_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "app_runtime_configs_app_id_idx" ON "app_runtime_configs" USING btree ("app_id");--> statement-breakpoint
CREATE UNIQUE INDEX "app_managed_volumes_app_name_idx" ON "app_managed_volumes" USING btree ("app_id","name");--> statement-breakpoint
CREATE UNIQUE INDEX "app_resource_bindings_app_logical_name_idx" ON "app_resource_bindings" USING btree ("app_id","logical_name");--> statement-breakpoint
ALTER TABLE "apps" ADD CONSTRAINT "apps_pinned_server_id_servers_id_fk" FOREIGN KEY ("pinned_server_id") REFERENCES "public"."servers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_runtime_configs" ADD CONSTRAINT "app_runtime_configs_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_managed_volumes" ADD CONSTRAINT "app_managed_volumes_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_managed_volumes" ADD CONSTRAINT "app_managed_volumes_server_id_servers_id_fk" FOREIGN KEY ("server_id") REFERENCES "public"."servers"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_resource_bindings" ADD CONSTRAINT "app_resource_bindings_app_id_apps_id_fk" FOREIGN KEY ("app_id") REFERENCES "public"."apps"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "app_resource_bindings" ADD CONSTRAINT "app_resource_bindings_provider_id_resource_providers_id_fk" FOREIGN KEY ("provider_id") REFERENCES "public"."resource_providers"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
INSERT INTO "app_runtime_configs" (
	"id",
	"app_id",
	"healthcheck_path",
	"created_at",
	"updated_at"
)
SELECT
	'run_' || substring(md5("id" || random()::text || clock_timestamp()::text), 1, 12),
	"id",
	"healthcheck_path",
	now(),
	now()
FROM "apps";
