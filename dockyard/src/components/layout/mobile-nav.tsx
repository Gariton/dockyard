"use client";

import { Menu, X } from "lucide-react";
import { useState } from "react";

import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { NavLinks } from "@/components/layout/nav-links";
import { Button } from "@/components/ui/button";
import type { Dictionary, Locale } from "@/lib/i18n";

export function MobileNav({
  dictionary,
  locale,
}: {
  dictionary: Dictionary;
  locale: Locale;
}) {
  const [open, setOpen] = useState(false);
  const menuLabel = open ? dictionary.shell.closeMenu : dictionary.shell.openMenu;
  const Icon = open ? X : Menu;

  return (
    <div className="lg:hidden">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-expanded={open}
        aria-label={menuLabel}
        onClick={() => setOpen((current) => !current)}
      >
        <Icon />
      </Button>
      {open ? (
        <div className="absolute top-14 right-0 left-0 border-b bg-background p-3 shadow-sm">
          <NavLinks
            labels={dictionary.nav}
            onNavigate={() => setOpen(false)}
            className="p-0"
          />
          <div className="mt-3 border-t pt-3">
            <LanguageSwitcher labels={dictionary.language} locale={locale} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
