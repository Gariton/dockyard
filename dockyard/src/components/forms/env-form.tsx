import { createEnvVarAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Dictionary } from "@/lib/i18n";

export function EnvForm({
  appId,
  labels,
}: {
  appId: string;
  labels: Dictionary["forms"]["env"];
}) {
  return (
    <form action={createEnvVarAction.bind(null, appId)}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-[1fr_2fr_auto_auto_auto] md:items-end">
          <label className="flex flex-col gap-2">
            <Label htmlFor="key">{labels.key}</Label>
            <Input id="key" name="key" placeholder="DATABASE_URL" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="value">{labels.value}</Label>
            <Input id="value" name="value" placeholder="postgres://..." required />
          </label>
          <label className="flex items-center gap-2 pb-1 text-sm">
            <input name="isSecret" type="checkbox" className="size-4 rounded border-input" />
            {labels.secret}
          </label>
          <label className="flex items-center gap-2 pb-1 text-sm">
            <input name="required" type="checkbox" className="size-4 rounded border-input" />
            {labels.required}
          </label>
          <Button type="submit">{labels.add}</Button>
        </CardContent>
      </Card>
    </form>
  );
}
