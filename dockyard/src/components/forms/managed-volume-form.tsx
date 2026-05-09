import { createManagedVolumeAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Server } from "@/db/schema";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function ManagedVolumeForm({
  appId,
  servers,
}: {
  appId: string;
  servers: Server[];
}) {
  return (
    <form action={createManagedVolumeAction.bind(null, appId)}>
      <Card size="sm">
        <CardHeader>
          <CardTitle>Add Managed Volume</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="app_data" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="mountPath">Mount path</Label>
            <Input id="mountPath" name="mountPath" placeholder="/app/data" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="backend">Backend</Label>
            <select id="backend" name="backend" className={selectClass} defaultValue="local">
              <option value="local">Local</option>
              <option value="nfs">NFS</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="serverId">Pinned server</Label>
            <select id="serverId" name="serverId" className={selectClass} defaultValue="">
              <option value="">None</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.hostname}
                </option>
              ))}
            </select>
          </label>
          <label className="flex items-center gap-2 pb-1 text-sm">
            <input name="movable" type="checkbox" className="size-4 rounded border-input" />
            Movable
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="sizeLimitMb">Size limit MB</Label>
            <Input id="sizeLimitMb" name="sizeLimitMb" type="number" min={1} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="nfsServer">NFS server</Label>
            <Input id="nfsServer" name="nfsServer" placeholder="nfs.internal" />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="nfsPath">NFS path</Label>
            <Input id="nfsPath" name="nfsPath" placeholder="/exports/dockyard/app_data" />
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">Add volume</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
