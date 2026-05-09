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
import { getRuntimeConfig } from "@/services/runtime-configs";
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AppDetailPage({ params }: PageProps) {
  const { id } = await params;
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
            Deploy
          </Button>
        </form>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="runtime">Runtime</TabsTrigger>
          <TabsTrigger value="resources">Resources</TabsTrigger>
          <TabsTrigger value="volumes">Volumes</TabsTrigger>
          <TabsTrigger value="env">Env</TabsTrigger>
          <TabsTrigger value="deployments">Deployments</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="flex flex-col gap-4">
          <section className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>App Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="grid gap-3 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-muted-foreground">Git URL</dt>
                    <dd className="break-all font-mono text-xs">{app.gitUrl}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Branch</dt>
                    <dd>{app.branch}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Deprecated compose file</dt>
                    <dd>{app.composeFilePath} (not used for production deploys)</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Assigned host port</dt>
                    <dd>{app.publicPort}</dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">State mode</dt>
                    <dd>
                      <StatusBadge status={app.stateMode} />
                    </dd>
                  </div>
                  <div>
                    <dt className="text-muted-foreground">Placement</dt>
                    <dd>
                      <StatusBadge status={app.placementStrategy} />
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Assigned Server</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <div className="text-lg font-semibold">{server?.hostname ?? "Auto selected"}</div>
                <div className="text-muted-foreground">
                  {server?.ipAddress ?? "Resolved at deploy time"}
                </div>
                {server ? <StatusBadge status={server.status} /> : null}
              </CardContent>
            </Card>
          </section>
          <Alert>
            <AlertTitle>Generated compose is authoritative</AlertTitle>
            <AlertDescription>
              Dockyard now deploys Dockerfile-based apps from runtime config and ignores repository
              compose files in production.
            </AlertDescription>
          </Alert>
        </TabsContent>

        <TabsContent value="runtime">
          <RuntimeConfigForm appId={app.id} runtime={runtime} />
        </TabsContent>

        <TabsContent value="resources" className="flex flex-col gap-4">
          {envCollisions.length > 0 ? (
            <Alert>
              <AlertTitle>Generated env overrides manual env</AlertTitle>
              <AlertDescription>
                Resource bindings currently override manual keys: {envCollisions.join(", ")}.
              </AlertDescription>
            </Alert>
          ) : null}
          <ResourceBindingForm appId={app.id} providers={providers} />
          <Card>
            <CardHeader>
              <CardTitle>Resource Bindings</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Logical name</TableHead>
                    <TableHead>Provider</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Generated env</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bindings.map((binding) => (
                    <TableRow key={binding.id}>
                      <TableCell className="font-medium">{binding.logicalName}</TableCell>
                      <TableCell>{binding.providerName}</TableCell>
                      <TableCell>
                        <StatusBadge status={binding.type} />
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={binding.status} />
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
                            aria-label="Delete binding"
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
                        No resource bindings yet.
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
              <AlertTitle>Local volume placement risk</AlertTitle>
              <AlertDescription>
                Apps with local managed volumes must use manual or pinned placement before deploy.
              </AlertDescription>
            </Alert>
          ) : null}
          <ManagedVolumeForm appId={app.id} servers={servers} />
          <Card>
            <CardHeader>
              <CardTitle>Managed Volumes</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Mount path</TableHead>
                    <TableHead>Backend</TableHead>
                    <TableHead>Movable</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>NFS</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {volumes.map(({ volume, server: volumeServer }) => (
                    <TableRow key={volume.id}>
                      <TableCell className="font-medium">{volume.name}</TableCell>
                      <TableCell className="font-mono text-xs">{volume.mountPath}</TableCell>
                      <TableCell>
                        <StatusBadge status={volume.backend} />
                      </TableCell>
                      <TableCell>{volume.movable ? "yes" : "no"}</TableCell>
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
                            aria-label="Delete volume"
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
                        No managed volumes yet.
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="env" className="flex flex-col gap-4">
          <EnvForm appId={app.id} />
          <Card>
            <CardHeader>
              <CardTitle>Manual Environment Variables</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Key</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Secret</TableHead>
                    <TableHead>Required</TableHead>
                    <TableHead>Updated</TableHead>
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
                      <TableCell>{env.isSecret ? "yes" : "no"}</TableCell>
                      <TableCell>{env.required ? "yes" : "no"}</TableCell>
                      <TableCell>{formatDate(env.updatedAt)}</TableCell>
                      <TableCell className="text-right">
                        <form action={deleteEnvVarAction.bind(null, app.id, env.id)}>
                          <Button
                            type="submit"
                            variant="ghost"
                            size="icon-sm"
                            aria-label="Delete env"
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
                        No manual environment variables yet.
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
              <CardTitle>Deployment History</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Server</TableHead>
                    <TableHead>Git ref</TableHead>
                    <TableHead>Commit</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Finished</TableHead>
                    <TableHead>Error</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deployments.map(({ deployment, server: deployedServer }) => (
                    <TableRow key={deployment.id}>
                      <TableCell>
                        <StatusBadge status={deployment.status} />
                      </TableCell>
                      <TableCell>{deployedServer.hostname}</TableCell>
                      <TableCell>{deployment.gitRef ?? "-"}</TableCell>
                      <TableCell className="font-mono text-xs">
                        {truncateSha(deployment.commitSha)}
                      </TableCell>
                      <TableCell>{formatDate(deployment.startedAt)}</TableCell>
                      <TableCell>{formatDate(deployment.finishedAt)}</TableCell>
                      <TableCell className="max-w-72 truncate text-muted-foreground">
                        {deployment.errorMessage ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                  {deployments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="h-20 text-center text-muted-foreground">
                        No deployments yet.
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
