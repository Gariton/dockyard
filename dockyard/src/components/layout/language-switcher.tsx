"use client";

import { Languages } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  localeCookieName,
  locales,
  type Dictionary,
  type Locale,
} from "@/lib/i18n";

const selectClass =
  "h-8 rounded-lg border border-input bg-background px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50";

export function LanguageSwitcher({
  labels,
  locale,
}: {
  labels: Dictionary["language"];
  locale: Locale;
}) {
  const router = useRouter();

  function changeLocale(nextLocale: Locale) {
    document.cookie = `${localeCookieName}=${nextLocale}; path=/; max-age=31536000; SameSite=Lax`;
    router.refresh();
  }

  return (
    <label className="flex items-center gap-2 text-sm text-muted-foreground">
      <Languages aria-hidden="true" />
      <span className="sr-only">{labels.label}</span>
      <select
        aria-label={labels.label}
        className={selectClass}
        value={locale}
        onChange={(event) => changeLocale(event.target.value as Locale)}
      >
        {locales.map((localeOption) => (
          <option key={localeOption} value={localeOption}>
            {labels[localeOption]}
          </option>
        ))}
      </select>
    </label>
  );
}
