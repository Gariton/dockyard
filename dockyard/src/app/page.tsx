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
import { getDashboardStats, listDeployments } from "@/services/deployments";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [stats, deployments] = await Promise.all([
    getDashboardStats(),
    listDeployments(),
  ]);

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Docker Compose apps, deploy jobs, and agent capacity in one place.
          </p>
        </div>
        <Link href="/apps/new" className={buttonVariants()}>
          <Rocket data-icon="inline-start" />
          New app
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Apps" value={stats.appCount} detail="registered services" />
        <MetricCard label="Servers" value={stats.serverCount} detail="known agents" />
        <MetricCard
          label="Online"
          value={stats.onlineServerCount}
          detail="available targets"
        />
        <MetricCard
          label="Recent deploys"
          value={deployments.length}
          detail="visible history rows"
        />
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Latest Deployments</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Created</TableHead>
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
                    <StatusBadge status={deployment.status} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(deployment.commitSha)}
                  </TableCell>
                  <TableCell>{formatDate(deployment.createdAt)}</TableCell>
                </TableRow>
              ))}
              {deployments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
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
