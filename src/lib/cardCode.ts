import type { Locale } from "../i18n/translate";
import { BREW_METHODS, techniquesFor, type BrewMethod, type BrewRecipe, type BrewStep, type BrewTechnique, type Grind, type SwitchMode } from "./brew";
import { buildBrewSteps } from "./brewSteps";
import type { RoastStyleId } from "./knowledge";

/**
 * A built-in card as the few numbers its steps are built from:
 * "v60~hedrick~15~16.7~251~~93~150~1~g~m~" — method, recipe, dose, ratio, water, bypass, kettle,
 * time, grind, flags (g gassy, n natural), style, switch mode.
 */
export interface CardSpec {
  method: BrewMethod;
  technique?: string;
  coffeeG: number;
  ratioN: number;
  waterG: number;
  bypassG?: number;
  kettleC: number;
  timeS: number;
  grind: Grind;
  gassy: boolean;
  natural: boolean;
  roastStyle: RoastStyleId;
  switchMode?: SwitchMode;
}

export const CARD_FIELDS = 12;
const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];
const STYLES: Record<string, RoastStyleId> = { l: "light", m: "medium", d: "dark" };

export function specOfCard(card: BrewRecipe): CardSpec {
  return {
    method: card.method,
    technique: card.technique,
    coffeeG: card.coffeeG,
    ratioN: card.ratioN,
    waterG: card.waterG,
    bypassG: card.bypassG || undefined,
    kettleC: card.kettleC,
    timeS: card.timeS,
    grind: card.grind,
    gassy: Boolean(card.gassy),
    natural: Boolean(card.natural),
    roastStyle: card.roastStyle,
    switchMode: card.switchMode,
  };
}

export function specBody(spec: CardSpec): string {
  return [
    spec.method,
    spec.technique ?? "",
    spec.coffeeG,
    spec.ratioN,
    spec.waterG,
    spec.bypassG || "",
    spec.kettleC,
    spec.timeS,
    GRINDS.indexOf(spec.grind),
    `${spec.gassy ? "g" : ""}${spec.natural ? "n" : ""}`,
    spec.roastStyle[0],
    spec.switchMode ?? "",
  ].join("~");
}

export function cardBody(card: BrewRecipe): string {
  return specBody(specOfCard(card));
}

/** The spec in the first twelve "~" fields, or null when any of them is off. */
export function parseCardBody(body: string): CardSpec | null {
  const [method, technique, coffee, ratio, water, bypass, kettle, time, grindIdx, flags = "", style, switchMode] =
    body.split("~");
  if (!BREW_METHODS.some((m) => m.id === method)) return null;
  const nums = [coffee, ratio, water, kettle, time].map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  const [coffeeG, ratioN, waterG, kettleC, timeS] = nums;
  const grind = GRINDS[Number(grindIdx)];
  const roastStyle = STYLES[style];
  if (!grind || !roastStyle || !/^[gn]*$/.test(flags)) return null;
  if (technique && !techniquesFor(method as BrewMethod).some((x) => x.id === technique)) return null;
  const bypassG = bypass ? Number(bypass) : undefined;
  if (bypassG != null && !(bypassG >= 0)) return null;
  return {
    method: method as BrewMethod,
    technique: technique || undefined,
    coffeeG,
    ratioN,
    waterG,
    bypassG,
    kettleC,
    timeS,
    grind,
    gassy: flags.includes("g"),
    natural: flags.includes("n"),
    roastStyle,
    switchMode: (switchMode || undefined) as SwitchMode | undefined,
  };
}

export function specTechnique(spec: CardSpec, locale: Locale): BrewTechnique | undefined {
  return spec.technique ? techniquesFor(spec.method, locale).find((x) => x.id === spec.technique) : undefined;
}

/** The card's steps, exactly as recommendBrew wrote them, in `locale`. */
export function cardSteps(spec: CardSpec, locale: Locale): BrewStep[] {
  const tech = specTechnique(spec, locale);
  return buildBrewSteps({
    locale,
    method: spec.method,
    coffeeG: spec.coffeeG,
    waterG: spec.waterG,
    bypassG: spec.bypassG,
    kettleC: spec.kettleC,
    timeS: spec.timeS,
    grind: spec.grind,
    gassy: spec.gassy,
    natural: spec.natural,
    roastStyle: spec.roastStyle,
    switchMode: spec.switchMode,
    technique: tech?.id,
    startC: tech?.startC,
    finishC: tech?.finishC,
  });
}
