import Link from "next/link";
import { Rocket } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { MetricCard } from "@/components/status/metric-card";
import { StatusBadge } from "@/components/status/status-badge";
import { formatDate, truncateSha } from "@/lib/format";
import { getI18n } from "@/lib/i18n-server";
import { getDashboardStats, listDeployments } from "@/services/deployments";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.dashboard;
  const [stats, deployments] = await Promise.all([
    getDashboardStats(),
    listDeployments(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
          <p className="text-sm text-muted-foreground">
            {labels.description}
          </p>
        </div>
        <Link href="/apps/new" className={buttonVariants()}>
          <Rocket data-icon="inline-start" />
          {labels.newApp}
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label={labels.metrics.apps}
          value={stats.appCount}
          detail={labels.metrics.appsDetail}
        />
        <MetricCard
          label={labels.metrics.servers}
          value={stats.serverCount}
          detail={labels.metrics.serversDetail}
        />
        <MetricCard
          label={labels.metrics.online}
          value={stats.onlineServerCount}
          detail={labels.metrics.onlineDetail}
        />
        <MetricCard
          label={labels.metrics.recentDeploys}
          value={deployments.length}
          detail={labels.metrics.recentDeploysDetail}
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>{labels.latestDeployments}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.app}</TableHead>
                <TableHead>{labels.table.server}</TableHead>
                <TableHead>{labels.table.status}</TableHead>
                <TableHead>{labels.table.commit}</TableHead>
                <TableHead>{labels.table.created}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deployments.slice(0, 8).map(({ deployment, app, server }) => (
                <TableRow key={deployment.id}>
                  <TableCell>
                    <Link href={`/apps/${app.id}`} className="font-medium hover:underline">
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell>{server.hostname}</TableCell>
                  <TableCell>
                    <StatusBadge labels={dictionary.status} status={deployment.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(deployment.commitSha)}
                  </TableCell>
                  <TableCell>{formatDate(deployment.createdAt, locale)}</TableCell>
                </TableRow>
              ))}
              {deployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                    {labels.empty}
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
