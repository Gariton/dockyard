import { isIP } from "node:net";

import { getPowerDnsConfig } from "@/lib/config";

type DeploymentDnsResult =
  | {
      configured: false;
    }
  | {
      configured: true;
      recordName: string;
      recordType: "A" | "AAAA";
      target: string;
    };

export async function configureDeploymentDns({
  domain,
  targetIp,
}: {
  domain: string;
  targetIp: string;
}): Promise<DeploymentDnsResult> {
  const config = getPowerDnsConfig();

  if (!config) {
    return { configured: false };
  }

  const ipVersion = isIP(targetIp);
  if (ipVersion !== 4 && ipVersion !== 6) {
    throw new Error(`Cannot create DNS record for non-IP target ${targetIp}.`);
  }

  const recordName = fqdn(domain);
  const zoneId = encodeURIComponent(fqdn(config.zoneId));
  const serverId = encodeURIComponent(config.serverId);
  const recordType = ipVersion === 4 ? "A" : "AAAA";
  const response = await fetch(
    `${config.apiUrl}/servers/${serverId}/zones/${zoneId}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.apiKey,
      },
      body: JSON.stringify({
        rrsets: [
          {
            name: recordName,
            type: recordType,
            ttl: config.recordTtl,
            changetype: "REPLACE",
            records: [
              {
                content: targetIp,
                disabled: false,
              },
            ],
          },
        ],
      }),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`PowerDNS update failed with ${response.status}: ${body}`);
  }

  return {
    configured: true,
    recordName,
    recordType,
    target: targetIp,
  };
}

function fqdn(value: string) {
  const trimmed = value.trim().toLowerCase();

  if (!/^[a-z0-9.-]+$/.test(trimmed) || trimmed.includes("..")) {
    throw new Error(`Invalid DNS name ${value}.`);
  }

  return trimmed.endsWith(".") ? trimmed : `${trimmed}.`;
}
