import { notFound } from "next/navigation";
import { Trash2, Wifi } from "lucide-react";

import {
  deleteResourceProviderAction,
  testResourceProviderAction,
} from "@/app/actions";
import { ResourceProviderForm } from "@/components/forms/resource-provider-form";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getResourceProvider } from "@/services/resources";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ test?: string }>;
};

export default async function ResourceProviderDetailPage({
  params,
  searchParams,
}: PageProps) {
  const { id } = await params;
  const { test } = await searchParams;
  const provider = await getResourceProvider(id);

  if (!provider) {
    notFound();
  }

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{provider.name}</h1>
          <p className="text-sm text-muted-foreground">{provider.endpoint}</p>
        </div>
        <div className="flex gap-2">
          <form action={testResourceProviderAction.bind(null, provider.id)}>
            <Button type="submit" variant="outline">
              <Wifi data-icon="inline-start" />
              Test
            </Button>
          </form>
          <form action={deleteResourceProviderAction.bind(null, provider.id)}>
            <Button type="submit" variant="destructive">
              <Trash2 data-icon="inline-start" />
              Delete
            </Button>
          </form>
        </div>
      </div>

      {test === "ok" ? (
        <Alert>
          <AlertTitle>Connection test succeeded</AlertTitle>
          <AlertDescription>
            PostgreSQL providers run a live query; other provider types are metadata-only in the MVP.
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ResourceProviderForm provider={provider} />
        <Card>
          <CardHeader>
            <CardTitle>Secret Storage</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>Admin credentials are encrypted with DOCKYARD_ENCRYPTION_KEY.</p>
            <p>Leave the secret field blank when editing to preserve the current value.</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
