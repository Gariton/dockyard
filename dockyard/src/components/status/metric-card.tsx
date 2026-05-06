import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function MetricCard({
  label,
  value,
  detail,
}: {
  label: string;
  value: string | number;
  detail?: string;
}) {
  return (
    <Card size="sm">
      <CardHeader>
        <CardTitle>{label}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        <div className="text-2xl font-semibold tracking-normal">{value}</div>
        {detail ? <div className="text-sm text-muted-foreground">{detail}</div> : null}
      </CardContent>
    </Card>
  );
}
