import Link from "next/link";
import { Anchor } from "lucide-react";

import { NavLinks } from "@/components/layout/nav-links";

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-muted/30">
      <aside className="fixed inset-y-0 left-0 hidden w-64 border-r bg-background lg:flex lg:flex-col">
        <Link href="/" className="flex h-16 items-center gap-3 border-b px-5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Anchor />
          </span>
          <span className="flex flex-col leading-tight">
            <span className="font-heading text-base font-semibold">Dockyard</span>
            <span className="text-xs text-muted-foreground">deploy control plane</span>
          </span>
        </Link>
        <NavLinks />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-background/95 px-4 backdrop-blur lg:hidden">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            <Anchor />
            Dockyard
          </Link>
        </header>
        <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
