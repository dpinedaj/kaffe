import { inferredDensityClass, type DrinkPlan, type RoastIntent } from "./generate";
import type { MessageKey } from "../i18n/en";
import { translate, type Locale } from "../i18n/translate";
import { techField } from "../i18n/recipeCopy";
import { buildBrewSteps } from "./brewSteps";
import {
  FLAVORS,
  ORIGINS,
  STYLES,
  VARIETIES,
  originById,
  varietyById,
  type BeanSize,
  type BrewId,
  type DensityClass,
  type FlavorId,
  type ProcessId,
  type RoastStyleId,
} from "./knowledge";
import type { KproProfile } from "./kpro";

export type BrewMethod =
  | "v60"
  | "kalita"
  | "origami"
  | "chemex"
  | "switch"
  | "clever"
  | "aeropress"
  | "frenchpress"
  | "orea"
  | "coldbrew"
  | "moka"
  | "espresso"
  | "cupping";

export type Grind = "coarse" | "medium-coarse" | "medium" | "medium-fine" | "fine";
/** Hario Switch valve pattern. Closed = immersion; open = percolation. */
export type SwitchMode = "steep" | "fukahori" | "hybrid" | "hold" | "double" | "bull";
export type BrewAttach =
  | { kind: "generate" }
  | { kind: "library"; id: string }
  | { kind: "kpro"; snapshot: BrewRoastSnapshot }
  | { kind: "none" };

export interface BrewRoastSnapshot {
  label: string;
  brew: BrewId;
  roastStyle: RoastStyleId;
  drinkPlan: DrinkPlan;
  process: ProcessId;
  level?: number;
  farmAltitudeM?: number;
  flavors: FlavorId[];
  densityClass?: DensityClass;
  varietyName?: string;
  beanSize?: BeanSize;
}

export interface BrewQuery {
  method: BrewMethod;
  roastStyle: RoastStyleId;
  drinkPlan: DrinkPlan;
  daysSinceRoast: number;
  kitchenAltitudeM?: number;
  process?: ProcessId;
  flavors?: FlavorId[];
  densityClass?: DensityClass;
  varietyName?: string;
  beanSize?: BeanSize;
  /** Override the method-card dose (g). Water and steps follow. */
  coffeeG?: number;
  /** Override brew water per gram (cup ratio for AeroPress Light). */
  ratio?: number;
  /** Hario Switch valve pattern. When omitted, `suggestedSwitchMode` picks one. */
  switchMode?: SwitchMode;
  /** Championship / shop script. When omitted, `suggestedTechniqueId` picks one. */
  technique?: string;
  /** UI language for helper / why copy. Card numbers stay the same. */
  locale?: Locale;
}

export interface BrewStep {
  at: string;
  title: string;
  detail: string;
}

export interface BrewRecipe {
  method: BrewMethod;
  roastStyle: RoastStyleId;
  ratio: string;
  ratioN: number;
  coffeeG: number;
  waterG: number;
  bypassG?: number;
  cupG: number;
  wantedC: number;
  kettleC: number;
  boilC?: number;
  cappedByBoil: boolean;
  kettleNote: string;
  timeLabel: string;
  timeS: number;
  grind: Grind;
  grindNote: string;
  /** Method / technique card dose. Clicks nudge when the cup dose leaves this. */
  cardDoseG: number;
  restLabel: string;
  restWarn?: string;
  switchMode?: SwitchMode;
  suggestedSwitchMode?: SwitchMode;
  technique?: string;
  suggestedTechnique?: string;
  /** SproFiler / Gaggiuino profile to load, when the script is one. */
  gaggiuino?: string;
  /** Short competition or document credit for the selected recipe. */
  origin?: string;
  steps: BrewStep[];
  why: string[];
  sources: string[];
  warnings: string[];
}

export interface BrewMethodInfo {
  id: BrewMethod;
  name: string;
  family: "pour" | "immersion" | "hybrid" | "pressure" | "cupping" | "cold";
  blurb: string;
}

const KITCHEN_KEY = "kaffe.brew.kitchenAltitudeM";
const BAG_KEY = "kaffe.brew.bag.v1";

export interface BrewBag {
  roastStyle: RoastStyleId;
  process: ProcessId;
  farmAltitudeM?: number;
  flavors: FlavorId[];
  originId?: string;
  varietyId?: string;
}

export function defaultBrewBag(): BrewBag {
  return { roastStyle: "medium", process: "washed", flavors: [] };
}

const DENSITY_RANK: Record<DensityClass, number> = { soft: 0, medium: 1, hard: 2 };
const DENSITY_BY_RANK: DensityClass[] = ["soft", "medium", "hard"];

export function densityFromFarmM(metres?: number): DensityClass | undefined {
  if (metres == null || !Number.isFinite(metres)) return undefined;
  if (metres >= 1800) return "hard";
  if (metres < 1300) return "soft";
  return "medium";
}

function bumpDensity(base: DensityClass, varietyDensity?: DensityClass): DensityClass {
  if (!varietyDensity || varietyDensity === "medium") return base;
  const rank = DENSITY_RANK[base] + (varietyDensity === "hard" ? 1 : -1);
  return DENSITY_BY_RANK[Math.max(0, Math.min(2, rank))];
}

/** Lot density from origin hardness, farm metres, then a one-step variety bump. */
export function densityFromBag(
  originId?: string,
  varietyId?: string,
  farmM?: number,
): DensityClass | undefined {
  const origin = originId ? ORIGINS.find((o) => o.id === originId) : undefined;
  const variety = varietyId ? varietyById(varietyId) : undefined;
  const named = variety && variety.id !== "unknown" ? variety : undefined;
  const alt = farmM ?? origin?.typicalAltitude;

  let base: DensityClass | undefined;
  if (origin && alt != null) base = inferredDensityClass(origin, alt);
  else base = densityFromFarmM(farmM);

  if (base == null) {
    if (named?.density && named.density !== "medium") return named.density;
    return origin?.density;
  }
  return bumpDensity(base, named?.density);
}

export function leanFlavorsForVariety(varietyId?: string): FlavorId[] {
  if (!varietyId) return [];
  const variety = varietyById(varietyId);
  if (variety.id === "unknown") return [];
  return variety.flavorLean.slice(0, 2);
}

/** Density, seed size, and flavor lean This bag feeds into `recommendBrew`. */
export function bagBrewFields(bag: BrewBag): {
  process: ProcessId;
  flavors: FlavorId[];
  densityClass?: DensityClass;
  varietyName?: string;
  beanSize?: BeanSize;
} {
  const origin = bag.originId ? ORIGINS.find((o) => o.id === bag.originId) : undefined;
  const variety = bag.varietyId ? varietyById(bag.varietyId) : undefined;
  const named = variety && variety.id !== "unknown" ? variety : undefined;
  return {
    process: bag.process,
    flavors: bag.flavors.length ? bag.flavors : leanFlavorsForVariety(bag.varietyId),
    densityClass: densityFromBag(bag.originId, bag.varietyId, bag.farmAltitudeM),
    varietyName:
      [origin?.name, named?.name].filter(Boolean).join(" · ") || undefined,
    beanSize: named?.beanSize,
  };
}

export function loadBrewBag(): BrewBag {
  const fallback = defaultBrewBag();
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(BAG_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<BrewBag>;
    const styles: RoastStyleId[] = ["light", "medium", "dark"];
    const processes: ProcessId[] = ["washed", "natural", "honey", "anaerobic", "other"];
    const flavorIds = new Set(FLAVORS.map((f) => f.id));
    const originIds = new Set(ORIGINS.map((o) => o.id));
    const varietyIds = new Set(VARIETIES.map((v) => v.id));
    return {
      roastStyle: styles.includes(parsed.roastStyle as RoastStyleId)
        ? (parsed.roastStyle as RoastStyleId)
        : fallback.roastStyle,
      process: processes.includes(parsed.process as ProcessId)
        ? (parsed.process as ProcessId)
        : fallback.process,
      farmAltitudeM:
        parsed.farmAltitudeM != null && Number.isFinite(parsed.farmAltitudeM)
          ? clampAltitude(parsed.farmAltitudeM)
          : undefined,
      flavors: Array.isArray(parsed.flavors)
        ? parsed.flavors.filter((id): id is FlavorId => flavorIds.has(id as FlavorId)).slice(0, 2)
        : [],
      originId:
        typeof parsed.originId === "string" && originIds.has(parsed.originId)
          ? parsed.originId
          : undefined,
      varietyId:
        typeof parsed.varietyId === "string" && varietyIds.has(parsed.varietyId)
          ? parsed.varietyId
          : undefined,
    };
  } catch {
    return fallback;
  }
}

export function saveBrewBag(bag: BrewBag): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(BAG_KEY, JSON.stringify(bag));
  } catch {
    /* quota / private mode */
  }
}
const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];
const ACID: FlavorId[] = ["fruity", "bright", "juicy", "floral", "winey"];
const HEAVY: FlavorId[] = ["body", "deepSweet"];
const CLOGS: ProcessId[] = ["natural", "honey", "anaerobic"];
/** Championship scripts that skip a gas dump. Suggested pick never lands here while gassy. */
const GASSY_RISKY = new Set(["bull", "du", "extractamundo", "short"]);

/** Mucilage / ferment lots shed fines. Same paper-bed stall risk as a natural. */
export function processClogsPaper(process?: ProcessId): boolean {
  return process != null && CLOGS.includes(process);
}

/** Barometric engineering fit, inhabited elevations: −1 °C per ~285 m. */
export function boilingPointC(altitudeM: number): number {
  return 100 - Math.max(0, altitudeM) / 285;
}

export function defaultMethod(brew: BrewId): BrewMethod {
  if (brew === "espresso") return "espresso";
  if (brew === "cupping") return "cupping";
  return "v60";
}

export function defaultDays(plan: DrinkPlan): number {
  return plan === "rtd" ? 2 : 4;
}

export function snapshotFromIntent(intent: RoastIntent, label: string): BrewRoastSnapshot {
  const origin = originById(intent.originId);
  const variety = varietyById(intent.varietyId);
  const style = STYLES.find((s) => s.id === intent.roastStyle);
  return {
    label,
    brew: intent.brew,
    roastStyle: intent.roastStyle,
    drinkPlan: intent.drinkPlan ?? "rest",
    process: intent.process,
    level: intent.autoLevel ? style?.level : intent.level,
    farmAltitudeM: intent.altitudeM,
    flavors: intent.flavors.filter((f) => f.weight > 0).map((f) => f.id),
    densityClass: inferredDensityClass(origin, intent.altitudeM),
    varietyName:
      [origin.name, variety.id !== "unknown" ? variety.name : undefined].filter(Boolean).join(" · ") ||
      undefined,
    beanSize: variety.beanSize,
  };
}

/**
 * Recover a brew snapshot from a .kpro. Kaffe files carry origin, process,
 * style, Rest/RTD and flavors in `profile_description`. Other designers still
 * yield style from `recommended_level` and brew from the short name.
 */
export function snapshotFromKpro(profile: KproProfile): BrewRoastSnapshot {
  const desc = profile.description.replace(/\\v/g, "\n");
  const header = desc.split("\n").map((l) => l.trim()).find(Boolean) ?? "";
  const blob = `${profile.name} ${profile.fileName} ${desc}`;
  const levelN = Number(profile.raw.recommended_level);
  const level = Number.isFinite(levelN) ? levelN : undefined;

  let roastStyle: RoastStyleId = "light";
  if (/\bdark\b/i.test(header)) roastStyle = "dark";
  else if (/\bmedium\b/i.test(header)) roastStyle = "medium";
  else if (/\blight\b/i.test(header)) roastStyle = "light";
  else if (level != null) roastStyle = level < 2.4 ? "light" : level < 4 ? "medium" : "dark";

  let brew: BrewId = "filter";
  if (/\bespresso\b/i.test(header) || /^E-/i.test(profile.name)) brew = "espresso";
  else if (/\bcupping\b/i.test(header) || /^C-/i.test(profile.name)) brew = "cupping";
  else if (/\bomni\b/i.test(header) || /^O-/i.test(profile.name)) brew = "omni";

  let process: ProcessId = "other";
  for (const id of ["washed", "natural", "honey", "anaerobic"] as const) {
    if (new RegExp(`\\b${id}\\b`, "i").test(blob)) {
      process = id;
      break;
    }
  }

  const alt = blob.match(/(\d{3,4})\s*m\b/i);
  const flavorLine = desc.split("\n").find((l) => /^Flavor:/i.test(l)) ?? "";
  const parts = header.split("·").map((s) => s.trim());
  const varietyName = parts.length >= 2 && !/^(washed|natural|honey|anaerobic|other)/i.test(parts[1])
    ? parts[1]
    : undefined;

  return {
    label: (profile.fileName.replace(/\.kpro$/i, "") || profile.name).replace(/_/g, " "),
    brew,
    roastStyle,
    drinkPlan: /Cup:\s*RTD|\bRTD\b/.test(blob) ? "rtd" : "rest",
    process,
    level,
    farmAltitudeM: alt ? Number(alt[1]) : undefined,
    flavors: parseFlavorNames(`${flavorLine} ${header}`),
    varietyName,
  };
}

export function loadKitchenAltitudeM(): number | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(KITCHEN_KEY);
    if (raw == null || raw === "") return undefined;
    const n = Number(raw);
    return Number.isFinite(n) ? clampAltitude(n) : undefined;
  } catch {
    return undefined;
  }
}

export function saveKitchenAltitudeM(metres: number | undefined): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (metres == null || !Number.isFinite(metres)) localStorage.removeItem(KITCHEN_KEY);
    else localStorage.setItem(KITCHEN_KEY, String(clampAltitude(metres)));
  } catch {
    /* ignore quota / private mode */
  }
}

export function clampAltitude(metres: number): number {
  return Math.max(0, Math.min(4500, Math.round(metres)));
}

export function formatBrewTime(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  return `${m}:${(s % 60).toString().padStart(2, "0")}`;
}

interface MethodStyleBase {
  ratio: number;
  wantedC: number;
  timeS: number;
  grind: Grind;
  doseG: number;
  bypassRatio?: number;
}

/**
 * Starting cards. Citations and the full argument: docs/BREW.md.
 * Light pour-over leans WBrC 2023–26 (1:14–1:16, 91–96 °C) plus Hoffmann.
 * Immersion leans Liang 2021 and Hoffmann. AeroPress leans WAC 2024–25.
 * Espresso leans WBC. Cupping is SCA protocol. Dark rows are craft.
 */
const BASE: Record<BrewMethod, Record<RoastStyleId, MethodStyleBase>> = {
  v60: {
    light: { ratio: 16, wantedC: 96, timeS: 165, grind: "medium", doseG: 15 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 155, grind: "medium", doseG: 15 },
    dark: { ratio: 17, wantedC: 90, timeS: 140, grind: "medium", doseG: 15 },
  },
  kalita: {
    light: { ratio: 16, wantedC: 96, timeS: 180, grind: "medium", doseG: 15 },
    medium: { ratio: 16.5, wantedC: 93, timeS: 170, grind: "medium", doseG: 15 },
    dark: { ratio: 17, wantedC: 90, timeS: 155, grind: "medium-coarse", doseG: 15 },
  },
  origami: {
    light: { ratio: 16, wantedC: 91, timeS: 160, grind: "medium", doseG: 15.5 },
    medium: { ratio: 16, wantedC: 93, timeS: 155, grind: "medium", doseG: 15 },
    dark: { ratio: 16.5, wantedC: 90, timeS: 145, grind: "medium", doseG: 15 },
  },
  chemex: {
    light: { ratio: 16.7, wantedC: 96, timeS: 250, grind: "medium", doseG: 30 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 250, grind: "medium", doseG: 30 },
    dark: { ratio: 17, wantedC: 90, timeS: 230, grind: "medium-coarse", doseG: 30 },
  },
  switch: {
    light: { ratio: 16.7, wantedC: 96, timeS: 165, grind: "medium", doseG: 15 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 165, grind: "medium-coarse", doseG: 15 },
    dark: { ratio: 16.7, wantedC: 90, timeS: 150, grind: "medium-coarse", doseG: 15 },
  },
  clever: {
    light: { ratio: 16.7, wantedC: 96, timeS: 180, grind: "medium", doseG: 15 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 180, grind: "medium-coarse", doseG: 15 },
    dark: { ratio: 17, wantedC: 90, timeS: 165, grind: "medium-coarse", doseG: 15 },
  },
  aeropress: {
    light: { ratio: 6, wantedC: 96, timeS: 125, grind: "medium", doseG: 15, bypassRatio: 5 },
    medium: { ratio: 14.7, wantedC: 93, timeS: 90, grind: "medium", doseG: 15 },
    dark: { ratio: 15.3, wantedC: 85, timeS: 75, grind: "medium-coarse", doseG: 15 },
  },
  frenchpress: {
    light: { ratio: 16.7, wantedC: 96, timeS: 540, grind: "medium", doseG: 30 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 540, grind: "medium-coarse", doseG: 30 },
    dark: { ratio: 16.7, wantedC: 90, timeS: 240, grind: "medium-coarse", doseG: 30 },
  },
  orea: {
    light: { ratio: 15.9, wantedC: 93, timeS: 140, grind: "medium", doseG: 17 },
    medium: { ratio: 16, wantedC: 93, timeS: 165, grind: "medium", doseG: 16 },
    dark: { ratio: 16.5, wantedC: 90, timeS: 155, grind: "medium", doseG: 16 },
  },
  coldbrew: {
    light: { ratio: 13.3, wantedC: 8, timeS: 16 * 3600, grind: "medium", doseG: 60 },
    medium: { ratio: 13.3, wantedC: 8, timeS: 14 * 3600, grind: "medium-coarse", doseG: 60 },
    dark: { ratio: 13.3, wantedC: 8, timeS: 12 * 3600, grind: "medium-coarse", doseG: 60 },
  },
  moka: {
    light: { ratio: 10, wantedC: 96, timeS: 75, grind: "medium-fine", doseG: 18 },
    medium: { ratio: 9, wantedC: 93, timeS: 70, grind: "medium-fine", doseG: 18 },
    dark: { ratio: 8, wantedC: 90, timeS: 60, grind: "fine", doseG: 18 },
  },
  espresso: {
    light: { ratio: 2.3, wantedC: 93, timeS: 28, grind: "fine", doseG: 18 },
    medium: { ratio: 2, wantedC: 92, timeS: 27, grind: "fine", doseG: 18 },
    dark: { ratio: 2, wantedC: 90, timeS: 25, grind: "fine", doseG: 18 },
  },
  cupping: {
    light: { ratio: 18.2, wantedC: 93, timeS: 240, grind: "medium-coarse", doseG: 8.25 },
    medium: { ratio: 18.2, wantedC: 93, timeS: 240, grind: "medium-coarse", doseG: 8.25 },
    dark: { ratio: 18.2, wantedC: 93, timeS: 240, grind: "medium-coarse", doseG: 8.25 },
  },
};

export const BREW_METHODS: BrewMethodInfo[] = [
  { id: "v60", name: "V60", family: "pour", blurb: "Hoffmann, 4:6, Peng, Rao spin, Hedrick double bloom, Japanese iced. Suggested from roast and flavor." },
  { id: "kalita", name: "Kalita Wave", family: "pour", blurb: "Flat-bottom pulse pour. More forgiving bed than a V60; common in cafés and older WBrC routines." },
  { id: "origami", name: "Origami", family: "pour", blurb: "Faceted cone. Medina WBrC 2023: five equal 50 g pulses at 91 °C, 1:16." },
  { id: "chemex", name: "Chemex", family: "pour", blurb: "Bonded thick paper. Hoffmann V60 adaptation at 30 g : 500 g, ~4:10. Cleaner, slower than a V60." },
  { id: "switch", name: "Hario Switch", family: "hybrid", blurb: "Valve closed = immersion, open = V60. Championship and shop patterns; we suggest one from roast and flavor." },
  { id: "clever", name: "Clever", family: "hybrid", blurb: "Immersion in the cone, drain onto the cup. Same idea as the Switch, no valve to fiddle." },
  { id: "aeropress", name: "AeroPress", family: "hybrid", blurb: "WAC scripts: hot inverted (fruit), 84 °C + 50 °C bypass (sweet), 80 °C inverted (balance). Suggested from roast and flavor." },
  { id: "frenchpress", name: "French press", family: "immersion", blurb: "Hoffmann Ultimate: 30 g : 500 g, break crust at 4:00, settle, plunge only to the surface." },
  { id: "orea", name: "OREA", family: "pour", blurb: "Flat, fast drain. Wölfl WBrC 2024: 17 g / 270 g, 93 °C, four pours, ~2:20." },
  { id: "coldbrew", name: "Cold brew", family: "cold", blurb: "Hoffmann-style fridge steep: ~1:13, 12–16 h, medium grind. No kettle — altitude does not cap this." },
  { id: "moka", name: "Moka", family: "pressure", blurb: "Fill boiler with hot water to the valve, basket level, off at first blonde. Not espresso." },
  { id: "espresso", name: "Espresso", family: "pressure", blurb: "Gaggiuino / SproFiler scripts — blooming, turbo, adaptive, lever — suggested from roast and flavor. Not one 1:2 shot." },
  { id: "cupping", name: "Cupping", family: "cupping", blurb: "SCA protocol 8.25 g / 150 g at 93 °C, 4 min, break and skim. The academic reference cup." },
];

/** Deeper bed resists the drain. Switch / Clever are hybrids, but they empty through paper. */
export function bedResistsDose(method: BrewMethod): boolean {
  const family = BREW_METHODS.find((m) => m.id === method)?.family;
  return (
    family === "pour" ||
    method === "espresso" ||
    method === "moka" ||
    method === "switch" ||
    method === "clever"
  );
}

const METHOD_NAME = Object.fromEntries(BREW_METHODS.map((m) => [m.id, m.name])) as Record<BrewMethod, string>;

export interface BrewTechnique {
  id: string;
  name: string;
  mechanic: string;
  flavor: string;
  blurb: string;
  timeS?: number;
  wantedC?: number;
  startC?: number;
  finishC?: number;
  doseG?: number;
  brewRatio?: number;
  bypassRatio?: number;
  grind?: Grind;
  lockTemp?: boolean;
  /** Exact SproFiler / Gaggiuino community profile name, when this script is one. */
  gaggiuino?: string;
  /** Short competition or document credit. */
  origin?: string;
}

const TECHNIQUES: Partial<Record<BrewMethod, BrewTechnique[]>> = {
  switch: [
    {
      id: "steep",
      name: "Steep + release",
      mechanic: "Closed the whole steep, open to drain",
      flavor: "Body / chocolate",
      blurb: "Hoffmann daily driver. Forgiving, more body. Best for Dark, heavy/sweet roasts, and naturals that clog.",
      timeS: 165,
    },
    {
      id: "fukahori",
      name: "Closed bloom → open pour",
      mechanic: "Closed bloom, then open for the rest",
      flavor: "Fruit / clarity",
      blurb: "Emi Fukahori / MAME shops. Closed bloom then open pour. Her WBrC 2018 win was the GINA 80/95/80 (on Clever here).",
      timeS: 140,
    },
    {
      id: "hybrid",
      name: "Super Hybrid",
      mechanic: "Closed bloom → open mid pours → closed last pour → open drain",
      flavor: "Sweet / rounded",
      blurb: "Tetsu Kasuya 2025 Super Hybrid. Sweetness and body without a harsh finish. Default for Light without a loud acid goal.",
      timeS: 210,
    },
    {
      id: "hold",
      name: "Closed first, open last",
      mechanic: "Closed bloom + first pour, open last pour",
      flavor: "Balanced / Medium",
      blurb: "Shop hybrid: more body than Fukahori, more clarity than a full steep. Suggested for Medium washed cups.",
      timeS: 160,
    },
    {
      id: "double",
      name: "Double immersion",
      mechanic: "Closed pulse, drain, closed pulse, drain",
      flavor: "Clean / controlled",
      blurb: "Ryan Wibawa (WBrC 2024, 3rd on a Switch). Two short immersions. Cleaner than one long steep.",
      timeS: 130,
    },
    {
      id: "bull",
      name: "Open first, then steep",
      mechanic: "Valve open for the first pour, close to steep, open to drain",
      flavor: "Acid then sweet",
      blurb: "Justin Bull, US Brewers Cup 2025 (then WBrC hybrid 40% percolation / 60% immersion). Open first for acidity, closed steep for sweetness and body. The inverse of closed-first.",
      timeS: 145,
    },
  ],
  aeropress: [
    {
      id: "stanica",
      name: "Hot inverted + bypass",
      mechanic: "Inverted concentrate at ~96 °C, dilute",
      flavor: "Fruit / acid",
      blurb: "George Stanica, WAC 2024. Hot inverted 18 g / 100 g at 96 °C, press ~76–79 g, dilute. Bright Light filter in an AeroPress.",
      timeS: 125,
      wantedC: 96,
      lockTemp: true,
    },
    {
      id: "pop",
      name: "Tempered upright",
      mechanic: "Upright 84 °C brew, 50 °C bypass in the carafe",
      flavor: "Sweet / defined",
      blurb: "Némo Pop, WAC 2025. The temperate-water recipe: 18 g, 100 g at 84 °C, 70 g bypass at 50 °C. Sweetness and definition, less bitterness.",
      timeS: 70,
      wantedC: 84,
      finishC: 50,
      doseG: 18,
      brewRatio: 5.6,
      bypassRatio: 3.9,
      grind: "medium-coarse",
      lockTemp: true,
    },
    {
      id: "merikanto",
      name: "Cool inverted",
      mechanic: "Inverted, 80 °C, gentle stir, no bypass",
      flavor: "Sweet-sour balance",
      blurb: "Tuomas Merikanto, WAC 2021. 18 g / 200 g at 80 °C, coarse, almost no agitation — temperate water to strip astringency off a Light roast.",
      timeS: 120,
      wantedC: 80,
      doseG: 18,
      brewRatio: 11.1,
      grind: "medium-coarse",
      lockTemp: true,
    },
    {
      id: "wendelien",
      name: "Fast concentrate",
      mechanic: "Inverted 30 g / 100 g, 40 s press, dilute",
      flavor: "Acid + sweet",
      blurb: "Wendelien van Bunnik, WAC 2019. Short, violent concentrate, then bypass and cool the cup to ~60 °C. Acidity and sweetness together.",
      timeS: 60,
      wantedC: 92,
      doseG: 30,
      brewRatio: 3.3,
      bypassRatio: 4,
      grind: "medium-coarse",
      lockTemp: true,
    },
    {
      id: "tay",
      name: "Mid-brew charge",
      mechanic: "Add 2 g more grounds at 0:45, then room-temp + hot bypass",
      flavor: "Aroma / Kenya-like",
      blurb: "Tay Wipvasutt, WAC 2023. 16 g in, 2 g more mid-brew, press ~75 g, then room-temp water then hot. Aroma without a second temperate kettle.",
      timeS: 125,
      wantedC: 89,
      doseG: 18,
      brewRatio: 5.6,
      bypassRatio: 3.1,
      grind: "medium-coarse",
      lockTemp: true,
    },
  ],
  v60: [
    {
      id: "hoffmann",
      name: "Hoffmann Ultimate",
      mechanic: "Bloom, 60% pour, stir N–S / E–W",
      flavor: "Balanced / daily",
      blurb: "Community skeleton. Body and evenness. The card default when no louder flavor goal is set.",
      timeS: 165,
    },
    {
      id: "kasuya-acid",
      name: "4:6 · acidity",
      mechanic: "Larger first pour of the first 40%",
      flavor: "Bright / juicy",
      blurb: "Tetsu Kasuya, WBrC 2016. First 40% sets acid vs sweet: more water in pour 1 = more acidity. Then three equal pours for strength.",
      timeS: 210,
      wantedC: 92,
      lockTemp: true,
    },
    {
      id: "kasuya-sweet",
      name: "4:6 · sweetness",
      mechanic: "Smaller first pour of the first 40%",
      flavor: "Honey / sweet",
      blurb: "Same 4:6 method. Less water in pour 1, more in pour 2 — Kasuya’s own WBrC 2016 cup was this sweet side.",
      timeS: 210,
      wantedC: 92,
      lockTemp: true,
    },
    {
      id: "peng",
      name: "Split-temp finish",
      mechanic: "96 °C bloom and mid pour, 80 °C last pour",
      flavor: "Floral / clean finish",
      blurb: "George Peng, WBrC 2025 (Solo, adapted here to a V60). Hot front for structure, cool last pour to keep florals and cut late bitterness.",
      timeS: 105,
      wantedC: 96,
      finishC: 80,
      brewRatio: 14,
    },
    {
      id: "chad",
      name: "One-pour center",
      mechanic: "Bloom, then one continuous centre pour. No spirals.",
      flavor: "Clear / tea-like",
      blurb: "Chad Wang, WBrC 2017. 15 g / 250 g at 92 °C, ~2:00. He skipped pre-warming the cone and poured only in the centre.",
      timeS: 120,
      wantedC: 92,
    },
    {
      id: "rao",
      name: "Rao spin",
      mechanic: "Aggressive bloom spin, two pours, gentle spins",
      flavor: "Even / high extraction",
      blurb: "Scott Rao. Plastic V60, 20 g / 330 g at ~97 °C, 4:00–4:30. The spin levels the bed so you can push extraction without bitterness.",
      timeS: 255,
      wantedC: 97,
      doseG: 20,
      brewRatio: 16.5,
      lockTemp: true,
    },
    {
      id: "hedrick",
      name: "Double bloom + one pour",
      mechanic: "45 g, 90 g, then a fast centre pour. No swirl on the blooms.",
      flavor: "Clear / gassy lots",
      blurb: "Lance Hedrick. Two blooms dump CO₂ so the main pour does not channel. Suggested while a Light Rest lot is still gassy.",
      timeS: 150,
    },
    {
      id: "iced",
      name: "Japanese iced",
      mechanic: "Hot brew onto ice in the server · 60% hot / 40% ice",
      flavor: "Bright / flash-chill",
      blurb: "Hoffmann iced filter. Not cold brew — aromatics lock in as the coffee hits ice. Grind a click finer. Select this when you want a cold cup.",
      timeS: 165,
      wantedC: 96,
      brewRatio: 10,
      bypassRatio: 6.7,
      grind: "medium-fine",
    },
  ],
  kalita: [
    {
      id: "wave",
      name: "Café pulses",
      mechanic: "Centre pulses, keep a flat bed",
      flavor: "Even / daily",
      blurb: "Café / older WBrC flat-bottom skeleton. Forgiving. Suggested for Medium / Dark.",
      timeS: 180,
    },
    {
      id: "mccarthy",
      name: "Column / low agitation",
      mechanic: "Bloom, then keep a water column — no aggressive spirals",
      flavor: "Sweet / low bitter",
      blurb: "James McCarthy, WBrC 2013. Kalita Wave, 24 g / 380 g, just off boil, ~3:30. Restricted flow so the column absorbs agitation and pulls sweetness, not bitterness.",
      timeS: 210,
      doseG: 24,
      brewRatio: 15.8,
    },
  ],
  origami: [
    {
      id: "medina",
      name: "Five equal pulses",
      mechanic: "Five 50 g-style pulses, 30 s apart",
      flavor: "Even / Light",
      blurb: "Carlos Medina, WBrC 2023. 15.5–16 g / 250 g at 91 °C. The current Origami card.",
      timeS: 160,
      wantedC: 91,
    },
    {
      id: "du",
      name: "Three pours, no bloom",
      mechanic: "60 → 140 → 240, no separate bloom, ~1:46",
      flavor: "Vivid acid / floral",
      blurb: "Jia-Ning Du, WBrC 2019. 16 g / 240 g at 94 °C. Fast, high-energy extraction — the first Origami world win.",
      timeS: 106,
      wantedC: 94,
      doseG: 16,
      brewRatio: 15,
    },
  ],
  orea: [
    {
      id: "wolfl",
      name: "Wölfl pulses",
      mechanic: "Four pours, fast flat bed, ~2:20",
      flavor: "Clean / Light",
      blurb: "Martin Wölfl, WBrC 2024. 17 g / 270 g at 93 °C. The current OREA card.",
      timeS: 140,
      wantedC: 93,
    },
    {
      id: "hsu",
      name: "Cool first, then hot",
      mechanic: "First pour 70 °C, then 95 °C pulses",
      flavor: "Wild fruit / tame ferment",
      blurb: "Shih Yuan Hsu, WBrC 2022. 14 g / 200 g. Cool opening tames fermented fruit; hotter pulses build sweetness. The inverse of Peng.",
      timeS: 120,
      wantedC: 95,
      startC: 70,
      doseG: 14,
      brewRatio: 14.3,
      lockTemp: true,
    },
  ],
  frenchpress: [
    {
      id: "hoffmann",
      name: "Hoffmann settle",
      mechanic: "Break at 4:00, settle to ~9:00, plunge to the surface",
      flavor: "Clean / Light",
      blurb: "Ultimate French Press. The long settle drops silt. Suggested for Light.",
      timeS: 540,
    },
    {
      id: "classic",
      name: "Classic 4:00",
      mechanic: "Break, plunge, pour — no long settle",
      flavor: "Body / Dark",
      blurb: "Four-minute press. More body, more silt. Suggested for Dark or heavy/sweet.",
      timeS: 240,
    },
  ],
  coldbrew: [
    {
      id: "rtd",
      name: "Fridge ready",
      mechanic: "~1:13, 12–16 h in the fridge",
      flavor: "Smooth / daily",
      blurb: "Hoffmann-style ready-to-drink. Suggested for Light.",
      timeS: 16 * 3600,
      brewRatio: 13.3,
    },
    {
      id: "concentrate",
      name: "Concentrate + dilute",
      mechanic: "1:8 fridge steep, then cut with water or ice",
      flavor: "Heavy / travel",
      blurb: "Counter Culture concentrate. Suggested for Dark or when you want a stronger base.",
      timeS: 14 * 3600,
      brewRatio: 8,
    },
  ],
  clever: [
    {
      id: "steep",
      name: "Steep then drain",
      mechanic: "On the counter ~2:00, then on the cup",
      flavor: "Body / even",
      blurb: "Full immersion, then drain. Suggested for Dark, heavy, or naturals.",
      timeS: 180,
    },
    {
      id: "short",
      name: "Short steep",
      mechanic: "On the counter ~1:15, then drain",
      flavor: "Brighter / Light",
      blurb: "Less contact, more clarity. Suggested for Light + acid.",
      timeS: 90,
    },
    {
      id: "gina",
      name: "80 / 95 / 80",
      mechanic: "Closed 80 °C, open 95 °C, closed 80 °C",
      flavor: "Layered sweet → open → juicy",
      blurb: "Emi Fukahori, WBrC 2018 on a GINA. Maps to a Clever: immerse cool (sweetness), drip hot (layers), immerse cool (juicy body). The world-winning temperature switch.",
      timeS: 210,
      wantedC: 95,
      startC: 80,
      finishC: 80,
      doseG: 17,
      brewRatio: 12.9,
      lockTemp: true,
    },
  ],
  espresso: [
    {
      id: "adaptive-light",
      name: "Adaptive Light",
      mechanic: "Flow-aware, descending pressure after a hold",
      flavor: "Sweet / clear",
      blurb: "SproFiler Adaptive for Light Roast. Descending pressure for sweetness and clarity at the expense of body. Light default on a Gaggiuino.",
      timeS: 35,
      wantedC: 93,
      brewRatio: 2.3,
      gaggiuino: "Adaptive for Light Roast",
    },
    {
      id: "blooming",
      name: "Blooming",
      mechanic: "Flow-controlled fill, long soak, then extract",
      flavor: "Floral / pour-over-like",
      blurb: "SproFiler Blooming espresso. Saturate the puck, then extract. Best for Light, complex lots — flavours like a pour-over, less sour sharpness.",
      timeS: 55,
      wantedC: 93,
      brewRatio: 2.2,
      gaggiuino: "Blooming espresso",
    },
    {
      id: "extractamundo",
      name: "Turbo",
      mechanic: "Fast fill to 4.5 bar, short soak, 3 ml/s capped at 6 bar",
      flavor: "Fruit / high extraction",
      blurb: "SproFiler Extractamundo Dos! IUIUIU turbo. Light roasts, ~15–20 s. Paper in the basket if you use a VST/IMS.",
      timeS: 18,
      wantedC: 93,
      brewRatio: 2.3,
      grind: "fine",
      lockTemp: true,
      gaggiuino: "Extractamundo Dos!",
    },
    {
      id: "lhl",
      name: "Low–high–low",
      mechanic: "Fast 1:3.5, pressure up then down. Needs scales.",
      flavor: "Bright / less harsh",
      blurb: "SproFiler Low High Low. 17 g → 60 g. High ratio, lower TDS, fewer harsh notes on Light. Phase-2 flow 5–8 g/s, 5–7 bar.",
      timeS: 22,
      wantedC: 92,
      doseG: 17,
      brewRatio: 3.5,
      lockTemp: true,
      gaggiuino: "Low High Low",
    },
    {
      id: "londinium",
      name: "Londinium / lever",
      mechanic: "Lever-style rise, then a declining spring",
      flavor: "Syrup / body",
      blurb: "SproFiler Londinium (Leva 6 / Leva 9 are the same family). Smooth, syrupy, works across roasts. Medium and heavy/sweet default.",
      timeS: 28,
      wantedC: 92,
      brewRatio: 2,
      gaggiuino: "Londinium",
    },
    {
      id: "adaptive-dark",
      name: "Adaptive Dark",
      mechanic: "Lower temp, higher hold pressure, slower tail flow",
      flavor: "Creamy / chocolate",
      blurb: "SproFiler Adaptive Dark Roast. Cooler (~88 °C), creamier Dark shot.",
      timeS: 36,
      wantedC: 88,
      brewRatio: 2,
      lockTemp: true,
      gaggiuino: "Adaptive Dark Roast",
    },
    {
      id: "stock",
      name: "Stock 9 bar",
      mechanic: "Pump-on 9 bar, you stop the shot",
      flavor: "Classic / café",
      blurb: "SproFiler Stock - 9 Bar. Stock Gaggia Classic feel. Dial by time or weight like before the mod. 9 bar is a ceiling, not a target.",
      timeS: 27,
      wantedC: 93,
      brewRatio: 2,
      gaggiuino: "Stock - 9 Bar",
    },
    {
      id: "filter",
      name: "Filter on espresso",
      mechanic: "Paper in the basket, 1:5, then dilute ~230 g",
      flavor: "Filter cup / machine only",
      blurb: "SproFiler Filter. Coarser than espresso, paper + puck screen, pull ~5:1, cut with 225–250 g water. When the Gaggia is the only brewer.",
      timeS: 110,
      wantedC: 89,
      brewRatio: 5,
      bypassRatio: 13,
      grind: "medium-fine",
      lockTemp: true,
      gaggiuino: "Filter",
    },
  ],
  chemex: [
    {
      id: "hoffmann",
      name: "Hoffmann Chemex",
      mechanic: "Bloom, 60% pour, stir and shake — 30 g : 500 g, ~4:10",
      flavor: "Clean / paper",
      blurb: "Hoffmann Chemex as a V60. Thick bonded paper, slower and cleaner than a cone. The one published skeleton we keep.",
    },
  ],
  moka: [
    {
      id: "hoffmann",
      name: "Hoffmann moka",
      mechanic: "Hot fill to the valve, no tamp, off at first blonde",
      flavor: "Body / chocolate",
      blurb: "Hoffmann moka. Not espresso — stop when the stream turns honey. The one published skeleton we keep.",
    },
  ],
  cupping: [
    {
      id: "sca",
      name: "SCA cupping",
      mechanic: "8.25 g / 150 g, 93 °C, 4 min, break and skim",
      flavor: "Reference / even",
      blurb: "SCA cupping protocol. The academic reference cup, not a drink recipe.",
    },
  ],
};

export const SWITCH_MODES = (TECHNIQUES.switch ?? []).map((t) => ({
  id: t.id as SwitchMode,
  name: t.name,
  valve: t.mechanic,
  blurb: t.blurb,
  timeS: t.timeS,
}));

const RECIPE_ORIGIN: Partial<Record<BrewMethod, Record<string, string>>> = {
  switch: {
    steep: "Hoffmann · daily driver",
    fukahori: "Fukahori / MAME · shop recipe",
    hybrid: "Kasuya · Super Hybrid 2025",
    hold: "Shop hybrid",
    double: "WBrC 2024 · Ryan Wibawa (3rd)",
    bull: "US Brewers Cup 2025 · Justin Bull",
  },
  aeropress: {
    stanica: "WAC 2024 · George Stanica",
    pop: "WAC 2025 · Némo Pop",
    merikanto: "WAC 2021 · Tuomas Merikanto",
    wendelien: "WAC 2019 · Wendelien van Bunnik",
    tay: "WAC 2023 · Tay Wipvasutt",
  },
  v60: {
    hoffmann: "Hoffmann · Ultimate V60",
    "kasuya-acid": "WBrC 2016 · Tetsu Kasuya",
    "kasuya-sweet": "WBrC 2016 · Tetsu Kasuya",
    peng: "WBrC 2025 · George Peng (Solo)",
    chad: "WBrC 2017 · Chad Wang",
    rao: "Rao · V60 spin",
    hedrick: "Hedrick · double bloom",
    iced: "Hoffmann · Japanese iced",
  },
  kalita: {
    wave: "Café / older WBrC",
    mccarthy: "WBrC 2013 · James McCarthy",
  },
  origami: {
    medina: "WBrC 2023 · Carlos Medina",
    du: "WBrC 2019 · Jia-Ning Du",
  },
  orea: {
    wolfl: "WBrC 2024 · Martin Wölfl",
    hsu: "WBrC 2022 · Shih Yuan Hsu",
  },
  frenchpress: {
    hoffmann: "Hoffmann · Ultimate French Press",
    classic: "Community · 4:00 press",
  },
  coldbrew: {
    rtd: "Hoffmann · fridge steep",
    concentrate: "Counter Culture · concentrate",
  },
  clever: {
    steep: "Hoffmann / Clever hybrid",
    short: "Community · short steep",
    gina: "WBrC 2018 · Emi Fukahori (GINA)",
  },
  espresso: {
    "adaptive-light": "SproFiler / Decent · Adaptive Light",
    blooming: "SproFiler / Decent · Blooming espresso",
    extractamundo: "SproFiler / IUIUIU · Extractamundo Dos",
    lhl: "SproFiler · Low High Low",
    londinium: "SproFiler / Decent · Londinium",
    "adaptive-dark": "SproFiler / Decent · Adaptive Dark",
    stock: "SproFiler · Stock 9 Bar",
    filter: "SproFiler · Filter",
  },
  chemex: {
    hoffmann: "Hoffmann · Chemex as V60",
  },
  moka: {
    hoffmann: "Hoffmann · moka",
  },
  cupping: {
    sca: "SCA cupping protocol",
  },
};

const METHOD_ORIGIN: Partial<Record<BrewMethod, string>> = {
  v60: "Hoffmann · Ultimate V60",
  kalita: "Café / older WBrC",
  origami: "WBrC 2023 · Carlos Medina",
  chemex: "Hoffmann · Chemex as V60",
  switch: "Hoffmann · daily driver",
  clever: "Hoffmann / Clever hybrid",
  aeropress: "WAC 2024 · George Stanica",
  frenchpress: "Hoffmann · Ultimate French Press",
  orea: "WBrC 2024 · Martin Wölfl",
  coldbrew: "Hoffmann · fridge steep",
  moka: "Hoffmann · moka",
  espresso: "WBC Light cluster · 1:2–1:2.5",
  cupping: "SCA cupping protocol",
};

export function techniquesFor(method: BrewMethod, locale: Locale = "en"): BrewTechnique[] {
  return (TECHNIQUES[method] ?? []).map((tech) => ({
    ...tech,
    flavor: techField(locale, method, tech.id, "flavor") ?? tech.flavor,
    mechanic: techField(locale, method, tech.id, "mechanic") ?? tech.mechanic,
    blurb: techField(locale, method, tech.id, "blurb") ?? tech.blurb,
    origin: tech.origin ?? RECIPE_ORIGIN[method]?.[tech.id] ?? METHOD_ORIGIN[method],
  }));
}

export function recipeOrigin(method: BrewMethod, techniqueId?: string): string | undefined {
  if (techniqueId) return RECIPE_ORIGIN[method]?.[techniqueId] ?? METHOD_ORIGIN[method];
  return METHOD_ORIGIN[method];
}

/**
 * Pick a Switch valve pattern from roast style, flavor goals, and process.
 * Acid Light → Fukahori open pour. Heavy / Dark / natural → full steep.
 * Any gassy Rest → Super Hybrid (long bloom; Bull / Fukahori wait until degassed).
 * Otherwise Kasuya Super Hybrid (closed last pour, cooler finish).
 */
export function suggestedSwitchMode(
  style: RoastStyleId,
  flavors: FlavorId[] = [],
  process?: ProcessId,
  gassy?: boolean,
): SwitchMode {
  return suggestedTechniqueId("switch", style, flavors, process, gassy) as SwitchMode;
}

/**
 * Championship / shop script for a method. Flavor words only move the pick
 * when a published recipe actually claims that cup.
 */
export function suggestedTechniqueId(
  method: BrewMethod,
  style: RoastStyleId,
  flavors: FlavorId[] = [],
  process?: ProcessId,
  gassy?: boolean,
): string | undefined {
  if (techniquesFor(method).length === 0) return undefined;
  const acid = flavors.some((id) => ACID.includes(id));
  const fruit = flavors.some((id) => id === "fruity" || id === "bright" || id === "juicy");
  const heavy = flavors.some((id) => HEAVY.includes(id));
  const floral = flavors.includes("floral");
  const winey = flavors.includes("winey");
  const sweet = flavors.includes("lightSweet");

  const clogs = processClogsPaper(process);

  if (method === "switch") {
    if (style === "dark" || heavy) return "steep";
    if (gassy || winey) return "hybrid";
    if (clogs && acid) return "bull";
    if (clogs) return "steep";
    if (style === "light" && acid) return "fukahori";
    if (style === "medium") return "hold";
    return "hybrid";
  }
  if (method === "aeropress") {
    if (style === "dark" || heavy || style === "medium") return "pop";
    if (gassy && acid) return "merikanto";
    if (floral || winey) return "merikanto";
    if (sweet && !fruit) return "merikanto";
    return "stanica";
  }
  if (method === "v60") {
    if (style === "dark" || heavy) return "hoffmann";
    if (gassy || winey) return "hedrick";
    if (floral) return "peng";
    if (acid) return "kasuya-acid";
    if (sweet || style === "medium") return "kasuya-sweet";
    if (flavors.includes("clean")) return "rao";
    return "hoffmann";
  }
  if (method === "kalita") return style === "light" && !heavy ? "mccarthy" : "wave";
  if (method === "origami") {
    if (gassy || heavy) return "medina";
    return style === "light" && (acid || floral) ? "du" : "medina";
  }
  if (method === "orea") {
    if (clogs || floral || winey) return "hsu";
    return "wolfl";
  }
  if (method === "frenchpress") return style === "dark" || heavy ? "classic" : "hoffmann";
  if (method === "coldbrew") return style === "dark" || heavy ? "concentrate" : "rtd";
  if (method === "clever") {
    if (style === "dark" || heavy || clogs) return "steep";
    if (style === "light" && (floral || sweet)) return "gina";
    if (gassy || winey) return "steep";
    if (style === "light" && acid) return "short";
    return "steep";
  }
  if (method === "espresso") {
    if (style === "dark" || heavy) return "adaptive-dark";
    if (gassy) return "blooming";
    if (style === "medium") return "londinium";
    if (floral || winey) return "blooming";
    if (acid) return "extractamundo";
    return "adaptive-light";
  }
  return techniquesFor(method)[0]?.id;
}

export function recommendBrew(query: BrewQuery): BrewRecipe {
  const locale = query.locale ?? "en";
  const t = (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars);
  const info = BREW_METHODS.find((m) => m.id === query.method) ?? BREW_METHODS[0];
  const base = { ...BASE[query.method][query.roastStyle] };
  const flavors = query.flavors ?? [];
  const acid = flavors.some((id) => ACID.includes(id));
  const heavy = flavors.some((id) => HEAVY.includes(id));
  const gassy = stillBlooming(query.drinkPlan, query.daysSinceRoast, query.roastStyle);
  const openKettle = query.method !== "espresso" && query.method !== "coldbrew";
  const userDose = query.coffeeG != null && Number.isFinite(query.coffeeG);
  const userRatio = query.ratio != null && Number.isFinite(query.ratio);
  const suggestedTech = suggestedTechniqueId(
    query.method,
    query.roastStyle,
    flavors,
    query.process,
    gassy,
  );
  const techniqueId =
    query.technique ??
    (query.method === "switch" ? query.switchMode : undefined) ??
    suggestedTech;
  const tech = techniquesFor(query.method, locale).find((t) => t.id === techniqueId);
  const suggestedMode = suggestedSwitchMode(query.roastStyle, flavors, query.process, gassy);
  const switchMode = query.method === "switch" ? ((techniqueId as SwitchMode | undefined) ?? suggestedMode) : undefined;

  let wantedC = tech?.wantedC ?? base.wantedC;
  if (!tech?.lockTemp) {
    if (acid && openKettle) wantedC = Math.min(96, wantedC + 1);
    if (heavy && openKettle) wantedC = Math.max(85, wantedC - 2);
  }

  const boilC =
    query.kitchenAltitudeM != null && Number.isFinite(query.kitchenAltitudeM)
      ? round1(boilingPointC(query.kitchenAltitudeM))
      : undefined;

  let kettleC = wantedC;
  let cappedByBoil = false;
  if (openKettle && boilC != null) {
    const ceiling = round1(boilC - 1);
    if (wantedC > ceiling) {
      kettleC = ceiling;
      cappedByBoil = kettleC < wantedC - 0.05;
    }
  }

  /** Only treat the kettle as “cool” when it sits under the SCA 92 °C floor — not when it is short of a sea-level 96 card. */
  const belowScaFloor = openKettle && boilC != null && kettleC < 92;
  const stepsN = belowScaFloor ? (92 - kettleC) / 3 : 0;
  const immersion = info.family === "immersion" || info.family === "hybrid" || info.family === "cupping";
  let timeS = base.timeS + Math.round(stepsN * (immersion ? 40 : 20));
  if (heavy) timeS += 15;
  if (acid && !immersion) timeS = Math.max(base.timeS - 10, timeS - 10);

  const brewR = tech?.brewRatio ?? base.ratio;
  const bypassR = tech?.brewRatio != null ? (tech.bypassRatio ?? 0) : (base.bypassRatio ?? 0);
  const cardCup = brewR + bypassR;
  let cupRatio = userRatio ? clampRatio(query.ratio as number, query.method) : cardCup;
  if (!userRatio && belowScaFloor && 92 - kettleC >= 3 && query.method !== "espresso") {
    cupRatio = Math.max(query.method === "moka" ? 7 : 13, round1(cupRatio * 0.93));
  }

  const cardDoseG = tech?.doseG ?? base.doseG;
  const coffeeG = userDose
    ? clampDose(query.coffeeG as number)
    : niceDose(cardDoseG);
  let waterG: number;
  let bypassG: number | undefined;
  if (bypassR > 0) {
    const brewFrac = brewR / (brewR + bypassR);
    waterG = Math.round(coffeeG * cupRatio * brewFrac);
    bypassG = Math.round(coffeeG * cupRatio * (1 - brewFrac));
  } else {
    waterG = Math.round(coffeeG * cupRatio);
  }
  const cupG = waterG + (bypassG ?? 0);

  if (tech?.timeS != null) {
    timeS = tech.timeS + Math.round(stepsN * (immersion ? 40 : 20));
    if (heavy && !tech.lockTemp) timeS += 15;
  }
  if (info.family === "pour") {
    timeS = Math.round(timeS * Math.pow(coffeeG / cardDoseG, 0.4));
  }

  const pourAltitude =
    info.family === "pour" || query.method === "espresso" || query.method === "moka";
  const paperBed =
    info.family === "pour" ||
    query.method === "switch" ||
    query.method === "clever" ||
    query.method === "moka" ||
    query.method === "aeropress" ||
    query.method === "espresso";
  const skipFinerOnGas = gassy && paperBed;
  let grindShift = 0;
  if (pourAltitude && belowScaFloor && !skipFinerOnGas) {
    grindShift += Math.min(2, Math.max(1, Math.round(stepsN)));
  }
  if (acid && !skipFinerOnGas) grindShift += 1;
  if (heavy) grindShift -= 1;
  if (!skipFinerOnGas && (query.densityClass === "hard" || query.beanSize === "small")) grindShift += 1;
  if (query.densityClass === "soft" || query.beanSize === "large") grindShift -= 1;
  if (gassy) grindShift -= 1;
  else if (processClogsPaper(query.process) && query.method !== "espresso") grindShift -= 1;
  grindShift = Math.max(-2, Math.min(2, grindShift));
  if (bedResistsDose(query.method)) {
    const doseRel = coffeeG / cardDoseG;
    if (doseRel >= 1.45) grindShift -= 1;
    else if (doseRel <= 0.7) grindShift += 1;
    if (userRatio && cupRatio <= cardCup - 1.2) grindShift += 1;
    if (userRatio && cupRatio >= cardCup + 1.2) grindShift -= 1;
  }
  const grindBase = tech?.grind ?? base.grind;
  const grind = clampFilterGrind(query.method, shiftFiner(grindBase, grindShift));
  const grindWord = (g: Grind) => t(`grind.${g}` as MessageKey);
  const grindNote =
    grind !== grindBase
      ? t("grind.shifted", { grind: grindWord(grind), from: grindWord(grindBase) })
      : grindWord(grind);

  let kettleNote = kettleCopy(query.method, kettleC, boilC, cappedByBoil, wantedC, t);
  if (tech?.startC != null || tech?.finishC != null) {
    const bits = [
      tech.startC != null ? t("kettle.first", { c: tech.startC }) : null,
      tech.finishC != null ? t("kettle.finish", { c: tech.finishC }) : null,
    ].filter(Boolean);
    kettleNote = `${kettleNote} · ${bits.join(" · ")}`;
  }
  const { restLabel, restWhy, restWarn } = restCopy(
    query.drinkPlan,
    query.daysSinceRoast,
    query.roastStyle,
    t,
  );
  const ctx = {
    locale,
    method: query.method,
    coffeeG,
    waterG,
    bypassG,
    kettleC,
    timeS,
    grind,
    gassy,
    natural: processClogsPaper(query.process),
    roastStyle: query.roastStyle,
    switchMode,
    technique: tech?.id,
    startC: tech?.startC,
    finishC: tech?.finishC,
  };

  const why: string[] = [
    t("why.starts", {
      style: t(`style.${query.roastStyle}` as MessageKey),
      method: METHOD_NAME[query.method],
      ratio: formatRatio(base.ratio),
      bypass: base.bypassRatio ? t("why.bypass") : "",
      temp: base.wantedC,
      time: timeCopy(query.method, base.timeS, t),
    }),
  ];
  if (query.varietyName) {
    why.push(
      t("why.variety", {
        name: query.varietyName,
        density: query.densityClass
          ? t("why.densityBit", { cls: t(`density.${query.densityClass}` as MessageKey) })
          : "",
        size: query.beanSize ? t("why.sizeBit", { size: t(`size.${query.beanSize}` as MessageKey) }) : "",
      }),
    );
  }
  if (flavors.length) {
    why.push(
      `${t("why.aimed", { flavors: flavors.map((id) => t(`flavor.${id}` as MessageKey)).join(" + ") })} ${
        acid ? t("why.acid") : heavy ? t("why.heavy") : t("why.clean")
      }`,
    );
  }
  if (cappedByBoil && boilC != null) {
    why.push(t("why.capped", { boil: boilC.toFixed(1), kettle: kettleC.toFixed(1) }));
  } else if (openKettle && boilC != null) {
    why.push(t("why.clears", { boil: boilC.toFixed(1), wanted: wantedC.toFixed(0) }));
  }
  if (processClogsPaper(query.process) && query.method !== "espresso") {
    why.push(t("why.clog"));
  }
  if (gassy && query.method !== "coldbrew" && query.method !== "cupping") {
    why.push(t("why.gassyScript", { days: query.daysSinceRoast ?? 4 }));
  }
  if (tech) {
    why.push(
      `${tech.name} · ${tech.flavor}. ${tech.mechanic}. ${
        tech.id === suggestedTech
          ? t("why.suggested")
          : t("why.overrode", {
              name:
                techniquesFor(query.method, locale).find((x) => x.id === suggestedTech)?.name ?? suggestedTech ?? "",
            })
      } ${tech.blurb}`,
    );
  }
  if (userDose || userRatio) {
    why.push(
       t(bedResistsDose(query.method) ? "why.dosePour" : "why.doseImmersion", {
        coffee: coffeeG,
        ratio: round1(cupRatio),
        water: waterG,
        bypass: bypassG ? t("why.bypassBit", { g: bypassG }) : "",
      }),
    );
  }
  why.push(restWhy);

  const warnings: string[] = [];
  if (openKettle && boilC == null) {
    warnings.push(t("brew.warnAltitude"));
  }
  if (boilC != null && boilC < 92 && openKettle) {
    warnings.push(t("brew.warnSca", { boil: boilC.toFixed(1) }));
  }
  if (query.roastStyle === "dark" && query.method !== "espresso" && query.method !== "moka") {
    warnings.push(t("why.dark"));
  }
  if (query.method === "origami" && query.roastStyle !== "light") {
    warnings.push(t("why.origami"));
  }
  if (restWarn) warnings.push(restWarn);
  if (gassy && tech && GASSY_RISKY.has(tech.id)) {
    warnings.push(t("warn.gassyNoBloom", { days: query.daysSinceRoast ?? 4 }));
  }

  const sources = methodSources(query.method, query.roastStyle, openKettle);

  return {
    method: query.method,
    roastStyle: query.roastStyle,
    ratio: formatRatio(cupRatio),
    ratioN: round1(cupRatio),
    coffeeG,
    waterG,
    bypassG,
    cupG,
    wantedC: round1(wantedC),
    kettleC: round1(kettleC),
    boilC,
    cappedByBoil,
    kettleNote,
    timeLabel: timeCopy(query.method, timeS, t),
    timeS,
    grind,
    grindNote,
    cardDoseG,
    restLabel,
    restWarn,
    switchMode,
    suggestedSwitchMode: query.method === "switch" ? suggestedMode : undefined,
    technique: tech?.id,
    suggestedTechnique: suggestedTech,
    gaggiuino: tech?.gaggiuino,
    origin: recipeOrigin(query.method, tech?.id),
    steps: buildBrewSteps(ctx),
    why,
    sources,
    warnings,
  };
}

function methodSources(method: BrewMethod, style: RoastStyleId, openKettle: boolean): string[] {
  const out = [
    "SCA / Lockhart Golden Cup — strength and a 90–96 °C window",
    "Batali, Frost, Guinard et al. 2020, Sci. Rep. — brew T at fixed TDS/PE",
  ];
  if (method === "v60" || method === "kalita" || method === "chemex") {
    out.push("Hoffmann Ultimate V60 / Chemex adaptation — bloom, 60% pour, stir");
  }
  if (method === "v60") {
    out.push("Kasuya 4:6 WBrC 2016 · Chad Wang WBrC 2017 one-pour · Peng WBrC 2025 split-temp 96 then 80 °C");
  }
  if (method === "kalita") {
    out.push("McCarthy WBrC 2013 Kalita Wave — column, low agitation, ~3:30");
  }
  if (method === "origami" || method === "orea" || (style === "light" && (method === "v60" || method === "kalita"))) {
    out.push("WBrC 2023–26 — Light filter ~1:14–1:16, 91–96 °C (Medina Origami 2023; Wölfl OREA 2024; Peng 2025)");
  }
  if (method === "switch") {
    out.push(
      "Hoffmann Switch · Fukahori shop open-pour · Kasuya Super Hybrid · Wibawa double immersion · Bull USBC 2025 open-then-steep",
    );
  }
  if (method === "clever" || method === "frenchpress") {
    out.push("Hoffmann Switch daily driver / Ultimate French Press; Liang et al. 2021 — immersion yield ~21% when time is free");
  }
  if (method === "aeropress") {
    out.push(
      "WAC 2024 Stanica inverted 96 °C + bypass · WAC 2025 Pop 84 °C + 50 °C bypass · Merikanto 2021 80 °C inverted · van Bunnik 2019 fast concentrate",
    );
  }
  if (method === "orea") {
    out.push("Wölfl WBrC 2024 OREA V4 17 g / 270 g · Hsu WBrC 2022 cool 70 °C then 95 °C pulses");
  }
  if (method === "origami") {
    out.push("Medina WBrC 2023 five pulses 91 °C · Jia-Ning Du WBrC 2019 three pours, no bloom, 94 °C");
  }
  if (method === "coldbrew") out.push("Hoffmann cold brew — ~75 g / 1 L, fridge ~12 h, medium-fine; CCC 1:8 concentrate + dilute");
  if (method === "moka") out.push("Hoffmann moka: hot fill to the valve, no tamp, off at first blonde");
  if (method === "espresso") {
    out.push(
      "SproFiler / Gaggiuino community profiles — Adaptive Light/Dark, Blooming, Extractamundo Dos!, Londinium, Low High Low, Stock 9 Bar, Filter 2.1 · WBC Light cluster still ~1:2–1:2.5",
    );
  }
  if (method === "cupping") out.push("SCA cupping protocol — 8.25 g / 150 g, 93 °C, 4 min");
  if (openKettle) out.push("T_boil ≈ 100 − h/285 °C; Erdélyi / Perfect Daily Grind — grind finer, stay longer at altitude");
  return out;
}

function kettleCopy(
  method: BrewMethod,
  kettleC: number,
  boilC: number | undefined,
  capped: boolean,
  wantedC: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (method === "espresso") return t("kettle.espresso");
  if (method === "coldbrew") return t("kettle.cold");
  if (method === "moka") {
    if (boilC == null) return t("kettle.mokaWanted", { wanted: wantedC.toFixed(0) });
    if (capped) return t("kettle.mokaBoil", { boil: boilC.toFixed(1) });
    return t("kettle.mokaKettle", { kettle: kettleC.toFixed(0) });
  }
  if (boilC == null) return t("kettle.setAlt", { wanted: wantedC.toFixed(0) });
  if (capped) return t("kettle.rolling", { boil: boilC.toFixed(1), wanted: wantedC.toFixed(0) });
  if (wantedC >= boilC - 1.2) return t("kettle.pourBoil", { boil: boilC.toFixed(1) });
  return t("kettle.offBoil", { kettle: kettleC.toFixed(0), boil: boilC.toFixed(1) });
}

function stillBlooming(plan: DrinkPlan, days: number, style: RoastStyleId): boolean {
  if (plan === "rtd") return days <= 1;
  if (style === "light") return days <= 10;
  if (style === "medium") return days <= 6;
  return days <= 3;
}

function restWindows(style: RoastStyleId): { gas: number; good: number; aging: number } {
  if (style === "light") return { gas: 10, good: 21, aging: 35 };
  if (style === "medium") return { gas: 6, good: 16, aging: 28 };
  return { gas: 3, good: 10, aging: 18 };
}

function restCopy(
  plan: DrinkPlan,
  days: number,
  style: RoastStyleId,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string = (key, vars) =>
    translate("en", key, vars),
): { restLabel: string; restWhy: string; restWarn?: string } {
  if (plan === "rtd") {
    if (days <= 3) {
      return {
        restLabel: t("rest.rtdWindow", { days }),
        restWhy: t("restWhy.rtdWindow"),
      };
    }
    return {
      restLabel: t("rest.rtdPast", { days }),
      restWhy: t("restWhy.rtdPast"),
      restWarn: t("rest.rtdWarn"),
    };
  }
  const w = restWindows(style);
  if (days <= 2) {
    return {
      restLabel: t("rest.degassing", { days }),
      restWhy: t("restWhy.degassing"),
      restWarn: days <= 1 ? t("rest.gasWarn") : undefined,
    };
  }
  if (days <= w.gas) {
    return {
      restLabel: t("rest.bloomingGood", { days }),
      restWhy: t("restWhy.bloomingGood"),
    };
  }
  if (days <= w.good) {
    return {
      restLabel: t("rest.stillGood", { days }),
      restWhy: t("restWhy.stillGood", { good: w.good }),
    };
  }
  if (days <= w.aging) {
    return {
      restLabel: t("rest.aging", { days }),
      restWhy: t("restWhy.aging"),
    };
  }
  return {
    restLabel: t("rest.fading", { days }),
    restWhy: t("restWhy.fading"),
    restWarn: t("rest.fadeWarn"),
  };
}

export function clampDose(n: number): number {
  return Math.max(5, Math.min(80, Math.round(n * 4) / 4));
}

export function clampRatio(n: number, method: BrewMethod): number {
  if (method === "espresso") return Math.max(1.5, Math.min(18, round1(n)));
  if (method === "moka") return Math.max(6, Math.min(14, round1(n)));
  if (method === "coldbrew") return Math.max(6, Math.min(18, round1(n)));
  if (method === "aeropress") return Math.max(7, Math.min(18, round1(n)));
  return Math.max(10, Math.min(22, round1(n)));
}

function parseFlavorNames(text: string): FlavorId[] {
  const found: FlavorId[] = [];
  for (const f of [...FLAVORS].sort((a, b) => b.name.length - a.name.length)) {
    if (new RegExp(f.name.replace(/\s+/g, "\\s+"), "i").test(text) && !found.includes(f.id)) found.push(f.id);
  }
  return found.slice(0, 2);
}

function shiftFiner(grind: Grind, steps: number): Grind {
  const i = Math.min(GRINDS.length - 1, Math.max(0, GRINDS.indexOf(grind) + steps));
  return GRINDS[i];
}

/** HCG method bands already encode espresso vs V60. Filter cards stop at medium-fine. */
function clampFilterGrind(method: BrewMethod, grind: Grind): Grind {
  if (method === "espresso" || method === "moka") return grind;
  if (grind === "fine") return "medium-fine";
  return grind;
}

function formatRatio(ratio: number): string {
  const rounded = round1(ratio);
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}

function timeCopy(
  method: BrewMethod,
  sec: number,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
): string {
  if (method === "espresso") return t("time.espresso", { s: Math.round(sec) });
  if (method === "moka") return t("time.moka", { t: formatBrewTime(sec) });
  if (method === "coldbrew") return t("time.cold", { h: Math.round(sec / 3600) });
  return formatBrewTime(sec);
}

function niceDose(n: number): number {
  return Number.isInteger(n) ? n : Math.round(n * 4) / 4;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

export function attachKeyOf(attach: BrewAttach): string {
  if (attach.kind === "library") return `library:${attach.id}`;
  if (attach.kind === "kpro") return `kpro:${attach.snapshot.label}`;
  return attach.kind;
}
