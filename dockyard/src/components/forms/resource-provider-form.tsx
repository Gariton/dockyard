import {
  createResourceProviderAction,
  updateResourceProviderAction,
} from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { ResourceProvider } from "@/db/schema";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ResourceProviderForm({
  provider,
}: {
  provider?: ResourceProvider;
}) {
  const action = provider
    ? updateResourceProviderAction.bind(null, provider.id)
    : createResourceProviderAction;

  return (
    <form action={action}>
      <Card>
        <CardHeader>
          <CardTitle>{provider ? "Edit Provider" : "Register Provider"}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" defaultValue={provider?.name ?? ""} required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="type">Type</Label>
            <select
              id="type"
              name="type"
              className={selectClass}
              defaultValue={provider?.type ?? "postgres"}
            >
              <option value="postgres">PostgreSQL</option>
              <option value="s3">S3 / MinIO</option>
              <option value="elasticsearch">Elasticsearch</option>
              <option value="redis">Redis</option>
            </select>
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="endpoint">Endpoint</Label>
            <Input
              id="endpoint"
              name="endpoint"
              placeholder="postgres.internal:5432"
              defaultValue={provider?.endpoint ?? ""}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="configJson">Config JSON</Label>
            <Textarea
              id="configJson"
              name="configJson"
              defaultValue={JSON.stringify(provider?.configJson ?? {}, null, 2)}
              rows={8}
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="adminSecretJson">
              Admin secret JSON{provider ? " (leave blank to keep current)" : ""}
            </Label>
            <Textarea
              id="adminSecretJson"
              name="adminSecretJson"
              placeholder={JSON.stringify(
                { adminUser: "postgres", adminPassword: "secret" },
                null,
                2
              )}
              rows={8}
              required={!provider}
            />
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">{provider ? "Save provider" : "Create provider"}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
