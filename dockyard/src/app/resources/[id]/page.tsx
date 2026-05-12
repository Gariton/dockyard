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
import { getI18n } from "@/lib/i18n-server";
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
  const { dictionary } = await getI18n();
  const labels = dictionary.resourceProviderDetail;
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
              {labels.test}
            </Button>
          </form>
          <form action={deleteResourceProviderAction.bind(null, provider.id)}>
            <Button type="submit" variant="destructive">
              <Trash2 data-icon="inline-start" />
              {labels.delete}
            </Button>
          </form>
        </div>
      </div>

      {test === "ok" ? (
        <Alert>
          <AlertTitle>{labels.connectionTestSucceeded}</AlertTitle>
          <AlertDescription>
            {labels.connectionTestDescription}
          </AlertDescription>
        </Alert>
      ) : null}

      <section className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <ResourceProviderForm
          labels={dictionary.forms.resourceProvider}
          provider={provider}
        />
        <Card>
          <CardHeader>
            <CardTitle>{labels.secretStorage}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm text-muted-foreground">
            <p>{labels.encryptedCredentials}</p>
            <p>{labels.preserveSecret}</p>
          </CardContent>
        </Card>
      </section>
    </>
  );
}
