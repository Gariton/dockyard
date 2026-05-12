import { ResourceProviderForm } from "@/components/forms/resource-provider-form";
import { getI18n } from "@/lib/i18n-server";

export default async function NewResourceProviderPage() {
  const { dictionary } = await getI18n();
  const labels = dictionary.newResourceProvider;

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
        <p className="text-sm text-muted-foreground">
          {labels.description}
        </p>
      </div>
      <ResourceProviderForm labels={dictionary.forms.resourceProvider} />
    </>
  );
}
