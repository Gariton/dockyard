import { AppForm } from "@/components/forms/app-form";
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

export default async function NewAppPage() {
  const servers = await listServers();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">Register App</h1>
        <p className="text-sm text-muted-foreground">
          Add a Compose-ready repository and choose how Dockyard should assign a target.
        </p>
      </div>
      <AppForm servers={servers} />
    </>
  );
}
