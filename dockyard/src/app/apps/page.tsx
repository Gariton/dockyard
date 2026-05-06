import Link from "next/link";
import { Plus } from "lucide-react";

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
import { StatusBadge } from "@/components/status/status-badge";
import { formatDate, truncateSha } from "@/lib/format";
import { listApps } from "@/services/apps";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const apps = await listApps();

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Apps</h1>
          <p className="text-sm text-muted-foreground">
            Registered Docker Compose apps and their last known deployment state.
          </p>
        </div>
        <Link href="/apps/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          Register app
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Application Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App name</TableHead>
                <TableHead>Domain</TableHead>
                <TableHead>Git URL</TableHead>
                <TableHead>Branch</TableHead>
                <TableHead>Assigned server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {apps.map((app) => (
                <TableRow key={app.id}>
                  <TableCell>
                    <Link href={`/apps/${app.id}`} className="font-medium hover:underline">
                      {app.name}
                    </Link>
                  </TableCell>
                  <TableCell>{app.domain}</TableCell>
                  <TableCell className="max-w-72 truncate font-mono text-xs">
                    {app.gitUrl}
                  </TableCell>
                  <TableCell>{app.branch}</TableCell>
                  <TableCell>{app.assignedServer ?? "auto"}</TableCell>
                  <TableCell>
                    <StatusBadge status={app.latestDeploymentStatus} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(app.latestDeployedCommit)}
                  </TableCell>
                  <TableCell>{formatDate(app.updatedAt)}</TableCell>
                </TableRow>
              ))}
              {apps.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No apps registered.
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
