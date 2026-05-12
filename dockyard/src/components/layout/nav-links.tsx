"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Boxes,
  Database,
  History,
  LayoutDashboard,
  Server,
  type LucideIcon,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { Dictionary } from "@/lib/i18n";

type NavItem = {
  href: string;
  labelKey: keyof Dictionary["nav"];
  icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/", labelKey: "dashboard", icon: LayoutDashboard },
  { href: "/apps", labelKey: "apps", icon: Boxes },
  { href: "/resources", labelKey: "resources", icon: Database },
  { href: "/servers", labelKey: "servers", icon: Server },
  { href: "/deployments", labelKey: "deployments", icon: History },
];

export function NavLinks({ labels }: { labels: Dictionary["nav"] }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-3">
      {items.map((item) => {
        const Icon = item.icon;
        const active =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              active && "bg-muted text-foreground"
            )}
          >
            <Icon data-icon="inline-start" />
            {labels[item.labelKey]}
          </Link>
        );
      })}
    </nav>
  );
}
