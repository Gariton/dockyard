import { createResourceBindingAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceProvider } from "@/db/schema";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ResourceBindingForm({
  appId,
  providers,
}: {
  appId: string;
  providers: ResourceProvider[];
}) {
  return (
    <form action={createResourceBindingAction.bind(null, appId)}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Add Resource Binding</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="providerId">Provider</Label>
            <select id="providerId" name="providerId" className={selectClass} required>
              <option value="">Select provider</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.name} ({provider.type})
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" className={selectClass} defaultValue="postgres">
              <option value="postgres">PostgreSQL</option>
              <option value="s3">S3 / MinIO</option>
              <option value="elasticsearch">Elasticsearch</option>
              <option value="redis">Redis</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="logicalName">Logical name</Label>
            <Input id="logicalName" name="logicalName" placeholder="primary_database" required />
          </label>
          <label className="flex items-center gap-2 self-end pb-1 text-sm">
            <input
              name="autoCreate"
              type="checkbox"
              className="size-4 rounded border-input"
              defaultChecked
            />
            Auto create
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="configJson">Binding config JSON</Label>
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
              Add binding
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
