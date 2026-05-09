import type {
  App,
  AppManagedVolume,
  AppRuntimeConfig,
} from "@/db/schema";
import { localVolumeHostPath } from "@/services/managed-volumes";

export function generateComposeYaml(
  app: App,
  runtime: AppRuntimeConfig,
  volumes: AppManagedVolume[]
) {
  const lines: string[] = [
    "services:",
    "  app:",
    "    build:",
    `      context: ${yamlString(repoContext(runtime.buildContext))}`,
    `      dockerfile: ${yamlString(runtime.dockerfilePath)}`,
    `    restart: ${yamlString(runtime.restartPolicy)}`,
    "    env_file:",
    "      - .env",
    "    ports:",
    `      - ${yamlString(`127.0.0.1:${app.publicPort}:${runtime.containerPort}`)}`,
  ];

  if (runtime.command) {
    lines.push(`    command: ${yamlString(runtime.command)}`);
  }

  if (runtime.workingDir) {
    lines.push(`    working_dir: ${yamlString(runtime.workingDir)}`);
  }

  lines.push(
    "    healthcheck:",
    `      test: ["CMD-SHELL", ${yamlString(
      `curl -f http://localhost:${runtime.containerPort}${runtime.healthcheckPath} || exit 1`
    )}]`,
    `      interval: ${runtime.healthcheckIntervalSeconds}s`,
    `      timeout: ${runtime.healthcheckTimeoutSeconds}s`,
    "      retries: 3",
    "    labels:",
    "      - dockyard.managed=true",
    `      - ${yamlString(`dockyard.app=${app.name}`)}`
  );

  if (runtime.cpuLimit || runtime.memoryLimitMb) {
    lines.push("    deploy:", "      resources:", "        limits:");
    if (runtime.cpuLimit) {
      lines.push(`          cpus: ${yamlString(runtime.cpuLimit)}`);
    }
    if (runtime.memoryLimitMb) {
      lines.push(`          memory: ${yamlString(`${runtime.memoryLimitMb}M`)}`);
    }
  }

  if (volumes.length > 0) {
    lines.push("    volumes:");
    for (const volume of volumes) {
      if (volume.backend === "local") {
        lines.push(
          `      - ${yamlString(
            `${localVolumeHostPath(app.name, volume.name)}:${volume.mountPath}`
          )}`
        );
      } else {
        lines.push(
          `      - ${yamlString(`${nfsVolumeName(app.name, volume.name)}:${volume.mountPath}`)}`
        );
      }
    }
  }

  const nfsVolumes = volumes.filter((volume) => volume.backend === "nfs");
  if (nfsVolumes.length > 0) {
    lines.push("volumes:");
    for (const volume of nfsVolumes) {
      if (!volume.nfsServer || !volume.nfsPath) {
        throw new Error(`NFS volume ${volume.name} is missing nfsServer or nfsPath.`);
      }
      lines.push(
        `  ${nfsVolumeName(app.name, volume.name)}:`,
        "    driver: local",
        "    driver_opts:",
        "      type: nfs",
        `      o: ${yamlString(`addr=${volume.nfsServer},rw`)}`,
        `      device: ${yamlString(`:${volume.nfsPath}`)}`
      );
    }
  }

  return `${lines.join("\n")}\n`;
}

function repoContext(buildContext: string) {
  return buildContext === "." ? "../repo" : `../repo/${buildContext}`;
}

function nfsVolumeName(appName: string, volumeName: string) {
  return `${appName}_${volumeName}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function yamlString(value: string) {
  return JSON.stringify(value);
}
