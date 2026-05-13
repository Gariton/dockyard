import { getAppPublicScheme } from "@/lib/config";

export function publicUrlForDomain(domain: string) {
  return `${getAppPublicScheme()}://${domain}`;
}
