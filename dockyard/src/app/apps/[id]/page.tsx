import { notFound } from "next/navigation";
import { Rocket, Trash2 } from "lucide-react";

import {
  deleteEnvVarAction,
  deleteManagedVolumeAction,
  deleteResourceBindingAction,
  deployAppAction,
} from "@/app/actions";
import { EnvForm } from "@/components/forms/env-form";
import { ManagedVolumeForm } from "@/components/forms/managed-volume-form";
import { ResourceBindingForm } from "@/components/forms/resource-binding-form";
import { RuntimeConfigForm } from "@/components/forms/runtime-config-form";
import { StatusBadge } from "@/components/status/status-badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate, truncateSha } from "@/lib/format";
import { getApp } from "@/services/apps";
import { listDeploymentsForApp } from "@/services/deployments";
import { listEnvVars } from "@/services/env-vars";
import { listManagedVolumes } from "@/services/managed-volumes";
import {
  getManualEnvKeys,
  listAppResourceBindings,
  listResourceProviders,
} from "@/services/resources";
import { getI18n } from "@/lib/i18n-server";
import { getRuntimeConfig } from "@/services/runtime-configs";
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AppDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.appDetail;
  const appRecord = await getApp(id);

  if (!appRecord) {
    notFound();
  }

  const { app, server } = appRecord;
  const [
    envVars,
    deployments,
    runtime,
    providers,
    bindings,
    volumes,
    servers,
    manualEnvKeys,
  ] = await Promise.all([
    listEnvVars(id),
    listDeploymentsForApp(id),
    getRuntimeConfig(id),
    listResourceProviders(),
    listAppResourceBindings(id),
    listManagedVolumes(id),
    listServers(),
    getManualEnvKeys(id),
  ]);

  const generatedEnvKeys = new Set(
    bindings.flatMap((binding) => Object.keys(binding.generatedEnv))
  );
  const envCollisions = [...generatedEnvKeys].filter((key) => manualEnvKeys.has(key));
  const hasLocalVolume = volumes.some(({ volume }) => volume.backend === "local");

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{app.name}</h1>
          <p className="text-sm text-muted-foreground">{app.domain}</p>
        </div>
        <form action={deployAppAction.bind(null, app.id)}>
          <Button type="submit">
            <Rocket data-icon="inline-start" />
            {labels.deploy}
          </Button>
        </form>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">{labels.tabs.overview}</TabsTrigger>
          <TabsTrigger value="runtime">{labels.tabs.runtime}</TabsTrigger>
          <TabsTrigger value="resources">{labels.tabs.resources}</TabsTrigger>
          <TabsTrigger value="volumes">{labels.tabs.volumes}</TabsTrigger>
          <TabsTrigger value="env">{labels.tabs.env}</TabsTrigger>
          <TabsTrigger value="deployments">{labels.tabs.deployments}</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>{labels.details.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">{labels.details.gitUrl}</dt>
                    <dd className="break-all font-mono text-xs">{app.gitUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{labels.details.branch}</dt>
                    <dd>{app.branch}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {labels.details.deprecatedComposeFile}
                    </dt>
                    <dd>
                      {app.composeFilePath} ({labels.details.notUsedForProduction})
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">
                      {labels.details.assignedHostPort}
                    </dt>
                    <dd>{app.publicPort}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{labels.details.stateMode}</dt>
                    <dd>
                      <StatusBadge labels={dictionary.status} status={app.stateMode} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">{labels.details.placement}</dt>
                    <dd>
                      <StatusBadge labels={dictionary.status} status={app.placementStrategy} />
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{labels.details.assignedServer}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="text-lg font-semibold">
                  {server?.hostname ?? labels.details.autoSelected}
                </div>
                <div className="text-muted-foreground">
                  {server?.ipAddress ?? labels.details.resolvedAtDeployTime}
                </div>
                {server ? (
                  <StatusBadge labels={dictionary.status} status={server.status} />
                ) : null}
              </CardContent>
            </Card>
          </section>
          <Alert>
            <AlertTitle>{labels.alerts.composeTitle}</AlertTitle>
            <AlertDescription>
              {labels.alerts.composeDescription}
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="runtime">
          <RuntimeConfigForm
            appId={app.id}
            labels={dictionary.forms.runtimeConfig}
            runtime={runtime}
          />
        </TabsContent>

        <TabsContent value="resources" className="flex flex-col gap-4">
          {envCollisions.length > 0 ? (
            <Alert>
              <AlertTitle>{labels.alerts.envOverrideTitle}</AlertTitle>
              <AlertDescription>
                {labels.alerts.envOverrideDescription} {envCollisions.join(", ")}.
              </AlertDescription>
            </Alert>
          ) : null}
          <ResourceBindingForm
            appId={app.id}
            labels={dictionary.forms.resourceBinding}
            providers={providers}
          />
          <Card>
            <CardHeader>
              <CardTitle>{labels.resourceBindings.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.resourceBindings.logicalName}</TableHead>
                    <TableHead>{labels.resourceBindings.provider}</TableHead>
                    <TableHead>{labels.resourceBindings.type}</TableHead>
                    <TableHead>{labels.resourceBindings.status}</TableHead>
                    <TableHead>{labels.resourceBindings.generatedEnv}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bindings.map((binding) => (
                    <TableRow key={binding.id}>
                      <TableCell className="font-medium">{binding.logicalName}</TableCell>
                      <TableCell>{binding.providerName}</TableCell>
                      <TableCell>
                        <StatusBadge labels={dictionary.status} status={binding.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge labels={dictionary.status} status={binding.status} />
                      </TableCell>
                      <TableCell className="max-w-96">
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(binding.generatedEnv).map((key) => (
                            <Badge key={key} variant="outline">
                              {key}=********
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteResourceBindingAction.bind(null, app.id, binding.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={labels.resourceBindings.deleteLabel}
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                  {bindings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                        {labels.resourceBindings.empty}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="volumes" className="flex flex-col gap-4">
          {hasLocalVolume && app.placementStrategy === "auto" ? (
            <Alert variant="destructive">
              <AlertTitle>{labels.alerts.localVolumeTitle}</AlertTitle>
              <AlertDescription>
                {labels.alerts.localVolumeDescription}
              </AlertDescription>
            </Alert>
          ) : null}
          <ManagedVolumeForm
            appId={app.id}
            labels={dictionary.forms.managedVolume}
            servers={servers}
          />
          <Card>
            <CardHeader>
              <CardTitle>{labels.volumes.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.volumes.name}</TableHead>
                    <TableHead>{labels.volumes.mountPath}</TableHead>
                    <TableHead>{labels.volumes.backend}</TableHead>
                    <TableHead>{labels.volumes.movable}</TableHead>
                    <TableHead>{labels.volumes.server}</TableHead>
                    <TableHead>{labels.volumes.nfs}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumes.map(({ volume, server: volumeServer }) => (
                    <TableRow key={volume.id}>
                      <TableCell className="font-medium">{volume.name}</TableCell>
                      <TableCell className="font-mono text-xs">{volume.mountPath}</TableCell>
                      <TableCell>
                        <StatusBadge labels={dictionary.status} status={volume.backend} />
                      </TableCell>
                      <TableCell>
                        {volume.movable ? dictionary.common.yes : dictionary.common.no}
                      </TableCell>
                      <TableCell>{volumeServer?.hostname ?? "-"}</TableCell>
                      <TableCell className="max-w-72 truncate font-mono text-xs">
                        {volume.backend === "nfs"
                          ? `${volume.nfsServer}:${volume.nfsPath}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <form action={deleteManagedVolumeAction.bind(null, app.id, volume.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={labels.volumes.deleteLabel}
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                  {volumes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                        {labels.volumes.empty}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="env" className="flex flex-col gap-4">
          <EnvForm appId={app.id} labels={dictionary.forms.env} />
          <Card>
            <CardHeader>
              <CardTitle>{labels.env.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.env.key}</TableHead>
                    <TableHead>{labels.env.value}</TableHead>
                    <TableHead>{labels.env.secret}</TableHead>
                    <TableHead>{labels.env.required}</TableHead>
                    <TableHead>{labels.env.updated}</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {envVars.map((env) => (
                    <TableRow key={env.id}>
                      <TableCell className="font-mono text-xs">{env.key}</TableCell>
                      <TableCell className="max-w-96 truncate font-mono text-xs">
                        {env.value}
                      </TableCell>
                      <TableCell>
                        {env.isSecret ? dictionary.common.yes : dictionary.common.no}
                      </TableCell>
                      <TableCell>
                        {env.required ? dictionary.common.yes : dictionary.common.no}
                      </TableCell>
                      <TableCell>{formatDate(env.updatedAt, locale)}</TableCell>
                      <TableCell className="text-right">
                        <form action={deleteEnvVarAction.bind(null, app.id, env.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={labels.env.deleteLabel}
                          >
                            <Trash2 />
                          </Button>
                        </form>
                      </TableCell>
                    </TableRow>
                  ))}
                  {envVars.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                        {labels.env.empty}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deployments">
          <Card>
            <CardHeader>
              <CardTitle>{labels.deployments.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{labels.deployments.status}</TableHead>
                    <TableHead>{labels.deployments.server}</TableHead>
                    <TableHead>{labels.deployments.gitRef}</TableHead>
                    <TableHead>{labels.deployments.commit}</TableHead>
                    <TableHead>{labels.deployments.started}</TableHead>
                    <TableHead>{labels.deployments.finished}</TableHead>
                    <TableHead>{labels.deployments.error}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map(({ deployment, server: deployedServer }) => (
                    <TableRow key={deployment.id}>
                      <TableCell>
                        <StatusBadge labels={dictionary.status} status={deployment.status} />
                      </TableCell>
                      <TableCell>{deployedServer.hostname}</TableCell>
                      <TableCell>{deployment.gitRef ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateSha(deployment.commitSha)}
                      </TableCell>
                      <TableCell>{formatDate(deployment.startedAt, locale)}</TableCell>
                      <TableCell>{formatDate(deployment.finishedAt, locale)}</TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">
                        {deployment.errorMessage ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                        {labels.deployments.empty}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </>
  );
}
