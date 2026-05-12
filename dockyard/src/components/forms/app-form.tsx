import { createAppAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { Server } from "@/db/schema";
import type { Dictionary } from "@/lib/i18n";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function AppForm({
  labels,
  servers,
}: {
  labels: Dictionary["forms"]["app"];
  servers: Server[];
}) {
  return (
    <form action={createAppAction}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-5 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="name">{labels.appName}</Label>
            <Input id="name" name="name" placeholder="checkmate" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="domain">{labels.domain}</Label>
            <Input id="domain" name="domain" placeholder="checkmate.example.local" required />
          </label>
          <label className="flex flex-col gap-2 md:col-span-2">
            <Label htmlFor="gitUrl">{labels.gitUrl}</Label>
            <Input
              id="gitUrl"
              name="gitUrl"
              placeholder="git@git.example.local:apps/checkmate.git"
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="branch">{labels.branch}</Label>
            <Input id="branch" name="branch" defaultValue="main" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="composeFilePath">{labels.composeFilePath}</Label>
            <Input id="composeFilePath" name="composeFilePath" defaultValue="compose.yaml" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="publicPort">{labels.hostPort}</Label>
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
            <Label htmlFor="healthcheckPath">{labels.healthCheckPath}</Label>
            <Input id="healthcheckPath" name="healthcheckPath" defaultValue="/" required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="stateMode">{labels.stateMode}</Label>
            <select id="stateMode" name="stateMode" className={selectClass} defaultValue="stateless">
              <option value="stateless">{labels.stateless}</option>
              <option value="stateful">{labels.stateful}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="placementStrategy">{labels.placement}</Label>
            <select
              id="placementStrategy"
              name="placementStrategy"
              className={selectClass}
              defaultValue="auto"
            >
              <option value="auto">{labels.auto}</option>
              <option value="manual">{labels.manual}</option>
              <option value="pinned">{labels.pinned}</option>
            </select>
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="manualServerId">{labels.manualServer}</Label>
            <select id="manualServerId" name="manualServerId" className={selectClass} defaultValue="">
              <option value="">{labels.selectWhenManual}</option>
              {servers.map((server) => (
                <option key={server.id} value={server.id}>
                  {server.hostname} ({server.agentId})
                </option>
              ))}
            </select>
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">{labels.createApp}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
