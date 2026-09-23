import { inferredDensityClass, type DrinkPlan, type RoastIntent } from "./generate";
import {
  FLAVORS,
  ORIGINS,
  STYLES,
  VARIETIES,
  flavorById,
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
    light: { ratio: 16, wantedC: 96, timeS: 165, grind: "medium-fine", doseG: 15 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 155, grind: "medium", doseG: 15 },
    dark: { ratio: 17, wantedC: 90, timeS: 140, grind: "medium", doseG: 15 },
  },
  kalita: {
    light: { ratio: 16, wantedC: 96, timeS: 180, grind: "medium", doseG: 15 },
    medium: { ratio: 16.5, wantedC: 93, timeS: 170, grind: "medium", doseG: 15 },
    dark: { ratio: 17, wantedC: 90, timeS: 155, grind: "medium-coarse", doseG: 15 },
  },
  origami: {
    light: { ratio: 16, wantedC: 91, timeS: 160, grind: "medium-fine", doseG: 15.5 },
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
    light: { ratio: 15.9, wantedC: 93, timeS: 140, grind: "medium-fine", doseG: 17 },
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
    },
    {
      id: "kasuya-sweet",
      name: "4:6 · sweetness",
      mechanic: "Smaller first pour of the first 40%",
      flavor: "Honey / sweet",
      blurb: "Same 4:6 method. Less water in pour 1, more in pour 2 — Kasuya’s own WBrC 2016 cup was this sweet side.",
      timeS: 210,
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

export function techniquesFor(method: BrewMethod): BrewTechnique[] {
  return (TECHNIQUES[method] ?? []).map((t) => ({
    ...t,
    origin: t.origin ?? RECIPE_ORIGIN[method]?.[t.id] ?? METHOD_ORIGIN[method],
  }));
}

export function recipeOrigin(method: BrewMethod, techniqueId?: string): string | undefined {
  if (techniqueId) return RECIPE_ORIGIN[method]?.[techniqueId] ?? METHOD_ORIGIN[method];
  return METHOD_ORIGIN[method];
}

/**
 * Pick a Switch valve pattern from roast style, flavor goals, and process.
 * Acid Light → Fukahori open pour. Heavy / Dark / natural → full steep.
 * Otherwise Kasuya Super Hybrid (closed last pour, cooler finish).
 */
export function suggestedSwitchMode(
  style: RoastStyleId,
  flavors: FlavorId[] = [],
  process?: ProcessId,
): SwitchMode {
  return suggestedTechniqueId("switch", style, flavors, process) as SwitchMode;
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
  const heavy = flavors.some((id) => HEAVY.includes(id));
  const floral = flavors.includes("floral");
  const sweet = flavors.includes("lightSweet");

  if (method === "switch") {
    if (style === "dark" || heavy) return "steep";
    if (process === "natural" && acid) return "bull";
    if (process === "natural") return "steep";
    if (style === "light" && acid) return "fukahori";
    if (style === "medium") return "hold";
    return "hybrid";
  }
  if (method === "aeropress") {
    if (style === "dark" || heavy || style === "medium") return "pop";
    if (floral || sweet) return "merikanto";
    return "stanica";
  }
  if (method === "v60") {
    if (style === "dark" || heavy) return "hoffmann";
    if (floral) return "peng";
    if (acid && !flavors.includes("winey")) return "kasuya-acid";
    if (sweet || style === "medium") return "kasuya-sweet";
    if (gassy || flavors.includes("winey")) return "hedrick";
    if (flavors.includes("clean")) return "rao";
    return "hoffmann";
  }
  if (method === "kalita") return style === "light" && !heavy ? "mccarthy" : "wave";
  if (method === "origami") return style === "light" && (acid || floral) ? "du" : "medina";
  if (method === "orea") return process === "natural" || floral || flavors.includes("winey") ? "hsu" : "wolfl";
  if (method === "frenchpress") return style === "dark" || heavy ? "classic" : "hoffmann";
  if (method === "coldbrew") return style === "dark" || heavy ? "concentrate" : "rtd";
  if (method === "clever") {
    if (style === "light" && (floral || sweet)) return "gina";
    if (style === "dark" || heavy || process === "natural") return "steep";
    if (style === "light" && acid) return "short";
    return "steep";
  }
  if (method === "espresso") {
    if (style === "dark" || heavy) return "adaptive-dark";
    if (style === "medium") return "londinium";
    if (floral) return "blooming";
    if (acid) return "extractamundo";
    if (sweet) return "adaptive-light";
    return "adaptive-light";
  }
  return techniquesFor(method)[0]?.id;
}

export function recommendBrew(query: BrewQuery): BrewRecipe {
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
  const tech = techniquesFor(query.method).find((t) => t.id === techniqueId);
  const suggestedMode = suggestedSwitchMode(query.roastStyle, flavors, query.process);
  const switchMode = query.method === "switch" ? ((techniqueId as SwitchMode | undefined) ?? suggestedMode) : undefined;

  let wantedC = tech?.wantedC ?? base.wantedC;
  if (!tech?.lockTemp) {
    if (acid && openKettle) wantedC = Math.min(100, wantedC + 1);
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

  const deficit = openKettle ? Math.max(0, wantedC - kettleC) : 0;
  const stepsN = deficit / 3;
  const immersion = info.family === "immersion" || info.family === "hybrid" || info.family === "cupping";
  let timeS = base.timeS + Math.round(stepsN * (immersion ? 40 : 20));
  if (heavy) timeS += 15;
  if (acid && !immersion) timeS = Math.max(base.timeS - 10, timeS - 10);

  const brewR = tech?.brewRatio ?? base.ratio;
  const bypassR = tech?.brewRatio != null ? (tech.bypassRatio ?? 0) : (base.bypassRatio ?? 0);
  const cardCup = brewR + bypassR;
  let cupRatio = userRatio ? clampRatio(query.ratio as number, query.method) : cardCup;
  if (!userRatio && openKettle && deficit >= 5 && query.method !== "espresso") {
    cupRatio = Math.max(query.method === "moka" ? 7 : 13, round1(cupRatio * 0.93));
  }

  const coffeeG = userDose
    ? clampDose(query.coffeeG as number)
    : niceDose(tech?.doseG ?? base.doseG);
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
    timeS = Math.round(timeS * Math.pow(coffeeG / (tech?.doseG ?? base.doseG), 0.4));
  }

  let grindShift = stepsN >= 0.5 ? Math.min(2, Math.round(stepsN)) : 0;
  if (acid) grindShift += 1;
  if (heavy) grindShift -= 1;
  if (query.densityClass === "hard" || query.beanSize === "small") grindShift += 1;
  if (query.densityClass === "soft" || query.beanSize === "large") grindShift -= 1;
  if (query.process === "natural" && query.method !== "espresso") grindShift -= 1;
  if (gassy) grindShift -= 1;
  const pourLike =
    info.family === "pour" || query.method === "espresso" || query.method === "moka";
  if (pourLike) {
    const doseRel = coffeeG / base.doseG;
    if (doseRel >= 1.45) grindShift -= 1;
    else if (doseRel <= 0.7) grindShift += 1;
    if (cupRatio <= cardCup - 1.2) grindShift += 1;
    if (cupRatio >= cardCup + 1.2) grindShift -= 1;
  }
  const grindBase = tech?.grind ?? base.grind;
  const grind = shiftFiner(grindBase, grindShift);
  const grindNote =
    grind !== grindBase
      ? `${prettyGrind(grind)} · shifted from ${prettyGrind(grindBase)} for this roast / altitude / rest`
      : prettyGrind(grind);

  let kettleNote = kettleCopy(query.method, kettleC, boilC, cappedByBoil, wantedC);
  if (tech?.startC != null || tech?.finishC != null) {
    const bits = [
      tech.startC != null ? `first ${tech.startC} °C` : null,
      tech.finishC != null ? `finish / bypass ${tech.finishC} °C` : null,
    ].filter(Boolean);
    kettleNote = `${kettleNote} · ${bits.join(" · ")}`;
  }
  const { restLabel, restWhy, restWarn } = restCopy(query.drinkPlan, query.daysSinceRoast, query.roastStyle);
  const ctx: StepCtx = {
    method: query.method,
    coffeeG,
    waterG,
    bypassG,
    kettleC,
    timeS,
    grind,
    gassy,
    natural: query.process === "natural",
    roastStyle: query.roastStyle,
    switchMode,
    technique: tech?.id,
    startC: tech?.startC,
    finishC: tech?.finishC,
  };

  const why: string[] = [
    `${cap(query.roastStyle)} ${METHOD_NAME[query.method]} starts at ${formatRatio(base.ratio)}${
      base.bypassRatio ? ` brew + bypass` : ""
    }, ${base.wantedC} °C, ${timeCopy(query.method, base.timeS)}.`,
  ];
  if (query.varietyName) {
    why.push(
      `${query.varietyName}${query.densityClass ? ` · ${query.densityClass} density` : ""}${
        query.beanSize ? ` · ${query.beanSize} seed` : ""
      }. Denser / smaller seeds run a step finer; large or soft seeds a step coarser.`,
    );
  }
  if (flavors.length) {
    why.push(
      `Roast aimed at ${flavors.map((id) => flavorById(id).name).join(" + ")}. ${
        acid
          ? "Bright/fruity cards run a little hotter and finer."
          : heavy
            ? "Body / deep-sweet cards run a little cooler, coarser, and longer."
            : "Clean/sweet cards stay on the method skeleton."
      }`,
    );
  }
  if (cappedByBoil && boilC != null) {
    why.push(
      `Kitchen boil is ${boilC.toFixed(1)} °C. Pour at a rolling boil (${kettleC.toFixed(1)} °C) and move grind/time — UC Davis: at fixed TDS/PE, 87–93 °C barely changes the cup.`,
    );
  } else if (openKettle && boilC != null) {
    why.push(`Local boil ${boilC.toFixed(1)} °C still clears the ${wantedC.toFixed(0)} °C target.`);
  }
  if (query.process === "natural" && query.method !== "espresso") {
    why.push("Natural process can clog a fine bed — the grind is a step coarser; ease off if drawdown stalls.");
  }
  if (tech) {
    why.push(
      `${tech.name} · ${tech.flavor}. ${tech.mechanic}. ${
        tech.id === suggestedTech
          ? "Suggested for this roast / flavor."
          : `You overrode the suggested ${techniquesFor(query.method).find((t) => t.id === suggestedTech)?.name ?? suggestedTech}.`
      } ${tech.blurb}`,
    );
  }
  if (userDose || userRatio) {
    why.push(
      `Dose ${coffeeG} g at 1:${round1(cupRatio)}. Water is ${waterG} g${
        bypassG ? ` + ${bypassG} g bypass` : ""
      }. ${
        pourLike
          ? "A deeper bed runs a step coarser to hold time; a tighter ratio a step finer so extraction does not drop."
          : "Immersion extraction at equilibrium barely cares about grind (Liang 2021) — ratio sets strength."
      }`,
    );
  }
  why.push(restWhy);

  const warnings: string[] = [];
  if (openKettle && boilC == null) {
    warnings.push("Set kitchen altitude. Kettle temperature is capped by local boil, not by the sea-level card.");
  }
  if (boilC != null && boilC < 92 && openKettle) {
    warnings.push(
      `Boil (${boilC.toFixed(1)} °C) sits under the SCA 92 °C certification floor. Pour at boil; do not print a hotter number.`,
    );
  }
  if (query.roastStyle === "dark" && query.method !== "espresso" && query.method !== "moka") {
    warnings.push("Dark has almost no World Brewers Cup corpus. This row is a craft starting point.");
  }
  if (query.method === "origami" && query.roastStyle !== "light") {
    warnings.push("The WBrC 2023 Origami card is Light. Medium/dark here follow the same pulse idea, not a published winning recipe.");
  }
  if (restWarn) warnings.push(restWarn);

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
    timeLabel: timeCopy(query.method, timeS),
    timeS,
    grind,
    grindNote,
    restLabel,
    restWarn,
    switchMode,
    suggestedSwitchMode: query.method === "switch" ? suggestedMode : undefined,
    technique: tech?.id,
    suggestedTechnique: suggestedTech,
    gaggiuino: tech?.gaggiuino,
    origin: recipeOrigin(query.method, tech?.id),
    steps: buildSteps(ctx),
    why,
    sources,
    warnings,
  };
}

interface StepCtx {
  method: BrewMethod;
  coffeeG: number;
  waterG: number;
  bypassG?: number;
  kettleC: number;
  timeS: number;
  grind: Grind;
  gassy: boolean;
  natural: boolean;
  roastStyle: RoastStyleId;
  switchMode?: SwitchMode;
  technique?: string;
  startC?: number;
  finishC?: number;
}

function switchSteps(ctx: StepCtx, bloom: number, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  const mode = ctx.technique ?? ctx.switchMode ?? "steep";
  if (mode === "bull") {
    return [
      { at: "Prep", title: "Open first", detail: "Justin Bull USBC 2025 / WBrC hybrid: percolation first for acidity, then a closed steep for sweetness." },
      { at: "0:00", title: "Open pour", detail: `Valve open. Circle pour to ${Math.round(w * 0.4)} g at ${temp}.` },
      { at: "0:55", title: "Close + steep", detail: `Close the valve. Pour to ${Math.round(w * 0.8)} g, then a gentle centre pour to ${w} g.` },
      { at: "2:00", title: "Open drain", detail: `Open. Drawdown around ${t}. Fines settle on the bed — that is the extra filter.${stall}` },
    ];
  }
  if (mode === "fukahori") {
    const bloomG = Math.max(bloom, Math.round(ctx.coffeeG * 3.5));
    return [
      { at: "Prep", title: "Closed", detail: "Valve down. Fukahori / MAME: closed bloom, then the rest is an open pour." },
      { at: "0:00", title: "Bloom · closed", detail: `${bloomG} g at ${temp} (she uses 50 g on 14 g). Swirl. 30 s.` },
      { at: "0:30", title: "Open + pour", detail: `Flip the switch open. Centre pour the rest to ${w} g. Aim to finish pouring by 1:10.` },
      { at: t, title: "Cut drips", detail: `Drawdown ~${t}. Lift the dripper to cut the last drops.${stall}` },
    ];
  }
  if (mode === "hybrid") {
    return [
      { at: "Prep", title: "Closed", detail: "Kasuya Super Hybrid 2025 / Bøen shape: closed bloom, open mid, closed last pour, open drain." },
      { at: "0:00", title: "Bloom · closed", detail: `${Math.round(ctx.coffeeG * 2.5)} g at ${temp}. 40 s. Wet everything.` },
      { at: "0:40", title: "Open pours", detail: `Open the valve. Pour to ${Math.round(w * 0.4)} g, then at 1:30 to ${Math.round(w * (2 / 3))} g.` },
      { at: "2:10", title: "Last pour · closed", detail: `Close the valve. Cool the kettle to 70–80 °C if you can. Fill to ${w} g. Steep 45 s.` },
      { at: "2:55", title: "Open drain", detail: `Open. Finish around ${t}. The cool closed finish is for sweetness without a harsh tail.` },
    ];
  }
  if (mode === "hold") {
    const first = Math.round(w * 0.6);
    return [
      { at: "Prep", title: "Closed", detail: "Valve down. Closed bloom and first pour, then open for the last pour." },
      { at: "0:00", title: "Bloom · closed", detail: `${Math.round(ctx.coffeeG * 2.5)} g at ${temp}. 40 s.` },
      { at: "0:40", title: "First pour · closed", detail: `Still sealed. Pour to ${first} g (~60%). Steep until 1:20.` },
      { at: "1:20", title: "Open + last", detail: `Flip the switch open. Pour the rest to ${w} g.` },
      { at: t, title: "Drawdown", detail: `Bed should empty by ${t}.${stall}` },
    ];
  }
  if (mode === "double") {
    const first = Math.round(w * (100 / 220));
    return [
      { at: "Prep", title: "Closed", detail: "Wibawa WBrC 2024: two immersions, drain between. He used 86 °C then 92 °C." },
      { at: "0:00", title: "First · closed", detail: `${first} g at ${temp} (or ~86 °C if you have two kettles). 40 s.` },
      { at: "0:40", title: "Drain", detail: "Open. It should empty in a few seconds." },
      { at: "0:45", title: "Second · closed", detail: `Close again. Pour the rest to ${w} g (he uses ~92 °C).` },
      { at: "1:50", title: "Drain", detail: `Open at ~1:05–1:50. Swirl the cup. Total around ${t}.${stall}` },
    ];
  }
  return [
    { at: "Prep", title: "Closed", detail: "Hoffmann daily driver. Valve down the whole steep." },
    { at: "0:00", title: "Bloom · closed", detail: `${Math.round(ctx.coffeeG * 2.5)} g, swirl.` },
    { at: "0:30", title: "Fill · closed", detail: `Pour the rest quickly to ${w} g at ${temp}. Keep a crust.` },
    { at: "2:00", title: "Stir", detail: "Spoon both directions. Wait ~15 s." },
    { at: "2:15", title: "Open", detail: `Flip the switch. Drain ~30–45 s. Total around ${t}.` },
  ];
}

function v60Steps(ctx: StepCtx, bloom: number, pour60: number, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  const mode = ctx.technique ?? "hoffmann";
  if (mode === "kasuya-acid" || mode === "kasuya-sweet") {
    const first40 = Math.round(w * 0.4);
    const pour1 = Math.round(first40 * (mode === "kasuya-acid" ? 0.58 : 0.42));
    const pour2 = first40 - pour1;
    const later = Math.round((w - first40) / 3);
    return [
      { at: "Prep", title: "Rinse", detail: "Kasuya 4:6 (WBrC 2016). First 40% sets acid vs sweet; last 60% sets strength." },
      { at: "0:00", title: mode === "kasuya-acid" ? "Pour 1 · acid" : "Pour 1 · sweet", detail: `${pour1} g at ${temp}. Larger first pour = more acidity; smaller = more sweetness.` },
      { at: "0:45", title: "Pour 2", detail: `${pour2} g, to ${first40} g (40%).` },
      { at: "1:30", title: "Pours 3–5", detail: `Three equal pours of ~${later} g at 1:30, 2:15, 2:45. Total ${w} g.` },
      { at: "3:30", title: "Lift", detail: `Remove the dripper around ${t}.${stall}` },
    ];
  }
  if (mode === "chad") {
    return [
      { at: "Prep", title: "Cool cone", detail: "Chad Wang WBrC 2017: he skipped pre-warming. Rinse the paper, dump, let the cone sit a moment." },
      { at: "0:00", title: "Bloom", detail: `${bloom} g. 30 s.` },
      { at: "0:30", title: "Centre pour", detail: `One continuous pour in the centre to ${w} g. No spirals, no circles.` },
      { at: t, title: "Drawdown", detail: `Done around ${t} (he was ~2:00). Clear, tea-like.${stall}` },
    ];
  }
  if (mode === "rao") {
    const first = Math.round(ctx.coffeeG * 3);
    const mid = Math.round(w * (200 / 330));
    return [
      { at: "Prep", title: "Plastic cone", detail: "Scott Rao. Plastic V60 holds heat. Rinse, dump, coffee in, make a small well." },
      { at: "0:00", title: "Bloom + spin", detail: `${first} g at ${temp}. Spin the dripper hard so the slurry is a whirlpool. 40 s.` },
      { at: "0:40", title: "Pour 1", detail: `Steady low pour to ${mid} g. One gentle spin to fill the ribs.` },
      { at: "1:30", title: "Pour 2", detail: `When ~70% has drained, pour to ${w} g. Another gentle spin. Drawdown ${t} (he aims 4:00–4:30).` },
    ];
  }
  if (mode === "hedrick") {
    const first = Math.round(ctx.coffeeG * 3);
    const second = first * 2;
    return [
      { at: "Prep", title: "No swirl", detail: "Lance Hedrick. Two blooms dump gas; swirling here only slows the filter." },
      { at: "0:00", title: "Bloom 1", detail: `${first} g at ${temp}, ~7 g/s. Do not swirl. 30 s.` },
      { at: "0:30", title: "Bloom 2", detail: `To ${second} g. More CO₂ leaves so the main pour will not channel.` },
      { at: "1:00", title: "Fast centre", detail: `Pour to ${w} g at ~10 g/s, small circles in the centre. Drawdown ${t} (2:00–2:30). A tiny swirl only if it finishes too fast.` },
    ];
  }
  if (mode === "iced") {
    const ice = ctx.bypassG ?? Math.round(w * 0.67);
    return [
      { at: "Prep", title: "Ice in the server", detail: `Hoffmann Japanese iced — not fridge cold brew. Rinse the paper over the sink so you do not warm the carafe. ${ice} g ice in the server.` },
      { at: "0:00", title: "Bloom", detail: `${bloom} g hot, 45 s. Grind a click finer than a hot V60.` },
      { at: "0:45", title: "Hot pour", detail: `Pour the rest to ${w} g at ${temp}. Stretch the brew toward ${t}.` },
      { at: t, title: "Melt + serve", detail: "Swirl the server until the ice is gone. Serve over fresh ice. Aromatics lock in as it hits the first ice." },
    ];
  }
  if (mode === "peng") {
    const cool = ctx.finishC ?? 80;
    return [
      { at: "Prep", title: "Two kettles", detail: "Peng WBrC 2025 (Solo, adapted to V60): hot front, cool last pour. If you have one kettle, cool it after the mid pour." },
      { at: "0:00", title: "Bloom · hot", detail: `${Math.round(w * (30 / 210))} g at ${temp} in gentle circles. 30 s.` },
      { at: "0:30", title: "Mid · hot", detail: `Pour to ${Math.round(w * (120 / 210))} g at ${temp}. This is structure and sweetness.` },
      { at: "1:10", title: "Last · cool", detail: `Pour the rest to ${w} g at ~${cool} °C (Melodrip if you have one). Calm bed, less late bitterness.` },
      { at: t, title: "Serve cooler", detail: `Drawdown ~${t}. Peng served around 50–65 °C — let it drop.${stall}` },
    ];
  }
  return [
    { at: "Prep", title: "Rinse", detail: "Rinse the paper, preheat the cone, dump the rinse water. Add coffee, shake flat." },
    { at: "0:00", title: "Bloom", detail: `Pour ${bloom} g (${ctx.gassy ? "3×, still degassing" : "2×"}), swirl until the bed is wet. Wait ${ctx.gassy ? "45–60" : "30–45"} s.` },
    { at: "0:45", title: "Main pour", detail: `Concentric circles to ${pour60} g (~60% of ${w} g) by ~1:15. ${temp}.` },
    { at: "1:15", title: "Finish pour", detail: `Pour the rest to ${w} g. Do not drown the walls.${stall}` },
    { at: "1:30", title: "Stir + swirl", detail: "Spoon N–S then E–W, then swirl to flatten. Drawdown by " + t + "." },
  ];
}

function aeroSteps(ctx: StepCtx, temp: string, t: string): BrewStep[] {
  const mode = ctx.technique ?? (ctx.bypassG ? "stanica" : "pop");
  const bypass = ctx.bypassG ?? 0;
  if (mode === "pop") {
    return [
      { at: "Prep", title: "Upright + temper", detail: `Némo Pop WAC 2025. Two papers (flow cap if you have one). Pour ${bypass} g of ~${ctx.finishC ?? 50} °C water into the carafe first — that is the temperate bypass.` },
      { at: "0:00", title: "Brew", detail: `${ctx.coffeeG} g in. Pour ${ctx.waterG} g at ${temp} (84 °C in the winning cup). Wet everything.` },
      { at: "0:25", title: "Stir", detail: "NSNS–WEWE, gentle." },
      { at: "0:50", title: "Press", detail: `Gentle ~20 s onto the tempered carafe. Total around ${t}. Sweet, defined, less bitter.` },
    ];
  }
  if (mode === "merikanto") {
    return [
      { at: "Prep", title: "Invert", detail: "Tuomas Merikanto WAC 2021. Two rinsed papers. Coarse. Temperate water, almost no agitation." },
      { at: "0:00", title: "Bloom", detail: `${Math.round(ctx.waterG * 0.25)} g at ${temp} (80 °C). Gentle 3-stir.` },
      { at: "0:15", title: "Fill", detail: `Pour to ${ctx.waterG} g at ${temp}. Another gentle 3-stir at 0:50.` },
      { at: "1:40", title: "Flip + press", detail: `Cap, flip, press ~20 s. Swirl to cool. No bypass — the 80 °C water is the recipe.` },
    ];
  }
  if (mode === "tay") {
    const extra = Math.max(1, Math.round(ctx.coffeeG * (2 / 18)));
    const firstDose = ctx.coffeeG - extra;
    const room = Math.round((bypass || 55) * 0.5);
    const hot = (bypass || 55) - room;
    return [
      { at: "Prep", title: "Invert", detail: `Tay Wipvasutt WAC 2023. Start with ${firstDose} g in the chamber (he uses 16 of 18 g). One rinsed paper.` },
      { at: "0:00", title: "Pour", detail: `${ctx.waterG} g at ${temp} (89 °C).` },
      { at: "0:30", title: "Stir", detail: "One side of a chopstick, 5 s." },
      { at: "0:45", title: "Charge", detail: `Add the remaining ${extra} g dry coffee. Stir 5 s at 0:55.` },
      { at: "1:35", title: "Flip + press", detail: `Cap, flip, press ~30 s (~75 g concentrate).` },
      { at: "2:05", title: "Split bypass", detail: `Room-temp water ~${room} g, then hot ~${hot} g. Taste and stop.` },
    ];
  }
  if (mode === "wendelien") {
    return [
      { at: "Prep", title: "Invert", detail: "Wendelien van Bunnik WAC 2019. Fast concentrate. Aesir or two papers, rinsed." },
      { at: "0:00", title: "Pour + stir", detail: `${ctx.waterG} g at ${temp} in 10 s. Stir firmly 20 times.` },
      { at: "0:40", title: "Flip + press", detail: "Cap, purge air, flip, press everything out. You want a short, thick concentrate." },
      { at: "1:00", title: "Bypass + cool", detail: `Add ${bypass} g water. Cool the cup toward 60 °C. Acid and sweet together.` },
    ];
  }
  return [
    { at: "Prep", title: "Invert", detail: "George Stanica WAC 2024. Inverted, around the 4th mark. One rinsed paper. Melodrip if you have one." },
    { at: "0:00", title: "Bloom", detail: `${ctx.coffeeG} g in. Pour ~${Math.round(ctx.waterG / 2)} g at ${temp}. 30 s.` },
    { at: "0:30", title: "Fill + stir", detail: `Pour to ${ctx.waterG} g. NSEW stir 10 s.` },
    { at: "1:20", title: "Cap", detail: "Cap on, purge air. At 1:35 flip onto the server." },
    { at: "1:35", title: "Press + bypass", detail: `Gentle 30–40 s press. Dilute with ${bypass} g water to ${ctx.coffeeG + ctx.waterG + bypass} g in the cup.` },
  ];
}

function frenchSteps(ctx: StepCtx, temp: string): BrewStep[] {
  const classic = ctx.technique === "classic" || ctx.roastStyle === "dark";
  return [
    { at: "Prep", title: "Preheat", detail: "Warm the pot, dump. Coffee in — Hoffmann grind is medium, not boulders." },
    { at: "0:00", title: "Pour", detail: `All ${ctx.waterG} g at ${temp}. Stir so there are no dry pockets.` },
    { at: "4:00", title: "Break + skim", detail: "Spoon through the crust, scoop foam and floating grounds." },
    classic
      ? { at: "4:00", title: "Plunge to surface", detail: "Plunge gently to the surface and pour. More body, more silt. Do not mash the bed." }
      : { at: "9:00–10:00", title: "Settle, then plunge to surface", detail: "Wait ~5 more minutes. Plunge only to the liquid surface, pour slowly, leave the silt." },
  ];
}

function kalitaSteps(ctx: StepCtx, bloom: number, temp: string, t: string, stall: string): BrewStep[] {
  if (ctx.technique === "mccarthy") {
    return [
      { at: "Prep", title: "Rinse", detail: "James McCarthy WBrC 2013. Wave filter seated. He used a high-flow kettle for the bloom, then restricted flow." },
      { at: "0:00", title: "Bloom", detail: `${bloom} g at ${temp}. 45 s.` },
      { at: "0:45", title: "Column", detail: `Pour slowly to ${ctx.waterG} g. Keep a water column on the bed — that column absorbs agitation so you get sweetness, not bitterness.` },
      { at: t, title: "Drawdown", detail: `Around ${t} (he was ~3:30).${stall}` },
    ];
  }
  return [
    { at: "Prep", title: "Rinse", detail: "Rinse the Wave filter so it seats in the ridges. Dump rinse water, add coffee." },
    { at: "0:00", title: "Bloom", detail: `Pour ${bloom} g in the centre, swirl. Wait 45 s.` },
    { at: "0:45", title: "Pulses", detail: `Centre pulses of ~50 g to ${ctx.waterG} g. Keep a flat bed — no V60 spiral.` },
    { at: t, title: "Drawdown", detail: `Target ${t}. Flat bottoms stall less than a V60; still grind coarser if it chokes.${stall}` },
  ];
}

function origamiSteps(ctx: StepCtx, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  if (ctx.technique === "du") {
    return [
      { at: "Prep", title: "Rinse", detail: "Jia-Ning Du WBrC 2019. No separate bloom — start pouring at 0:00." },
      { at: "0:00", title: "Pour 1", detail: `${Math.round(w * (60 / 240))} g at ${temp}, spiral.` },
      { at: "0:18", title: "Pour 2", detail: `To ${Math.round(w * (140 / 240))} g.` },
      { at: "0:56", title: "Pour 3", detail: `To ${w} g. Drawdown around ${t} (she was ~1:46). Vivid acid, floral.${stall}` },
    ];
  }
  return [
    { at: "Prep", title: "Rinse", detail: "Conical paper in the Origami. Rinse, dump, add coffee, level." },
    { at: "0:00", title: "Pulse 1", detail: `Pour ${Math.round(w / 5)} g. Medina WBrC 2023 used five equal pulses, 30 s apart, ${temp}.` },
    { at: "0:30", title: "Pulses 2–5", detail: `Every 30 s, another ${Math.round(w / 5)} g, spiral out and in, to ${w} g.` },
    { at: t, title: "Drawdown", detail: `Quiet 30 s after the last pulse. Done around ${t}.` },
  ];
}

function oreaSteps(ctx: StepCtx, temp: string, t: string, stall: string): BrewStep[] {
  const w = ctx.waterG;
  if (ctx.technique === "hsu") {
    const pulse = Math.round(w / 4);
    const cool = ctx.startC ?? 70;
    return [
      { at: "Prep", title: "Two kettles", detail: "Shih Yuan Hsu WBrC 2022. Cool first pour tames fermented fruit; hot pulses build sweetness." },
      { at: "0:00", title: "Pour 1 · cool", detail: `${pulse} g at ~${cool} °C.` },
      { at: "0:30", title: "Pours 2–4 · hot", detail: `Three more ${pulse} g pulses at ${temp} (95 °C), 30 s apart, to ${w} g.` },
      { at: t, title: "Drawdown", detail: `Around ${t}.${stall}` },
    ];
  }
  return [
    { at: "Prep", title: "Rinse", detail: "Flat OREA bed, paper seated. Level the coffee. Wölfl WBrC 2024 used a fast base and a Melodrip." },
    { at: "0:00", title: "Bloom", detail: `Pour ${Math.round(w * (60 / 270))} g. Wait ~40 s.` },
    { at: "0:40", title: "Second", detail: `Top up to ${Math.round(w * (120 / 270))} g.` },
    { at: "1:20", title: "Third", detail: `Top up to ${Math.round(w * (170 / 270))} g.` },
    { at: "2:00", title: "Finish", detail: `Pour the rest to ${w} g. Drawdown around ${t}. Fast beds stall less than a V60.${stall}` },
  ];
}

function cleverSteps(ctx: StepCtx, temp: string, t: string): BrewStep[] {
  if (ctx.technique === "gina") {
    const cool = ctx.startC ?? 80;
    const w = ctx.waterG;
    return [
      { at: "Prep", title: "Seated", detail: "Fukahori WBrC 2018 (GINA → Clever). Two kettles if you can: 80 °C and 95 °C." },
      { at: "0:00", title: "Immerse · 80", detail: `On the counter. ${Math.round(w * (50 / 220))} g at ~${cool} °C. 45 s. Sweetness and fruit.` },
      { at: "0:45", title: "Drip · 95", detail: `Set on the cup (valve open). Pour to ${Math.round(w * (150 / 220))} g at ${temp}. Layers open.` },
      { at: "1:45", title: "Immerse · 80", detail: `Back on the counter. Fill to ${w} g at ~${ctx.finishC ?? 80} °C. 45 s. Juicy body.` },
      { at: "2:30", title: "Drain", detail: `On the cup again. Cut drips around ${t}.` },
    ];
  }
  const short = ctx.technique === "short";
  return [
    { at: "Prep", title: "Seated", detail: "Filter in, rinse, sit the Clever on the counter (valve closed by its own weight)." },
    { at: "0:00", title: "Fill", detail: `Coffee in, pour all ${ctx.waterG} g at ${temp}, stir to wet.` },
    { at: short ? "1:00" : "2:00", title: "Stir", detail: short ? "Short steep for a brighter cup. Break the crust." : "Break the crust, wait 15 s." },
    { at: short ? "1:15" : "2:15", title: "Drain", detail: `Set the Clever on the cup to open the valve. Drain by ${t}.` },
  ];
}

function espressoSteps(ctx: StepCtx, temp: string): BrewStep[] {
  const mode = ctx.technique ?? "adaptive-light";
  const yieldG = ctx.waterG;
  const ratio = formatRatio(ctx.waterG / ctx.coffeeG);
  const fc =
    "Any PID + flow control (paddle, needle valve, dimmer, Decent, or Gaggiuino): set the group to the temperature, then drive flow and pressure by the times below.";
  const prep = `${ctx.coffeeG} g in a warmed basket. WDT, level, even tamp. PID ${temp}. ${fc}`;

  if (mode === "blooming") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} Aim ${ratio} (${yieldG} g). Total around ${Math.round(ctx.timeS)} s.` },
      { at: "0:00", title: "Fill · low flow", detail: "Open to ~2–4 ml/s until the puck is wet and pressure sits at 4–5 bar (usually 8–12 s). Do not jump to 9 bar." },
      { at: "0:12", title: "Bloom · pump off", detail: "Close the paddle / stop the pump. Hold ~30 s. A few drips are fine; a stream means grind finer." },
      { at: "0:42", title: "Ramp", detail: "Open slowly over ~6 s to 8–9 bar (or your machine’s 9 bar spring). First drops should be dark, not blonde." },
      { at: "0:50", title: "Decline", detail: `Ease flow so pressure falls toward 6 bar as the cup fills. Cut at ${yieldG} g. Pour-over flavours, less sharp sour.` },
    ];
  }
  if (mode === "extractamundo") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} Paper in the bottom of a VST/IMS basket if you have one. Turbo: 15–20 s, ${ratio}.` },
      { at: "0:00", title: "Fast fill", detail: "Open wide — about 8 ml/s — until the gauge hits 4.5 bar. Usually 3–5 s." },
      { at: "0:05", title: "Soak", detail: "Drop flow almost to zero. Hold until ~6 g is in the cup (a few seconds). Puck should be fully wet." },
      { at: "0:08", title: "Flow-capped extract", detail: "Set ~3 ml/s and do not let pressure go past 6 bar. If it wants 9 bar, open the paddle more or grind coarser." },
      { at: "0:18", title: "Cut", detail: `Stop at ${yieldG} g. High extraction, low bitterness. If it gushes, grind finer; if it stalls at 6 bar with no flow, grind coarser.` },
    ];
  }
  if (mode === "lhl") {
    const mid = Math.round(yieldG * 0.83);
    return [
      { at: "Prep", title: "Setup", detail: `${prep} Scales on the drip tray. ${ctx.coffeeG} g → ${yieldG} g (${ratio}).` },
      { at: "0:00", title: "Low", detail: "Gentle fill ~2–3 ml/s to wet the puck. Pressure 2–3 bar. ~4 s." },
      { at: "0:04", title: "High", detail: `Open to 5–7 bar and 5–8 g/s until the cup hits ~${mid} g (about 83% of the target). This is the fast, high-ratio middle.` },
      { at: "0:16", title: "Low again", detail: `Restrict back to 2–3 bar / slow flow and finish to ${yieldG} g. Total ~${Math.round(ctx.timeS)} s.` },
      { at: "Taste", title: "Dial", detail: "Harsh → more middle flow or a touch coarser. Hollow → grind finer or hold the high phase a second longer." },
    ];
  }
  if (mode === "londinium") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} Lever copy: fast flood, 3 bar soak, rise, decline. ${ratio}, ~${Math.round(ctx.timeS)} s.` },
      { at: "0:00", title: "Fast fill", detail: "Open wide for 2–4 s to flood the headspace. Then close down to hold 3 bar (2–4 bar is the band)." },
      { at: "Soak", title: "3 bar until drips", detail: "Hold 3 bar until 4–8 g has dripped into the cup. Too many drips too fast → grind finer. No drips → grind coarser or wait." },
      { at: "Rise", title: "To ~8.5 bar", detail: "Open over ~6 s toward 8–9 bar. Cap flow around 1.7–2.2 ml/s so it cannot gush." },
      { at: "Decline", title: "Spring", detail: `As the puck opens, ease the paddle so pressure falls toward 6 bar. Cut at ${yieldG} g. Syrupy body.` },
    ];
  }
  if (mode === "adaptive-dark") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} Dark wants cooler water and a slower tail. ${ratio}, ~${Math.round(ctx.timeS)} s.` },
      { at: "0:00", title: "Fill", detail: "Moderate fill ~3–4 ml/s until the puck is wet (5–8 s)." },
      { at: "0:08", title: "Hold", detail: "Hold 7–8 bar for ~8 s. Higher hold than the Light adaptive — this is the creamy body." },
      { at: "0:16", title: "Slow tail", detail: `Restrict to ~1–1.5 ml/s and let pressure sag toward 5–6 bar. Cut at ${yieldG} g.` },
      { at: "Taste", title: "Dial", detail: "Bitter / ashy → cooler or shorter hold. Thin → finer grind or 1 s more on the hold." },
    ];
  }
  if (mode === "stock") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} No profile tricks: full pump, you cut the shot. ${ratio}.` },
      { at: "0:00", title: "Preinfusion (optional)", detail: "If the machine has a line-pressure or paddle preinfusion, 3–5 s at 2–3 bar, then open fully." },
      { at: "0:05", title: "9 bar", detail: `Open the paddle all the way. Hold ~9 bar (the spring / OPV ceiling). Do not chase 9 bar if the puck only makes 8.` },
      { at: "0:27", title: "Cut", detail: `Stop at ${yieldG} g or ~${Math.round(ctx.timeS)} s. Blonde early → grind finer. Drips at 30 s → grind coarser.` },
    ];
  }
  if (mode === "filter") {
    return [
      { at: "Prep", title: "Setup", detail: `${prep} 58 mm paper in the basket, rinse. Grind finer than filter, coarser than espresso. Light tamp or none. Puck screen on top.` },
      { at: "0:00", title: "Gentle fill", detail: "2–3 ml/s until the bed is wet. Pressure should stay under 3 bar." },
      { at: "0:15", title: "Low-pressure pull", detail: `Hold 2–4 bar, about 2–3 ml/s, to ${yieldG} g (~1:5). About ${Math.round(ctx.timeS)} s. If it hits 9 bar you are too fine.` },
      { at: "Dilute", title: "Cut with water", detail: `Add ${ctx.bypassG ?? 230} g water at ${temp} (or just-off-boil). This is a filter cup, not espresso.` },
    ];
  }
  return [
    { at: "Prep", title: "Setup", detail: `${prep} Adaptive Light: no pressurized soak. Sweetness and clarity over body. ${ratio}, ~${Math.round(ctx.timeS)} s.` },
    { at: "0:00", title: "Fast fill", detail: "Open to ~4 ml/s until the puck is wet (4–8 s). Pressure will climb, then you cut it." },
    { at: "0:08", title: "Decay soak", detail: "Close the paddle / stop the pump (0 bar soak). Let pressure fall on its own for ~8–10 s. This is what keeps Light from gushing." },
    { at: "0:18", title: "Rise 6 s", detail: "Open so pressure rises for exactly ~6 s, toward 8–8.5 bar. Note the flow at the end of those 6 s — that is your target flow for the rest." },
    { at: "0:24", title: "Descending tail", detail: `Hold that flow. Pressure should fall as the puck opens (8.5 → ~6 bar). Cap at 8.5 bar if it spikes. Cut at ${yieldG} g.` },
    { at: "Taste", title: "Dial", detail: "Sour → grind finer or a longer fill. Mute / bitter → grind coarser or a lower peak (7.5 bar)." },
  ];
}

function coldSteps(ctx: StepCtx, t: string): BrewStep[] {
  const concentrate = ctx.technique === "concentrate";
  return [
    { at: "Prep", title: "Jar", detail: `Coarser than espresso, finer than boulders. ${ctx.coffeeG} g in a jar or bottle.` },
    { at: "0:00", title: "Fill", detail: `Add ${ctx.waterG} g cold or room-temp water. Stir hard so there are no dry pockets. Lid on.` },
    { at: t, title: "Fridge", detail: `Steep in the fridge ${Math.round(ctx.timeS / 3600)} h. Do not leave it on the counter.` },
    {
      at: "Filter",
      title: concentrate ? "Decant + dilute" : "Decant",
      detail: concentrate
        ? "Paper-filter. This is a concentrate — cut with water or ice to taste (CCC starts around 1:8, then dilute toward a cup)."
        : "Pour off gently, or paper-filter. Serve cold. Dilute only if it tastes heavy.",
    },
  ];
}

function buildSteps(ctx: StepCtx): BrewStep[] {
  const bloom = Math.round(ctx.coffeeG * (ctx.gassy ? 3 : 2));
  const pour60 = Math.round(ctx.waterG * 0.6);
  const t = formatBrewTime(ctx.timeS);
  const temp = `${ctx.kettleC.toFixed(0)} °C`;
  const stall = ctx.natural ? " Naturals clog — pour gentler and stop if the bed dams." : "";

  switch (ctx.method) {
    case "v60":
      return v60Steps(ctx, bloom, pour60, temp, t, stall);
    case "kalita":
      return kalitaSteps(ctx, bloom, temp, t, stall);
    case "origami":
      return origamiSteps(ctx, temp, t, stall);
    case "chemex":
      return [
        { at: "Prep", title: "Rinse well", detail: "3-ply toward the spout. Rinse thoroughly — Chemex paper tastes if you skip this. Dump." },
        { at: "0:00", title: "Bloom", detail: `${Math.max(60, bloom)} g, stir at 0:10 so the bed is wet. Wait until 0:45.` },
        { at: "0:45", title: "To 60%", detail: `Circles to ${pour60} g.` },
        { at: "1:15", title: "To total", detail: `Pour to ${ctx.waterG} g.` },
        { at: "1:45", title: "Stir + shake", detail: `Clockwise then counter-clockwise, gentle shake. Drawdown ~${t} (Hoffmann Chemex ~4:10).` },
      ];
    case "switch":
      return switchSteps(ctx, bloom, temp, t, stall);
    case "clever":
      return cleverSteps(ctx, temp, t);
    case "aeropress":
      return aeroSteps(ctx, temp, t);
    case "frenchpress":
      return frenchSteps(ctx, temp);
    case "orea":
      return oreaSteps(ctx, temp, t, stall);
    case "coldbrew":
      return coldSteps(ctx, t);
    case "moka":
      return [
        { at: "Prep", title: "Hot fill", detail: `Fill the boiler with ${temp} water to the safety valve. Basket level-full (${ctx.coffeeG} g), no tamp.` },
        { at: "0:00", title: "Medium heat", detail: "Lid open so you can see the stream. Medium heat — not a race." },
        { at: "~1:00", title: "Blonde", detail: "When the coffee turns honey/blonde and starts to gurgle, take it off." },
        { at: "Stop", title: "Kill the brew", detail: "Wrap the base or run it under water so it does not keep extracting. Stir the top chamber." },
      ];
    case "espresso":
      return espressoSteps(ctx, temp);
    case "cupping":
      return [
        { at: "Prep", title: "SCA dose", detail: `${ctx.coffeeG} g per bowl, grind slightly coarser than paper filter. One bowl per lot.` },
        { at: "0:00", title: "Pour", detail: `${ctx.waterG} g at ${temp} (SCA 93 °C). Fill to cover. Do not stir yet.` },
        { at: "4:00", title: "Break", detail: "Break the crust with a spoon, smell, skim foam and grounds." },
        { at: "8:00–10:00", title: "Slurp", detail: "When cool enough, slurp. This is the reference cup, not a drink recipe." },
      ];
  }
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
): string {
  if (method === "espresso") return "Group / boiler — pressurized, not limited by kettle boil";
  if (method === "coldbrew") return "Fridge · cold or room-temp water, no kettle";
  if (method === "moka") {
    if (boilC == null) return `Fill the boiler with ~${wantedC.toFixed(0)} °C water to the valve`;
    if (capped) return `Fill with a rolling boil (${boilC.toFixed(1)} °C) to the valve`;
    return `Fill the boiler with ${kettleC.toFixed(0)} °C water to the valve`;
  }
  if (boilC == null) return `${wantedC.toFixed(0)} °C sea-level target · set altitude to cap at boil`;
  if (capped) return `Rolling boil · local ceiling ${boilC.toFixed(1)} °C (wanted ${wantedC.toFixed(0)} °C)`;
  if (wantedC >= boilC - 1.2) return `Pour at a rolling boil (${boilC.toFixed(1)} °C)`;
  return `${kettleC.toFixed(0)} °C · just off a ${boilC.toFixed(1)} °C boil`;
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
): { restLabel: string; restWhy: string; restWarn?: string } {
  if (plan === "rtd") {
    if (days <= 3) {
      return {
        restLabel: `Day ${days} · RTD window`,
        restWhy: "RTD is built to drink on days 1–3. Flavour is front-loaded and usually fades after day 4.",
      };
    }
    return {
      restLabel: `Day ${days} · RTD past peak`,
      restWhy: "This roast was planned as Ready-to-Drink. Past day 3 the cup is often hollow.",
      restWarn: "RTD flavour is usually gone by day 4. Rest would have been the better plan.",
    };
  }
  const w = restWindows(style);
  if (days <= 2) {
    return {
      restLabel: `Day ${days} · still degassing`,
      restWhy:
        "Nano Rest coffee is still very gassy (fluid-bed CO₂ leaves slower than drum). Bloom 3× dose for 45–60 s, grind a step coarser if the bed domes.",
      restWarn: days <= 1 ? "Very gassy. Bloom thoroughly or wait another day if the bed domes." : undefined,
    };
  }
  if (days <= w.gas) {
    return {
      restLabel: `Day ${days} · still blooming · good`,
      restWhy:
        "KL Rest’s 3–5 day mark is the start of the window, not the end. Air-roasted light filter often holds CO₂ through day 10–14 — a long bloom is normal, not a sign the bag is tired. Keep 3× / 45–60 s.",
    };
  }
  if (days <= w.good) {
    return {
      restLabel: `Day ${days} · still good`,
      restWhy: `Light Rest on a Nano is typically fine through about day ${w.good}. Bloom can shorten toward 2× as the foam calms. No need for a new bag.`,
    };
  }
  if (days <= w.aging) {
    return {
      restLabel: `Day ${days} · aging`,
      restWhy:
        "Past the main window. Less CO₂ means a faster drawdown — bloom 2×, and go a click finer if the bed races. Freeze what you will not drink this week.",
    };
  }
  return {
    restLabel: `Day ${days} · fading`,
    restWhy: "Aromatics are usually thinning. Freeze the rest rather than forcing a “fresher bag” story at two weeks.",
    restWarn: "Past the useful window. Freeze leftover beans.",
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

function prettyGrind(grind: Grind): string {
  return grind.replace("-", " ");
}

function formatRatio(ratio: number): string {
  const rounded = round1(ratio);
  return Number.isInteger(rounded) ? `1:${rounded}` : `1:${rounded.toFixed(1)}`;
}

function timeCopy(method: BrewMethod, sec: number): string {
  if (method === "espresso") return `${Math.round(sec)} s`;
  if (method === "moka") return `~${formatBrewTime(sec)} to blonde`;
  if (method === "coldbrew") return `${Math.round(sec / 3600)} h fridge`;
  return formatBrewTime(sec);
}

function niceDose(n: number): number {
  return Number.isInteger(n) ? n : Math.round(n * 4) / 4;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function attachKeyOf(attach: BrewAttach): string {
  if (attach.kind === "library") return `library:${attach.id}`;
  if (attach.kind === "kpro") return `kpro:${attach.snapshot.label}`;
  return attach.kind;
}
