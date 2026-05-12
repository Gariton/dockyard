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
import { formatDate, formatMb } from "@/lib/format";
import { getI18n } from "@/lib/i18n-server";
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.servers;
  const servers = await listServers();

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
          <CardTitle>{labels.inventory}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.hostname}</TableHead>
                <TableHead>{labels.table.ipAddress}</TableHead>
                <TableHead>{labels.table.status}</TableHead>
                <TableHead>{labels.table.cpu}</TableHead>
                <TableHead>{labels.table.memory}</TableHead>
                <TableHead>{labels.table.disk}</TableHead>
                <TableHead>{labels.table.apps}</TableHead>
                <TableHead>{labels.table.lastHeartbeat}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.hostname}</TableCell>
                  <TableCell>{server.ipAddress}</TableCell>
                  <TableCell>
                    <StatusBadge labels={dictionary.status} status={server.status} />
                  </TableCell>
                  <TableCell>{server.cpuUsagePercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    {formatMb(server.memoryUsedMb)} / {formatMb(server.memoryTotalMb)}
                  </TableCell>
                  <TableCell>
                    {formatMb(server.diskUsedMb)} / {formatMb(server.diskTotalMb)}
                  </TableCell>
                  <TableCell>{server.runningAppCount}</TableCell>
                  <TableCell>{formatDate(server.lastHeartbeatAt, locale)}</TableCell>
                </TableRow>
              ))}
              {servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
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
