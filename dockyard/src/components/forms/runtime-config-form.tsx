import { updateRuntimeConfigAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppRuntimeConfig } from "@/db/schema";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RuntimeConfigForm({
  appId,
  runtime,
}: {
  appId: string;
  runtime: AppRuntimeConfig;
}) {
  return (
    <form action={updateRuntimeConfigAction.bind(null, appId)}>
      <Card>
        <CardHeader>
          <CardTitle>Runtime Configuration</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="buildContext">Build context</Label>
            <Input id="buildContext" name="buildContext" defaultValue={runtime.buildContext} required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="dockerfilePath">Dockerfile path</Label>
            <Input
              id="dockerfilePath"
              name="dockerfilePath"
              defaultValue={runtime.dockerfilePath}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="command">Command</Label>
            <Input id="command" name="command" defaultValue={runtime.command ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="workingDir">Working directory</Label>
            <Input id="workingDir" name="workingDir" defaultValue={runtime.workingDir ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="containerPort">Container port</Label>
            <Input
              id="containerPort"
              name="containerPort"
              type="number"
              min={1}
              max={65535}
              defaultValue={runtime.containerPort}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="healthcheckPath">Healthcheck path</Label>
            <Input
              id="healthcheckPath"
              name="healthcheckPath"
              defaultValue={runtime.healthcheckPath}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="healthcheckIntervalSeconds">Healthcheck interval seconds</Label>
            <Input
              id="healthcheckIntervalSeconds"
              name="healthcheckIntervalSeconds"
              type="number"
              min={1}
              defaultValue={runtime.healthcheckIntervalSeconds}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="healthcheckTimeoutSeconds">Healthcheck timeout seconds</Label>
            <Input
              id="healthcheckTimeoutSeconds"
              name="healthcheckTimeoutSeconds"
              type="number"
              min={1}
              defaultValue={runtime.healthcheckTimeoutSeconds}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="cpuLimit">CPU limit</Label>
            <Input id="cpuLimit" name="cpuLimit" placeholder="0.5" defaultValue={runtime.cpuLimit ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="memoryLimitMb">Memory limit MB</Label>
            <Input
              id="memoryLimitMb"
              name="memoryLimitMb"
              type="number"
              min={1}
              defaultValue={runtime.memoryLimitMb ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="restartPolicy">Restart policy</Label>
            <select
              id="restartPolicy"
              name="restartPolicy"
              className={selectClass}
              defaultValue={runtime.restartPolicy}
            >
              <option value="unless-stopped">unless-stopped</option>
              <option value="always">always</option>
              <option value="on-failure">on-failure</option>
              <option value="no">no</option>
            </select>
          </label>
          <div className="flex justify-end md:col-span-2">
            <Button type="submit">Save runtime</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
