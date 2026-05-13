export function getAgentSharedToken() {
  const token = process.env.AGENT_SHARED_TOKEN;
  if (!token) {
    throw new Error("AGENT_SHARED_TOKEN is required for agent APIs");
  }

  return token;
}

export function getEncryptionSecret() {
  const key = process.env.DOCKYARD_ENCRYPTION_KEY;
  if (!key) {
    throw new Error("DOCKYARD_ENCRYPTION_KEY is required");
  }

  return key;
}

export type TraefikConfig = {
  certResolver?: string;
  entrypoints: string;
  network?: string;
  tls: boolean;
};

export type PowerDnsConfig = {
  apiKey: string;
  apiUrl: string;
  recordTtl: number;
  serverId: string;
  zoneId: string;
};

export function getAppPublicScheme() {
  const scheme = process.env.DOCKYARD_APP_SCHEME ?? "http";

  if (scheme !== "http" && scheme !== "https") {
    throw new Error("DOCKYARD_APP_SCHEME must be http or https");
  }

  return scheme;
}

export function getTraefikConfig(): TraefikConfig {
  const network = optionalEnv("TRAEFIK_DOCKER_NETWORK");
  if (network && !/^[A-Za-z0-9_.-]+$/.test(network)) {
    throw new Error("TRAEFIK_DOCKER_NETWORK contains unsupported characters");
  }

  return {
    certResolver: optionalEnv("TRAEFIK_CERT_RESOLVER"),
    entrypoints: process.env.TRAEFIK_ENTRYPOINTS ?? "web",
    network,
    tls: truthyEnv("TRAEFIK_TLS"),
  };
}

export function getPowerDnsConfig(): PowerDnsConfig | null {
  const apiUrl = optionalEnv("PDNS_API_URL");
  const apiKey = optionalEnv("PDNS_API_KEY");
  const zoneId = optionalEnv("PDNS_ZONE_ID");

  if (!apiUrl && !apiKey && !zoneId) {
    return null;
  }

  if (!apiUrl || !apiKey || !zoneId) {
    throw new Error("PDNS_API_URL, PDNS_API_KEY, and PDNS_ZONE_ID must be set together");
  }

  const recordTtl = Number(process.env.PDNS_RECORD_TTL ?? "60");
  if (!Number.isInteger(recordTtl) || recordTtl <= 0) {
    throw new Error("PDNS_RECORD_TTL must be a positive integer");
  }

  return {
    apiKey,
    apiUrl: apiUrl.replace(/\/+$/, ""),
    recordTtl,
    serverId: process.env.PDNS_SERVER_ID ?? "localhost",
    zoneId,
  };
}

function optionalEnv(name: string) {
  const value = process.env[name]?.trim();

  return value ? value : undefined;
}

function truthyEnv(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  return value === "1" || value === "true" || value === "yes";
}
