import Link from "next/link";

import { StatusBadge } from "@/components/status/status-badge";
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
import { listDeployments } from "@/services/deployments";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage() {
  const rows = await listDeployments();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Deployments</h1>
        <p className="text-sm text-muted-foreground">
          Queue, running, success, and failed deployment records from agents.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Deployment History</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>App</TableHead>
                <TableHead>Server</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ref</TableHead>
                <TableHead>Commit</TableHead>
                <TableHead>Started</TableHead>
                <TableHead>Finished</TableHead>
                <TableHead>Error</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map(({ deployment, app, server }) => (
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
                  <TableCell>{deployment.gitRef ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(deployment.commitSha)}
                  </TableCell>
                  <TableCell>{formatDate(deployment.startedAt)}</TableCell>
                  <TableCell>{formatDate(deployment.finishedAt)}</TableCell>
                  <TableCell className="max-w-80 truncate text-muted-foreground">
                    {deployment.errorMessage ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
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
