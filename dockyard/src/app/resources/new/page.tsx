import { ResourceProviderForm } from "@/components/forms/resource-provider-form";

export default function NewResourceProviderPage() {
  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold tracking-normal">New Resource Provider</h1>
        <p className="text-sm text-muted-foreground">
          Register shared infrastructure that apps can bind to during deployment.
        </p>
      </div>
      <ResourceProviderForm />
    </>
  );
}
