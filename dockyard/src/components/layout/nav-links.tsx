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

type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

const items: NavItem[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/apps", label: "Apps", icon: Boxes },
  { href: "/resources", label: "Resources", icon: Database },
  { href: "/servers", label: "Servers", icon: Server },
  { href: "/deployments", label: "Deployments", icon: History },
];

export function NavLinks() {
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
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
