import type {
  App,
  AppManagedVolume,
  AppRuntimeConfig,
} from "@/db/schema";
import { getTraefikConfig } from "@/lib/config";
import { localVolumeHostPath } from "@/services/managed-volumes";

export function generateComposeYaml(
  app: App,
  runtime: AppRuntimeConfig,
  volumes: AppManagedVolume[]
) {
  const traefik = getTraefikConfig();
  const routerName = traefikName(app.name);
  const serviceName = routerName;
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
    `      - ${yamlString(`dockyard.app=${app.name}`)}`,
    "      - traefik.enable=true",
    `      - ${yamlString(`traefik.http.routers.${routerName}.rule=Host(\`${traefikHost(app.domain)}\`)`)}`,
    `      - ${yamlString(`traefik.http.routers.${routerName}.entrypoints=${traefik.entrypoints}`)}`,
    `      - ${yamlString(`traefik.http.services.${serviceName}.loadbalancer.server.port=${runtime.containerPort}`)}`
  );

  if (traefik.network) {
    lines.push(`      - ${yamlString(`traefik.docker.network=${traefik.network}`)}`);
  }

  if (traefik.tls) {
    lines.push(`      - ${yamlString(`traefik.http.routers.${routerName}.tls=true`)}`);
  }

  if (traefik.certResolver) {
    lines.push(
      `      - ${yamlString(
        `traefik.http.routers.${routerName}.tls.certresolver=${traefik.certResolver}`
      )}`
    );
  }

  if (traefik.network) {
    lines.push("    networks:", "      - default", `      - ${traefik.network}`);
  }

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

  if (traefik.network) {
    lines.push("networks:", `  ${traefik.network}:`, "    external: true");
  }

  return `${lines.join("\n")}\n`;
}

function repoContext(buildContext: string) {
  return buildContext === "." ? "../repo" : `../repo/${buildContext}`;
}

function nfsVolumeName(appName: string, volumeName: string) {
  return `${appName}_${volumeName}`.replace(/[^A-Za-z0-9_-]/g, "_");
}

function traefikName(appName: string) {
  return `dockyard-${appName}`.replace(/[^A-Za-z0-9-]/g, "-").toLowerCase();
}

function traefikHost(domain: string) {
  if (!/^[A-Za-z0-9.-]+$/.test(domain) || domain.includes("..")) {
    throw new Error(`Invalid Traefik host domain ${domain}.`);
  }

  return domain.toLowerCase();
}

function yamlString(value: string) {
  return JSON.stringify(value);
}
