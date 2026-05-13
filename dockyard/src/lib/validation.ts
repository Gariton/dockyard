import { z } from "zod";

const appName = z
  .string()
  .min(1)
  .max(80)
  .regex(/^[A-Za-z0-9_-]+$/, "Use only letters, numbers, hyphen, or underscore.");

const branchName = z
  .string()
  .min(1)
  .max(160)
  .regex(/^[A-Za-z0-9._/-]+$/)
  .refine((value) => !value.includes("..") && !value.startsWith("-"));

const composePath = z
  .string()
  .min(1)
  .max(220)
  .regex(/^[A-Za-z0-9._/-]+$/)
  .refine((value) => !value.startsWith("/") && !value.includes(".."));

const nullableText = z
  .string()
  .optional()
  .transform((value) => (value === "" ? null : value ?? null));

const jsonObject = z.record(z.string(), z.unknown());

const domainName = z
  .string()
  .trim()
  .toLowerCase()
  .min(1)
  .max(253)
  .regex(/^[a-z0-9.-]+$/, "Use a hostname without scheme, path, or port.")
  .refine((value) => !value.includes("..") && !value.startsWith(".") && !value.endsWith("."))
  .refine((value) =>
    value.split(".").every((label) => {
      return (
        label.length > 0 &&
        label.length <= 63 &&
        /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(label)
      );
    })
  );

const optionalPositiveInt = (max: number) =>
  z
    .preprocess(
      (value) => (value === "" || value === null ? undefined : value),
      z.coerce.number().int().min(1).max(max).optional()
    )
    .transform((value) => value ?? null);

export const gitUrlSchema = z
  .string()
  .min(1)
  .max(500)
  .regex(
    /^(https:\/\/[A-Za-z0-9.-]+\/[A-Za-z0-9._~:/?#[\]@!$&'()*+,;=-]+(?:\.git)?|git@[A-Za-z0-9.-]+:[A-Za-z0-9._\/-]+(?:\.git)?|ssh:\/\/git@[A-Za-z0-9.-]+\/[A-Za-z0-9._\/-]+(?:\.git)?)$/,
    "Git URL must be https://, git@host:path, or ssh://git@host/path."
  );

export const appInputSchema = z.object({
  name: appName,
  gitUrl: gitUrlSchema,
  branch: branchName,
  domain: domainName,
  composeFilePath: composePath.default("compose.yaml"),
  publicPort: z.preprocess(
    (value) => (value === "" || value === null ? undefined : value),
    z.coerce.number().int().min(1).max(65535).optional()
  ),
  healthcheckPath: z
    .string()
    .min(1)
    .max(220)
    .startsWith("/")
    .refine((value) => !value.includes(" ") && !value.includes("..")),
  targetMode: z.enum(["auto", "manual"]).default("auto"),
  stateMode: z.enum(["stateless", "stateful"]).default("stateless"),
  placementStrategy: z.enum(["auto", "manual", "pinned"]).default("auto"),
  manualServerId: z
    .string()
    .optional()
    .transform((value) => (value === "" ? undefined : value)),
});

export const appPatchSchema = appInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required."
);

export const envInputSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z_][A-Za-z0-9_]*$/),
  value: z.string().max(10000),
  isSecret: z.coerce.boolean().default(false),
  required: z.coerce.boolean().default(false),
});

export const envPatchSchema = envInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required."
);

export const runtimeConfigInputSchema = z.object({
  buildContext: composePath.default("."),
  dockerfilePath: composePath.default("Dockerfile"),
  command: nullableText,
  workingDir: nullableText,
  containerPort: z.coerce.number().int().min(1).max(65535).default(3000),
  healthcheckPath: z
    .string()
    .min(1)
    .max(220)
    .startsWith("/")
    .refine((value) => !value.includes(" ") && !value.includes(".."))
    .default("/"),
  healthcheckIntervalSeconds: z.coerce.number().int().min(1).max(3600).default(30),
  healthcheckTimeoutSeconds: z.coerce.number().int().min(1).max(3600).default(5),
  cpuLimit: nullableText,
  memoryLimitMb: optionalPositiveInt(1048576),
  restartPolicy: z
    .enum(["no", "always", "on-failure", "unless-stopped"])
    .default("unless-stopped"),
});

export const resourceProviderInputSchema = z.object({
  name: z.string().min(1).max(120),
  type: z.enum(["postgres", "s3", "elasticsearch", "redis"]),
  endpoint: z.string().min(1).max(500),
  configJson: jsonObject.default({}),
  adminSecretJson: jsonObject.optional(),
});

export const resourceProviderPatchSchema = resourceProviderInputSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  "At least one field is required."
);

export const resourceBindingInputSchema = z.object({
  providerId: z.string().min(1),
  type: z.enum(["postgres", "s3", "elasticsearch", "redis"]),
  logicalName: z
    .string()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9_-]+$/),
  configJson: jsonObject.default({}),
  autoCreate: z.coerce.boolean().default(true),
});

export const managedVolumeInputSchema = z.object({
  name: z
    .string()
    .min(1)
    .max(80)
    .regex(/^[A-Za-z0-9_-]+$/),
  mountPath: z
    .string()
    .min(1)
    .max(220)
    .startsWith("/")
    .refine((value) => !value.includes("..")),
  backend: z.enum(["local", "nfs"]),
  movable: z.coerce.boolean().default(false),
  serverId: nullableText,
  sizeLimitMb: optionalPositiveInt(10485760),
  nfsServer: nullableText,
  nfsPath: nullableText,
});

export const heartbeatSchema = z.object({
  agentId: z.string().min(1).max(120),
  hostname: z.string().min(1).max(255),
  ipAddress: z.string().min(1).max(80),
  cpuUsagePercent: z.coerce.number().min(0).max(100),
  memoryTotalMb: z.coerce.number().int().min(0),
  memoryUsedMb: z.coerce.number().int().min(0),
  diskTotalMb: z.coerce.number().int().min(0),
  diskUsedMb: z.coerce.number().int().min(0),
  runningAppCount: z.coerce.number().int().min(0),
});

export const jobCompleteSchema = z.object({
  deploymentId: z.string().min(1),
  status: z.enum(["success", "failed"]),
  commitSha: z.string().optional(),
  errorMessage: z.string().optional(),
});

export const deploymentLogSchema = z.object({
  deploymentId: z.string().min(1),
  level: z.enum(["info", "warn", "error"]),
  message: z.string().min(1).max(20000),
});

export type AppInput = z.infer<typeof appInputSchema>;
export type EnvInput = z.infer<typeof envInputSchema>;
export type RuntimeConfigInput = z.infer<typeof runtimeConfigInputSchema>;
export type ResourceProviderInput = z.infer<typeof resourceProviderInputSchema>;
export type ResourceBindingInput = z.infer<typeof resourceBindingInputSchema>;
export type ManagedVolumeInput = z.infer<typeof managedVolumeInputSchema>;
