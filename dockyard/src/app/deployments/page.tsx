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
import { getI18n } from "@/lib/i18n-server";
import { listDeployments } from "@/services/deployments";
import { publicUrlForDomain } from "@/services/public-url";

export const dynamic = "force-dynamic";

export default async function DeploymentsPage() {
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.deployments;
  const rows = await listDeployments();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">
          {labels.description}
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{labels.history}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.app}</TableHead>
                <TableHead>{labels.table.url}</TableHead>
                <TableHead>{labels.table.server}</TableHead>
                <TableHead>{labels.table.status}</TableHead>
                <TableHead>{labels.table.ref}</TableHead>
                <TableHead>{labels.table.commit}</TableHead>
                <TableHead>{labels.table.started}</TableHead>
                <TableHead>{labels.table.finished}</TableHead>
                <TableHead>{labels.table.error}</TableHead>
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
                  <TableCell>
                    <a
                      href={publicUrlForDomain(app.domain)}
                      target="_blank"
                      rel="noreferrer"
                      className="font-mono text-xs text-primary hover:underline"
                      aria-label={`${labels.openUrl}: ${app.domain}`}
                    >
                      {app.domain}
                    </a>
                  </TableCell>
                  <TableCell>{server.hostname}</TableCell>
                  <TableCell>
                    <StatusBadge labels={dictionary.status} status={deployment.status} />
                  </TableCell>
                  <TableCell>{deployment.gitRef ?? "-"}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(deployment.commitSha)}
                  </TableCell>
                  <TableCell>{formatDate(deployment.startedAt, locale)}</TableCell>
                  <TableCell>{formatDate(deployment.finishedAt, locale)}</TableCell>
                  <TableCell className="max-w-80 truncate text-muted-foreground">
                    {deployment.errorMessage ?? "-"}
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-20 text-center text-muted-foreground">
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
