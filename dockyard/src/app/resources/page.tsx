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
import { getI18n } from "@/lib/i18n-server";
import { listResourceProviders } from "@/services/resources";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const { dictionary, locale } = await getI18n();
  const labels = dictionary.resources;
  const providers = await listResourceProviders();

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-normal">{labels.title}</h1>
          <p className="text-sm text-muted-foreground">
            {labels.description}
          </p>
        </div>
        <Link href="/resources/new" className={buttonVariants()}>
          <Plus data-icon="inline-start" />
          {labels.registerProvider}
        </Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>{labels.inventory}</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{labels.table.name}</TableHead>
                <TableHead>{labels.table.type}</TableHead>
                <TableHead>{labels.table.endpoint}</TableHead>
                <TableHead>{labels.table.updated}</TableHead>
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
                    <StatusBadge labels={dictionary.status} status={provider.type} />
                  </TableCell>
                  <TableCell className="max-w-96 truncate font-mono text-xs">
                    {provider.endpoint}
                  </TableCell>
                  <TableCell>{formatDate(provider.updatedAt, locale)}</TableCell>
                </TableRow>
              ))}
              {providers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-20 text-center text-muted-foreground">
                    {labels.empty}
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
