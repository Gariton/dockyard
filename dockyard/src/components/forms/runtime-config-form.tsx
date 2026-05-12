import { updateRuntimeConfigAction } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AppRuntimeConfig } from "@/db/schema";
import type { Dictionary } from "@/lib/i18n";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function RuntimeConfigForm({
  appId,
  labels,
  runtime,
}: {
  appId: string;
  labels: Dictionary["forms"]["runtimeConfig"];
  runtime: AppRuntimeConfig;
}) {
  return (
    <form action={updateRuntimeConfigAction.bind(null, appId)}>
      <Card>
        <CardHeader>
          <CardTitle>{labels.title}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <label className="flex flex-col gap-2">
            <Label htmlFor="buildContext">{labels.buildContext}</Label>
            <Input id="buildContext" name="buildContext" defaultValue={runtime.buildContext} required />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="dockerfilePath">{labels.dockerfilePath}</Label>
            <Input
              id="dockerfilePath"
              name="dockerfilePath"
              defaultValue={runtime.dockerfilePath}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="command">{labels.command}</Label>
            <Input id="command" name="command" defaultValue={runtime.command ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="workingDir">{labels.workingDirectory}</Label>
            <Input id="workingDir" name="workingDir" defaultValue={runtime.workingDir ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="containerPort">{labels.containerPort}</Label>
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
            <Label htmlFor="healthcheckPath">{labels.healthcheckPath}</Label>
            <Input
              id="healthcheckPath"
              name="healthcheckPath"
              defaultValue={runtime.healthcheckPath}
              required
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="healthcheckIntervalSeconds">
              {labels.healthcheckIntervalSeconds}
            </Label>
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
            <Label htmlFor="healthcheckTimeoutSeconds">
              {labels.healthcheckTimeoutSeconds}
            </Label>
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
            <Label htmlFor="cpuLimit">{labels.cpuLimit}</Label>
            <Input id="cpuLimit" name="cpuLimit" placeholder="0.5" defaultValue={runtime.cpuLimit ?? ""} />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="memoryLimitMb">{labels.memoryLimitMb}</Label>
            <Input
              id="memoryLimitMb"
              name="memoryLimitMb"
              type="number"
              min={1}
              defaultValue={runtime.memoryLimitMb ?? ""}
            />
          </label>
          <label className="flex flex-col gap-2">
            <Label htmlFor="restartPolicy">{labels.restartPolicy}</Label>
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
            <Button type="submit">{labels.saveRuntime}</Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
