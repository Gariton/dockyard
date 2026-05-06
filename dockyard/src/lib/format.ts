export function formatDate(value: Date | string | null | undefined) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatMb(value: number | null | undefined) {
  if (value == null) {
    return "-";
  }

  if (value >= 1024) {
    return `${(value / 1024).toFixed(1)} GB`;
  }

  return `${value} MB`;
}

export function truncateSha(value: string | null | undefined) {
  return value ? value.slice(0, 8) : "-";
}
