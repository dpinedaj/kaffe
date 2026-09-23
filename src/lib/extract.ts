import type { BrewMethod, Grind } from "./brew";

/** SCA / coffee-industry sucrose Brix → beverage TDS. DiFluid R2 can skip this and send TDS. */
export const BRIX_TO_TDS = 0.85;

const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];

export type ExtractUnit = "brix" | "tds";
export type EyBand = "under" | "ok" | "over";
export type TdsBand = "weak" | "ok" | "strong";
export type ExtractVerdict = EyBand | "out";
export type ExtractScale = "filter" | "espresso" | "moka" | "coldbrew";

export interface ExtractWindow {
  tdsMin: number;
  tdsMax: number;
  eyMin: number;
  eyMax: number;
  tdsLo: number;
  tdsHi: number;
  eyLo: number;
  eyHi: number;
}

export interface ExtractPoint {
  tds: number;
  ey: number;
  yieldG: number;
}

export interface ExtractTip {
  id:
    | "extract.tip.finer"
    | "extract.tip.coarser"
    | "extract.tip.longer"
    | "extract.tip.shorter"
    | "extract.tip.hotter"
    | "extract.tip.cooler"
    | "extract.tip.tighter"
    | "extract.tip.looser"
    | "extract.tip.weighCup"
    | "extract.tip.atBoil"
    | "extract.tip.espressoCut"
    | "extract.tip.espressoLonger"
    | "extract.tip.underKeep"
    | "extract.tip.overKeep"
    | "extract.tip.underShot"
    | "extract.tip.overShot"
    | "extract.tip.tighterCup"
    | "extract.tip.looserCup";
  vars?: Record<string, string | number>;
}

export interface ExtractReading {
  tds: number;
  ey: number;
  yieldG: number;
  assumedYield: boolean;
  eyBand: EyBand;
  tdsBand: TdsBand;
  verdict: ExtractVerdict;
  inRange: boolean;
  window: ExtractWindow;
  scale: ExtractScale;
  tips: ExtractTip[];
}

export interface ExtractRecipe {
  method: BrewMethod;
  coffeeG: number;
  waterG: number;
  grind: Grind;
  timeS: number;
  kettleC: number;
  boilC?: number;
  cappedByBoil?: boolean;
}

export interface ExtractHistoryItem {
  at: string;
  method: BrewMethod;
  tds: number;
  ey: number;
}

const HISTORY_KEY = "kaffe.extract.v1";

export function scaleFor(method: BrewMethod): ExtractScale {
  if (method === "espresso") return "espresso";
  if (method === "moka") return "moka";
  if (method === "coldbrew") return "coldbrew";
  return "filter";
}

/** Classic Lockhart: TDS% = PE% / (water/coffee). Diagonals are constant brew ratio. */
export function tdsFromPe(pe: number, ratioN: number): number {
  return ratioN > 0 ? pe / ratioN : 0;
}

export function ratioIsolines(scale: ExtractScale): number[] {
  if (scale === "espresso") return [1.5, 2, 2.5, 3];
  if (scale === "moka") return [7, 8, 10, 12];
  if (scale === "coldbrew") return [8, 10, 13, 16];
  return [12, 14, 16, 18, 20, 22];
}

/** One grind/time click on the same recipe. About 1.5–2 PE on filter. */
export const NEXT_CUP_PE = 1.6;
/** Tighter / looser water without changing grind. */
export const NEXT_CUP_RATIO = 0.07;

/** Project PE onto a constant-ratio diagonal and keep it inside the plot. */
export function snapEyToRatio(
  ey: number,
  ratioN: number,
  window: ExtractWindow,
): { ey: number; tds: number } {
  const line = clipRatioLine(ratioN, window);
  const pe = line
    ? Math.max(line.pe1, Math.min(line.pe2, ey))
    : Math.max(window.eyLo, Math.min(window.eyHi, ey));
  return { ey: pe, tds: tdsFromPe(pe, ratioN) };
}

/**
 * Where the first next-cup tip would land.
 * Grind / time stay on this ratio; tighter / looser jump to a nearby diagonal.
 */
export function nextCupPoint(
  reading: Pick<ExtractReading, "ey" | "tds" | "eyBand" | "tdsBand" | "window"> &
    Partial<Pick<ExtractReading, "inRange">>,
  ratioN: number,
): { ey: number; tds: number } | undefined {
  if (reading.inRange === false) return undefined;
  const { window } = reading;
  if (reading.eyBand === "under" || reading.eyBand === "over") {
    const pe = reading.ey + (reading.eyBand === "under" ? NEXT_CUP_PE : -NEXT_CUP_PE);
    const point = snapEyToRatio(pe, ratioN, window);
    if (Math.abs(point.ey - reading.ey) < 0.35) return undefined;
    return point;
  }
  if (reading.tdsBand === "weak" || reading.tdsBand === "strong") {
    const nextRatio = ratioN * (1 + (reading.tdsBand === "strong" ? NEXT_CUP_RATIO : -NEXT_CUP_RATIO));
    const point = snapEyToRatio(reading.ey, nextRatio, window);
    if (Math.abs(point.tds - reading.tds) < 0.02) return undefined;
    return point;
  }
  return undefined;
}

export function clipRatioLine(
  ratioN: number,
  window: ExtractWindow,
): { pe1: number; tds1: number; pe2: number; tds2: number } | undefined {
  if (!(ratioN > 0)) return undefined;
  const peAt = (tds: number) => tds * ratioN;
  const tdsAt = (pe: number) => pe / ratioN;
  let pe1 = window.eyLo;
  let pe2 = window.eyHi;
  let tds1 = tdsAt(pe1);
  let tds2 = tdsAt(pe2);
  if (tds1 > window.tdsHi) {
    tds1 = window.tdsHi;
    pe1 = peAt(tds1);
  } else if (tds1 < window.tdsLo) {
    tds1 = window.tdsLo;
    pe1 = peAt(tds1);
  }
  if (tds2 > window.tdsHi) {
    tds2 = window.tdsHi;
    pe2 = peAt(tds2);
  } else if (tds2 < window.tdsLo) {
    tds2 = window.tdsLo;
    pe2 = peAt(tds2);
  }
  pe1 = Math.max(window.eyLo, Math.min(window.eyHi, pe1));
  pe2 = Math.max(window.eyLo, Math.min(window.eyHi, pe2));
  tds1 = tdsAt(pe1);
  tds2 = tdsAt(pe2);
  if (pe2 - pe1 < 0.4) return undefined;
  return { pe1, tds1, pe2, tds2 };
}

export function peTicks(window: ExtractWindow): number[] {
  const out: number[] = [];
  for (let n = Math.ceil(window.eyLo); n <= window.eyHi; n += 2) out.push(n);
  return out;
}

export function tdsTicks(window: ExtractWindow): number[] {
  const span = window.tdsHi - window.tdsLo;
  const step = span > 6 ? 2 : span > 2 ? 0.4 : 0.1;
  const out: number[] = [];
  const start = Math.ceil(window.tdsLo / step) * step;
  for (let n = start; n <= window.tdsHi + 1e-9; n += step) {
    out.push(Number(n.toFixed(2)));
  }
  return out;
}

export function extractWindow(scale: ExtractScale): ExtractWindow {
  if (scale === "espresso") {
    return { tdsMin: 8, tdsMax: 12, eyMin: 18, eyMax: 22, tdsLo: 6, tdsHi: 16, eyLo: 14, eyHi: 26 };
  }
  if (scale === "moka") {
    return { tdsMin: 2.4, tdsMax: 4.2, eyMin: 18, eyMax: 22, tdsLo: 1.6, tdsHi: 5.5, eyLo: 14, eyHi: 26 };
  }
  if (scale === "coldbrew") {
    return { tdsMin: 1.25, tdsMax: 2.1, eyMin: 16, eyMax: 21, tdsLo: 0.8, tdsHi: 2.8, eyLo: 12, eyHi: 24 };
  }
  return { tdsMin: 1.15, tdsMax: 1.35, eyMin: 18, eyMax: 22, tdsLo: 0.8, tdsHi: 1.6, eyLo: 14, eyHi: 26 };
}

/** Advice stops at the Lockhart plot. A 100% TDS cup is not a grind problem. */
export function inAdviceRange(tds: number, ey: number, window: ExtractWindow): boolean {
  return tds >= window.tdsLo && tds <= window.tdsHi && ey >= window.eyLo && ey <= window.eyHi;
}

export function brixToTds(brix: number): number {
  return brix * BRIX_TO_TDS;
}

export function tdsFromInput(unit: ExtractUnit, value: number): number {
  return unit === "brix" ? brixToTds(value) : value;
}

/** Drip beds keep ~2 g water / g coffee. Espresso / moka beverage is the shot. */
export function defaultYieldG(method: BrewMethod, coffeeG: number, waterG: number): number {
  if (method === "espresso" || method === "moka") return waterG;
  const retained = 2 * coffeeG;
  return Math.max(waterG * 0.55, waterG - retained);
}

export function extractionYield(tds: number, coffeeG: number, yieldG: number): number | undefined {
  if (!(tds > 0) || !(coffeeG > 0) || !(yieldG > 0)) return undefined;
  return (tds * yieldG) / coffeeG;
}

export function bandOf(value: number, min: number, max: number): EyBand | TdsBand {
  if (value < min) return value === min ? "ok" : "under";
  if (value > max) return "over";
  return "ok";
}

export function tdsBandOf(tds: number, window: ExtractWindow): TdsBand {
  if (tds < window.tdsMin) return "weak";
  if (tds > window.tdsMax) return "strong";
  return "ok";
}

export function nextGrind(grind: Grind, dir: -1 | 1): Grind | undefined {
  const i = GRINDS.indexOf(grind) + dir;
  return GRINDS[i];
}

export function formatBrewClock(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function formatBrewRatio(ratioN: number): string {
  if (!(ratioN > 0)) return "—";
  const n = Math.round(ratioN * 10) / 10;
  return Math.abs(n - Math.round(n)) < 0.05 ? `1:${Math.round(n)}` : `1:${n.toFixed(1)}`;
}

export function shiftBrew(
  recipe: Pick<ExtractRecipe, "method" | "coffeeG" | "waterG">,
  dir: -1 | 1,
): { water: number; cup: number; ratio: string } {
  const raw = recipe.waterG * (1 + dir * NEXT_CUP_RATIO);
  const water = Math.max(recipe.coffeeG * 1.5, Math.round(raw / 5) * 5);
  const cup = Math.round(defaultYieldG(recipe.method, recipe.coffeeG, water));
  return { water, cup, ratio: formatBrewRatio(water / recipe.coffeeG) };
}

export function readExtract(
  unit: ExtractUnit,
  value: number,
  yieldG: number | undefined,
  recipe: ExtractRecipe,
): ExtractReading | undefined {
  if (!Number.isFinite(value) || value <= 0) return undefined;
  const tds = tdsFromInput(unit, value);
  if (!Number.isFinite(tds) || tds <= 0) return undefined;
  const assumed = yieldG == null || !Number.isFinite(yieldG);
  const cup = assumed ? defaultYieldG(recipe.method, recipe.coffeeG, recipe.waterG) : yieldG;
  const ey = extractionYield(tds, recipe.coffeeG, cup);
  if (ey == null || !Number.isFinite(ey)) return undefined;

  const scale = scaleFor(recipe.method);
  const window = extractWindow(scale);
  const eyBand = bandOf(ey, window.eyMin, window.eyMax) as EyBand;
  const tdsBand = tdsBandOf(tds, window);
  const inRange = inAdviceRange(tds, ey, window);
  return {
    tds,
    ey,
    yieldG: cup,
    assumedYield: assumed,
    eyBand,
    tdsBand,
    verdict: inRange ? eyBand : "out",
    inRange,
    window,
    scale,
    tips: inRange ? tipsFor({ tds, ey, yieldG: cup, eyBand, tdsBand, scale }, recipe, assumed) : [],
  };
}

function keepVars(
  recipe: ExtractRecipe,
  yieldG: number,
  grind: Grind,
  time: string,
): Record<string, string | number> {
  return {
    grind,
    time,
    cup: Math.round(yieldG),
    ratio: formatBrewRatio(recipe.waterG / recipe.coffeeG),
    water: Math.round(recipe.waterG),
  };
}

function tipsFor(
  reading: Pick<ExtractReading, "eyBand" | "tdsBand" | "scale" | "yieldG">,
  recipe: ExtractRecipe,
  assumedYield: boolean,
): ExtractTip[] {
  const tips: ExtractTip[] = [];
  const espresso = reading.scale === "espresso";
  const finer = nextGrind(recipe.grind, 1) ?? recipe.grind;
  const coarser = nextGrind(recipe.grind, -1) ?? recipe.grind;
  const timeStep = espresso ? 4 : 20;
  const nextLonger = formatBrewClock(recipe.timeS + timeStep);
  const nextShorter = formatBrewClock(Math.max(20, recipe.timeS - timeStep));
  const canHeat = !recipe.cappedByBoil && (recipe.boilC == null || recipe.kettleC < recipe.boilC - 1.2);

  if (reading.eyBand === "under") {
    tips.push({
      id: espresso ? "extract.tip.underShot" : "extract.tip.underKeep",
      vars: keepVars(recipe, reading.yieldG, finer, nextLonger),
    });
    if (reading.tdsBand === "weak") tips.push({ id: "extract.tip.tighterCup", vars: shiftBrew(recipe, -1) });
    else if (reading.tdsBand === "strong") tips.push({ id: "extract.tip.looserCup", vars: shiftBrew(recipe, 1) });
    if (canHeat) tips.push({ id: "extract.tip.hotter", vars: { c: (recipe.kettleC + 2).toFixed(0) } });
    else if (recipe.cappedByBoil) tips.push({ id: "extract.tip.atBoil" });
  } else if (reading.eyBand === "over") {
    tips.push({
      id: espresso ? "extract.tip.overShot" : "extract.tip.overKeep",
      vars: keepVars(recipe, reading.yieldG, coarser, nextShorter),
    });
    if (reading.tdsBand === "weak") tips.push({ id: "extract.tip.tighterCup", vars: shiftBrew(recipe, -1) });
    else if (reading.tdsBand === "strong") tips.push({ id: "extract.tip.looserCup", vars: shiftBrew(recipe, 1) });
    if (recipe.kettleC > 88) tips.push({ id: "extract.tip.cooler", vars: { c: (recipe.kettleC - 2).toFixed(0) } });
  } else if (reading.tdsBand === "weak") {
    tips.push({ id: "extract.tip.tighterCup", vars: shiftBrew(recipe, -1) });
  } else if (reading.tdsBand === "strong") {
    tips.push({ id: "extract.tip.looserCup", vars: shiftBrew(recipe, 1) });
  }

  if (assumedYield && !espresso) tips.push({ id: "extract.tip.weighCup" });
  return tips.slice(0, 3);
}

export function loadExtractHistory(): ExtractHistoryItem[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = JSON.parse(localStorage.getItem(HISTORY_KEY) ?? "[]") as ExtractHistoryItem[];
    return Array.isArray(raw) ? raw.filter((x) => x && Number.isFinite(x.tds) && Number.isFinite(x.ey)) : [];
  } catch {
    return [];
  }
}

export function rememberExtract(item: ExtractHistoryItem): ExtractHistoryItem[] {
  const next = [item, ...loadExtractHistory().filter((x) => x.at !== item.at)].slice(0, 24);
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}
