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
  domain: z.string().min(1).max(255),
  composeFilePath: composePath,
  publicPort: z.coerce.number().int().min(1).max(65535),
  healthcheckPath: z
    .string()
    .min(1)
    .max(220)
    .startsWith("/")
    .refine((value) => !value.includes(" ") && !value.includes("..")),
  targetMode: z.enum(["auto", "manual"]),
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
