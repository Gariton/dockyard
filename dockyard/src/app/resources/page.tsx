import Link from "next/link";
import { Plus } from "lucide-react";

import { StatusBadge } from "@/components/status/status-badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate } from "@/lib/format";
import { listResourceProviders } from "@/services/resources";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const providers = await listResourceProviders();

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">Resource Providers</h1>
          <p className="text-sm text-muted-foreground">
            Shared PostgreSQL, S3, Elasticsearch, and Redis providers for app bindings.
          </p>
        </div>
        <Link href="/resources/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          Register provider
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Provider Inventory</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Endpoint</TableHead>
                <TableHead>Updated</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map((provider) => (
                <TableRow key={provider.id}>
                  <TableCell>
                    <Link href={`/resources/${provider.id}`} className="font-medium hover:underline">
                      {provider.name}
                    </Link>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={provider.type} />
                  </TableCell>
                  <TableCell className="max-w-96 truncate font-mono text-xs">
                    {provider.endpoint}
                  </TableCell>
                  <TableCell>{formatDate(provider.updatedAt)}</TableCell>
                </TableRow>
              ))}
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    No resource providers registered.
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
