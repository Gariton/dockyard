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
import { getI18n } from "@/lib/i18n-server";
import { listApps } from "@/services/apps";

export const dynamic = "force-dynamic";

export default async function AppsPage() {
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.apps;
  const apps = await listApps();

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
          <Plus data-icon="inline-start" />
          {labels.registerApp}
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{labels.inventory}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.appName}</TableHead>
                <TableHead>{labels.table.domain}</TableHead>
                <TableHead>{labels.table.gitUrl}</TableHead>
                <TableHead>{labels.table.branch}</TableHead>
                <TableHead>{labels.table.assignedServer}</TableHead>
                <TableHead>{labels.table.placement}</TableHead>
                <TableHead>{labels.table.status}</TableHead>
                <TableHead>{labels.table.commit}</TableHead>
                <TableHead>{labels.table.updated}</TableHead>
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
                  <TableCell>{app.assignedServer ?? dictionary.common.auto}</TableCell>
                  <TableCell>
                    <StatusBadge labels={dictionary.status} status={app.placementStrategy} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge labels={dictionary.status} status={app.latestDeploymentStatus} />
                  </TableCell>
                  <TableCell className="font-mono text-xs">
                    {truncateSha(app.latestDeployedCommit)}
                  </TableCell>
                  <TableCell>{formatDate(app.updatedAt, locale)}</TableCell>
                </TableRow>
              ))}
              {apps.length === 0 ? (
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
