import { en, type MessageKey } from "./en";
import { es } from "./es";

export type Locale = "en" | "es";

const DICTS: Record<Locale, Record<MessageKey, string>> = { en, es };

export function interpolate(
  template: string,
  vars?: Record<string, string | number>,
): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, key: string) =>
    vars[key] == null ? `{${key}}` : String(vars[key]),
  );
}

export function translate(
  locale: Locale,
  key: MessageKey,
  vars?: Record<string, string | number>,
): string {
  return interpolate(DICTS[locale][key] ?? DICTS.en[key] ?? key, vars);
}

export const LOCALES: { id: Locale; label: string }[] = [
  { id: "en", label: "EN" },
  { id: "es", label: "ES" },
];
