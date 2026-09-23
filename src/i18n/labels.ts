import type { MessageKey } from "./en";
import type { Locale } from "./translate";
import { translate } from "./translate";
import type { FlavorId, ProcessId, RoastStyleId, BrewId, DensityClass, BeanSize } from "../lib/knowledge";
import type { Grind } from "../lib/brew";

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

export function flavorLabel(id: FlavorId, t: TFn): string {
  return t(`flavor.${id}` as MessageKey);
}

export function processLabel(id: ProcessId, t: TFn): string {
  return t(`process.${id}` as MessageKey);
}

export function styleLabel(id: RoastStyleId, t: TFn): string {
  return t(`style.${id}` as MessageKey);
}

export function brewLabel(id: BrewId, t: TFn): string {
  return t(`brew.${id}` as MessageKey);
}

export function densityLabel(id: DensityClass, t: TFn): string {
  return t(`density.${id}` as MessageKey);
}

export function sizeLabel(id: BeanSize, t: TFn): string {
  return t(`size.${id}` as MessageKey);
}

export function grindLabel(id: Grind, t: TFn): string {
  return t(`grind.${id}` as MessageKey);
}

export function originLabel(id: string, t: TFn, fallback: string): string {
  const key = `origin.${id}` as MessageKey;
  const hit = t(key);
  return hit === key ? fallback : hit;
}

export function originRegionLabel(id: string, t: TFn, fallback: string): string {
  const key = `originRegion.${id}` as MessageKey;
  const hit = t(key);
  return hit === key ? fallback : hit;
}

export function varietyLabel(id: string, t: TFn, fallback: string): string {
  const key = `variety.${id}` as MessageKey;
  const hit = t(key);
  return hit === key ? fallback : hit;
}

export function defText(key: MessageKey, t: TFn, fallback?: string): string {
  const hit = t(key);
  return hit === key ? (fallback ?? "") : hit;
}

export function restLabelFor(
  locale: Locale,
  plan: "rest" | "rtd",
  days: number,
  style: RoastStyleId,
): { restLabel: string; restWarn?: string } {
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  if (plan === "rtd") {
    if (days <= 3) return { restLabel: t("rest.rtdWindow", { days }) };
    return { restLabel: t("rest.rtdPast", { days }), restWarn: t("rest.rtdWarn") };
  }
  const gas = style === "light" ? 10 : style === "medium" ? 6 : 3;
  const good = style === "light" ? 21 : style === "medium" ? 16 : 10;
  const aging = style === "light" ? 35 : style === "medium" ? 28 : 18;
  if (days <= 2) {
    return {
      restLabel: t("rest.degassing", { days }),
      restWarn: days <= 1 ? t("rest.gasWarn") : undefined,
    };
  }
  if (days <= gas) return { restLabel: t("rest.bloomingGood", { days }) };
  if (days <= good) return { restLabel: t("rest.stillGood", { days }) };
  if (days <= aging) return { restLabel: t("rest.aging", { days }) };
  return { restLabel: t("rest.fading", { days }), restWarn: t("rest.fadeWarn") };
}
