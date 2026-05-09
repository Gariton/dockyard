import { Badge } from "@/components/ui/badge";

const labels: Record<string, string> = {
  queued: "Queued",
  running: "Running",
  success: "Success",
  failed: "Failed",
  online: "Online",
  offline: "Offline",
  auto: "Auto",
  manual: "Manual",
  pinned: "Pinned",
  stateless: "Stateless",
  stateful: "Stateful",
  postgres: "PostgreSQL",
  s3: "S3",
  elasticsearch: "Elasticsearch",
  redis: "Redis",
  pending: "Pending",
  ready: "Ready",
  local: "Local",
  nfs: "NFS",
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <Badge variant="outline">None</Badge>;
  }

  const variant =
    status === "failed" || status === "offline"
      ? "destructive"
      : status === "success" || status === "online" || status === "ready"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
