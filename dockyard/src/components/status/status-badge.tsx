import { Badge } from "@/components/ui/badge";
import { getDictionary, type Dictionary, defaultLocale } from "@/lib/i18n";

type StatusLabelKey = keyof Dictionary["status"];

export function StatusBadge({
  labels = getDictionary(defaultLocale).status,
  status,
}: {
  labels?: Dictionary["status"];
  status: string | null | undefined;
}) {
  if (!status) {
    return <Badge variant="outline">{labels.none}</Badge>;
  }

  const variant =
    status === "failed" || status === "offline"
      ? "destructive"
      : status === "success" || status === "online" || status === "ready"
        ? "default"
        : "secondary";

  const label = status in labels ? labels[status as StatusLabelKey] : status;

  return <Badge variant={variant}>{label}</Badge>;
}
