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
};

export function StatusBadge({ status }: { status: string | null | undefined }) {
  if (!status) {
    return <Badge variant="outline">None</Badge>;
  }

  const variant =
    status === "failed" || status === "offline"
      ? "destructive"
      : status === "success" || status === "online"
        ? "default"
        : "secondary";

  return <Badge variant={variant}>{labels[status] ?? status}</Badge>;
}
