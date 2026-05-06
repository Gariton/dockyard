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
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

export default async function ServersPage() {
  const servers = await listServers();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Servers</h1>
        <p className="text-sm text-muted-foreground">
          Agent heartbeats update capacity and availability for automatic placement.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Server Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Hostname</TableHead>
                <TableHead>IP address</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>CPU</TableHead>
                <TableHead>Memory</TableHead>
                <TableHead>Disk</TableHead>
                <TableHead>Apps</TableHead>
                <TableHead>Last heartbeat</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {servers.map((server) => (
                <TableRow key={server.id}>
                  <TableCell className="font-medium">{server.hostname}</TableCell>
                  <TableCell>{server.ipAddress}</TableCell>
                  <TableCell>
                    <StatusBadge status={server.status} />
                  </TableCell>
                  <TableCell>{server.cpuUsagePercent.toFixed(1)}%</TableCell>
                  <TableCell>
                    {formatMb(server.memoryUsedMb)} / {formatMb(server.memoryTotalMb)}
                  </TableCell>
                  <TableCell>
                    {formatMb(server.diskUsedMb)} / {formatMb(server.diskTotalMb)}
                  </TableCell>
                  <TableCell>{server.runningAppCount}</TableCell>
                  <TableCell>{formatDate(server.lastHeartbeatAt)}</TableCell>
                </TableRow>
              ))}
              {servers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="h-20 text-center text-muted-foreground">
                    No agent heartbeat has been received.
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
