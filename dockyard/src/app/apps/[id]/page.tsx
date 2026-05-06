import { notFound } from "next/navigation";
import { Rocket, Trash2 } from "lucide-react";

import { deleteEnvVarAction, deployAppAction } from "@/app/actions";
import { EnvForm } from "@/components/forms/env-form";
import { StatusBadge } from "@/components/status/status-badge";
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
import { formatDate, truncateSha } from "@/lib/format";
import { getApp } from "@/services/apps";
import { listDeploymentsForApp } from "@/services/deployments";
import { listEnvVars } from "@/services/env-vars";

export const dynamic = "force-dynamic";

type PageProps = { params: Promise<{ id: string }> };

export default async function AppDetailPage({ params }: PageProps) {
  const { id } = await params;
  const appRecord = await getApp(id);

  if (!appRecord) {
    notFound();
  }

  const [{ app, server }, envVars, deployments] = await Promise.all([
    Promise.resolve(appRecord),
    listEnvVars(id),
    listDeploymentsForApp(id),
  ]);

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
                <dt className="text-muted-foreground">Compose file</dt>
                <dd>{app.composeFilePath}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Public port</dt>
                <dd>{app.publicPort}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Health check</dt>
                <dd>{app.healthcheckPath}</dd>
              </div>
              <div>
                <dt className="text-muted-foreground">Target mode</dt>
                <dd>
                  <StatusBadge status={app.targetMode} />
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
            <div className="text-muted-foreground">{server?.ipAddress ?? "Resolved at deploy time"}</div>
            {server ? <StatusBadge status={server.status} /> : null}
          </CardContent>
        </Card>
      </section>

      <section className="flex flex-col gap-4">
        <EnvForm appId={app.id} />
        <Card>
          <CardHeader>
            <CardTitle>Environment Variables</CardTitle>
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
                        <Button type="submit" variant="ghost" size="icon-sm" aria-label="Delete env">
                          <Trash2 />
                        </Button>
                      </form>
                    </TableCell>
                  </TableRow>
                ))}
                {envVars.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-20 text-center text-muted-foreground">
                      No environment variables yet.
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </section>

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
    </>
  );
}
