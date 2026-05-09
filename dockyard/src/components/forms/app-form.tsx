import { createAppAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Server } from "@/db/schema";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AppForm({ servers }: { servers: Server[] }) {
  return (
    <form action={createAppAction}>
      <Card>
        <CardHeader>
          <CardTitle>Register App</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="name">App name</Label>
            <Input id="name" name="name" placeholder="checkmate" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="domain">Domain</Label>
            <Input id="domain" name="domain" placeholder="checkmate.example.local" required />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="gitUrl">Git URL</Label>
            <Input
              id="gitUrl"
              name="gitUrl"
              placeholder="git@git.example.local:apps/checkmate.git"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="branch">Branch</Label>
            <Input id="branch" name="branch" defaultValue="main" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="composeFilePath">Compose file path (deprecated)</Label>
            <Input id="composeFilePath" name="composeFilePath" defaultValue="compose.yaml" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="publicPort">Host port</Label>
            <Input
              id="publicPort"
              name="publicPort"
              type="number"
              min={1}
              max={65535}
              placeholder="auto"
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="healthcheckPath">Health check path</Label>
            <Input id="healthcheckPath" name="healthcheckPath" defaultValue="/" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="stateMode">State mode</Label>
            <select id="stateMode" name="stateMode" className={selectClass} defaultValue="stateless">
              <option value="stateless">Stateless</option>
              <option value="stateful">Stateful</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="placementStrategy">Placement</Label>
            <select
              id="placementStrategy"
              name="placementStrategy"
              className={selectClass}
              defaultValue="auto"
            >
              <option value="auto">Auto</option>
              <option value="manual">Manual</option>
              <option value="pinned">Pinned</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="manualServerId">Manual or initial pinned server</Label>
            <select id="manualServerId" name="manualServerId" className={selectClass} defaultValue="">
              <option value="">Select when manual</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.hostname} ({server.agentId})
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">Create app</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
