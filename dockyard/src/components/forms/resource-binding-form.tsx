import { createResourceBindingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceProvider } from "@/db/schema";
import type { Dictionary } from "@/lib/i18n";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ResourceBindingForm({
  appId,
  labels,
  providers,
}: {
  appId: string;
  labels: Dictionary["forms"]["resourceBinding"];
  providers: ResourceProvider[];
}) {
  return (
    <form action={createResourceBindingAction.bind(null, appId)}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="providerId">{labels.provider}</Label>
            <select id="providerId" name="providerId" className={selectClass} required>
              <option value="">{labels.selectProvider}</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="type">{labels.type}</Label>
            <select id="type" name="type" className={selectClass} defaultValue="postgres">
              <option value="postgres">PostgreSQL</option>
              <option value="s3">{labels.s3Minio}</option>
              <option value="elasticsearch">Elasticsearch</option>
              <option value="redis">Redis</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="logicalName">{labels.logicalName}</Label>
            <Input id="logicalName" name="logicalName" placeholder="primary_database" required />
          </label>
          <label className="flex items-center gap-2 self-end pb-1 text-sm">
            <input
              name="autoCreate"
              type="checkbox"
              className="size-4 rounded border-input"
              defaultChecked
            />
            {labels.autoCreate}
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="configJson">{labels.configJson}</Label>
            <Textarea
              id="configJson"
              name="configJson"
              rows={8}
              defaultValue={JSON.stringify(
                {
                  database: "app_database",
                  username: "app_user",
                  envName: "DATABASE_URL",
                },
                null,
                2
              )}
            />
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit" disabled={providers.length === 0}>
              {labels.addBinding}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
