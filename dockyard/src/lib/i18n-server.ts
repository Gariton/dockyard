import { cookies } from "next/headers";

import {
  defaultLocale,
  getDictionary,
  isLocale,
  localeCookieName,
} from "@/lib/i18n";

export async function getLocale() {
  const cookieStore = await cookies();
  const requestedLocale = cookieStore.get(localeCookieName)?.value;

  return isLocale(requestedLocale) ? requestedLocale : defaultLocale;
}

export async function getI18n() {
  const locale = await getLocale();

  return {
    dictionary: getDictionary(locale),
    locale,
  };
}
