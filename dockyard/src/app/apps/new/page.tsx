import { AppForm } from "@/components/forms/app-form";
import { getI18n } from "@/lib/i18n-server";
import { listServers } from "@/services/servers";

export const dynamic = "force-dynamic";

export default async function NewAppPage() {
  const { dictionary } = await getI18n();
  const labels = dictionary.newApp;
  const servers = await listServers();

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">
          {labels.description}
        </p>
      </div>
      <AppForm labels={dictionary.forms.app} servers={servers} />
    </>
  );
}
