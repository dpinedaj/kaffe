import { inferredDensityClass, type DrinkPlan, type RoastIntent } from "./generate";
import {
  FLAVORS,
  STYLES,
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
  | "moccamaster"
  | "moka"
  | "espresso"
  | "cupping";

export type Grind = "coarse" | "medium-coarse" | "medium" | "medium-fine" | "fine";
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
  steps: BrewStep[];
  why: string[];
  sources: string[];
  warnings: string[];
}

export interface BrewMethodInfo {
  id: BrewMethod;
  name: string;
  family: "pour" | "immersion" | "hybrid" | "pressure" | "batch" | "cupping";
  blurb: string;
}

const KITCHEN_KEY = "kaffe.brew.kitchenAltitudeM";
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
    varietyName: variety.id !== "unknown" ? variety.name : undefined,
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
  moccamaster: {
    light: { ratio: 16.7, wantedC: 96, timeS: 360, grind: "medium", doseG: 30 },
    medium: { ratio: 16.7, wantedC: 93, timeS: 360, grind: "medium", doseG: 30 },
    dark: { ratio: 17, wantedC: 90, timeS: 330, grind: "medium-coarse", doseG: 30 },
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
  { id: "v60", name: "V60", family: "pour", blurb: "Cone pour-over. Hoffmann Ultimate skeleton; WBrC ratios transfer even when winners use Origami/OREA." },
  { id: "kalita", name: "Kalita Wave", family: "pour", blurb: "Flat-bottom pulse pour. More forgiving bed than a V60; common in cafés and older WBrC routines." },
  { id: "origami", name: "Origami", family: "pour", blurb: "Faceted cone. Medina WBrC 2023: five equal 50 g pulses at 91 °C, 1:16." },
  { id: "chemex", name: "Chemex", family: "pour", blurb: "Bonded thick paper. Hoffmann V60 adaptation at 30 g : 500 g, ~4:10. Cleaner, slower than a V60." },
  { id: "switch", name: "Hario Switch", family: "hybrid", blurb: "Hoffmann daily driver: steep ~2:00, stir, open. Immersion then V60 drain." },
  { id: "clever", name: "Clever", family: "hybrid", blurb: "Immersion in the cone, drain onto the cup. Same idea as the Switch, no valve to fiddle." },
  { id: "aeropress", name: "AeroPress", family: "hybrid", blurb: "Light: WAC 2024 inverted concentrate + bypass. Medium/dark: upright, shorter, cooler." },
  { id: "frenchpress", name: "French press", family: "immersion", blurb: "Hoffmann Ultimate: 30 g : 500 g, break crust at 4:00, settle, plunge only to the surface." },
  { id: "moccamaster", name: "Moccamaster", family: "batch", blurb: "SCA-certified auto drip. 60 g/L, medium grind, swirl the slurry once. Machine sets the shower." },
  { id: "moka", name: "Moka", family: "pressure", blurb: "Fill boiler with hot water to the valve, basket level, off at first blonde. Not espresso." },
  { id: "espresso", name: "Espresso", family: "pressure", blurb: "WBC Light cluster ~1:2–1:2.5, 90–94 °C group. Pressurized — not capped by kettle boil." },
  { id: "cupping", name: "Cupping", family: "cupping", blurb: "SCA protocol 8.25 g / 150 g at 93 °C, 4 min, break and skim. The academic reference cup." },
];

const METHOD_NAME = Object.fromEntries(BREW_METHODS.map((m) => [m.id, m.name])) as Record<BrewMethod, string>;

export function recommendBrew(query: BrewQuery): BrewRecipe {
  const info = BREW_METHODS.find((m) => m.id === query.method) ?? BREW_METHODS[0];
  const base = { ...BASE[query.method][query.roastStyle] };
  const flavors = query.flavors ?? [];
  const acid = flavors.some((id) => ACID.includes(id));
  const heavy = flavors.some((id) => HEAVY.includes(id));
  const gassy = stillBlooming(query.drinkPlan, query.daysSinceRoast, query.roastStyle);
  const openKettle = query.method !== "espresso";
  const userDose = query.coffeeG != null && Number.isFinite(query.coffeeG);
  const userRatio = query.ratio != null && Number.isFinite(query.ratio);

  let wantedC = base.wantedC;
  if (acid && openKettle) wantedC = Math.min(100, wantedC + 1);
  if (heavy && openKettle) wantedC = Math.max(85, wantedC - 2);

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

  const cardCup = base.bypassRatio != null ? base.ratio + base.bypassRatio : base.ratio;
  let cupRatio = userRatio ? clampRatio(query.ratio as number, query.method) : cardCup;
  if (!userRatio && openKettle && deficit >= 5 && query.method !== "espresso") {
    cupRatio = Math.max(query.method === "moka" ? 7 : 13, round1(cupRatio * 0.93));
  }

  const coffeeG = userDose ? clampDose(query.coffeeG as number) : niceDose(base.doseG);
  let waterG: number;
  let bypassG: number | undefined;
  if (base.bypassRatio != null) {
    const brewFrac = base.ratio / (base.ratio + base.bypassRatio);
    waterG = Math.round(coffeeG * cupRatio * brewFrac);
    bypassG = Math.round(coffeeG * cupRatio * (1 - brewFrac));
  } else {
    waterG = Math.round(coffeeG * cupRatio);
  }
  const cupG = waterG + (bypassG ?? 0);

  if (info.family === "pour" || info.family === "batch") {
    timeS = Math.round(timeS * Math.pow(coffeeG / base.doseG, 0.4));
  }

  let grindShift = stepsN >= 0.5 ? Math.min(2, Math.round(stepsN)) : 0;
  if (acid) grindShift += 1;
  if (heavy) grindShift -= 1;
  if (query.densityClass === "hard" || query.beanSize === "small") grindShift += 1;
  if (query.densityClass === "soft" || query.beanSize === "large") grindShift -= 1;
  if (query.process === "natural" && query.method !== "espresso") grindShift -= 1;
  if (gassy) grindShift -= 1;
  const pourLike =
    info.family === "pour" || info.family === "batch" || query.method === "espresso" || query.method === "moka";
  if (pourLike) {
    const doseRel = coffeeG / base.doseG;
    if (doseRel >= 1.45) grindShift -= 1;
    else if (doseRel <= 0.7) grindShift += 1;
    if (cupRatio <= cardCup - 1.2) grindShift += 1;
    if (cupRatio >= cardCup + 1.2) grindShift -= 1;
  }
  const grind = shiftFiner(base.grind, grindShift);
  const grindNote =
    grind !== base.grind
      ? `${prettyGrind(grind)} · shifted from ${prettyGrind(base.grind)} for this roast / altitude / rest`
      : prettyGrind(grind);

  const kettleNote = kettleCopy(query.method, kettleC, boilC, cappedByBoil, wantedC);
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
}

function buildSteps(ctx: StepCtx): BrewStep[] {
  const bloom = Math.round(ctx.coffeeG * (ctx.gassy ? 3 : 2));
  const pour60 = Math.round(ctx.waterG * 0.6);
  const t = formatBrewTime(ctx.timeS);
  const temp = `${ctx.kettleC.toFixed(0)} °C`;
  const stall = ctx.natural ? " Naturals clog — pour gentler and stop if the bed dams." : "";

  switch (ctx.method) {
    case "v60":
      return [
        { at: "Prep", title: "Rinse", detail: "Rinse the paper, preheat the cone, dump the rinse water. Add coffee, shake flat." },
        { at: "0:00", title: "Bloom", detail: `Pour ${bloom} g (${ctx.gassy ? "3×, still degassing" : "2×"}), swirl until the bed is wet. Wait ${ctx.gassy ? "45–60" : "30–45"} s.` },
        { at: "0:45", title: "Main pour", detail: `Concentric circles to ${pour60} g (~60% of ${ctx.waterG} g) by ~1:15. ${temp}.` },
        { at: "1:15", title: "Finish pour", detail: `Pour the rest to ${ctx.waterG} g. Do not drown the walls.${stall}` },
        { at: "1:30", title: "Stir + swirl", detail: "Spoon N–S then E–W, then swirl to flatten. Drawdown by " + t + "." },
      ];
    case "kalita":
      return [
        { at: "Prep", title: "Rinse", detail: "Rinse the Wave filter so it seats in the ridges. Dump rinse water, add coffee." },
        { at: "0:00", title: "Bloom", detail: `Pour ${bloom} g in the centre, swirl. Wait 45 s.` },
        { at: "0:45", title: "Pulses", detail: `Centre pulses of ~50 g to ${ctx.waterG} g. Keep a flat bed — no V60 spiral.` },
        { at: t, title: "Drawdown", detail: `Target ${t}. Flat bottoms stall less than a V60; still grind coarser if it chokes.${stall}` },
      ];
    case "origami":
      return [
        { at: "Prep", title: "Rinse", detail: "Conical paper in the Origami. Rinse, dump, add coffee, level." },
        { at: "0:00", title: "Pulse 1", detail: `Pour ${Math.round(ctx.waterG / 5)} g. Medina WBrC 2023 used five equal pulses, 30 s apart, ${temp}.` },
        { at: "0:30", title: "Pulses 2–5", detail: `Every 30 s, another ${Math.round(ctx.waterG / 5)} g, spiral out and in, to ${ctx.waterG} g.` },
        { at: t, title: "Drawdown", detail: `Quiet 30 s after the last pulse. Done around ${t}.` },
      ];
    case "chemex":
      return [
        { at: "Prep", title: "Rinse well", detail: "3-ply toward the spout. Rinse thoroughly — Chemex paper tastes if you skip this. Dump." },
        { at: "0:00", title: "Bloom", detail: `${Math.max(60, bloom)} g, stir at 0:10 so the bed is wet. Wait until 0:45.` },
        { at: "0:45", title: "To 60%", detail: `Circles to ${pour60} g.` },
        { at: "1:15", title: "To total", detail: `Pour to ${ctx.waterG} g.` },
        { at: "1:45", title: "Stir + shake", detail: `Clockwise then counter-clockwise, gentle shake. Drawdown ~${t} (Hoffmann Chemex ~4:10).` },
      ];
    case "switch":
      return [
        { at: "Prep", title: "Closed", detail: "Switch down (sealed). Rinse paper, dump, add coffee, make a small well." },
        { at: "0:00", title: "Bloom", detail: `${Math.round(ctx.coffeeG * 2.5)} g, swirl. Hoffmann daily driver: 15 g : 250 g.` },
        { at: "0:30", title: "Fill", detail: `Pour the rest quickly to ${ctx.waterG} g at ${temp}. Keep a crust.` },
        { at: "2:00", title: "Stir", detail: "Spoon both directions. Wait ~15 s." },
        { at: "2:15", title: "Open", detail: `Flip the switch. Drain ~30–45 s. Total around ${t}.` },
      ];
    case "clever":
      return [
        { at: "Prep", title: "Seated", detail: "Filter in, rinse, sit the Clever on the counter (valve closed by its own weight)." },
        { at: "0:00", title: "Fill", detail: `Coffee in, pour all ${ctx.waterG} g at ${temp}, stir to wet.` },
        { at: "2:00", title: "Stir", detail: "Break the crust, wait 15 s." },
        { at: "2:15", title: "Drain", detail: `Set the Clever on the cup to open the valve. Drain by ${t}.` },
      ];
    case "aeropress":
      if (ctx.bypassG) {
        return [
          { at: "Prep", title: "Invert", detail: "Inverted, around the 4th mark. One rinsed paper in the cap. WAC 2024 (Stanica) skeleton." },
          { at: "0:00", title: "Bloom", detail: `${ctx.coffeeG} g in. Pour ~${Math.round(ctx.waterG / 2)} g at ${temp} (Melodrip if you have one). 30 s.` },
          { at: "0:30", title: "Fill + stir", detail: `Pour to ${ctx.waterG} g. NSEW stir 10 s.` },
          { at: "1:20", title: "Cap", detail: "Cap on, purge air. At 1:35 flip onto the server." },
          { at: "1:35", title: "Press + bypass", detail: `Gentle 30–40 s press. Dilute with ${ctx.bypassG} g water to ${ctx.coffeeG + ctx.waterG + ctx.bypassG} g in the cup.` },
        ];
      }
      return [
        { at: "Prep", title: "Upright", detail: "Paper in the cap, rinse, AeroPress on the cup. Coffee in." },
        { at: "0:00", title: "Pour", detail: `All ${ctx.waterG} g at ${temp}. Wet the bed.` },
        { at: "0:25", title: "Stir", detail: "NSEW stir. WAC 2025 (Pop) was upright and cooler — this is the daily version." },
        { at: "0:50", title: "Press", detail: `Gentle ~20 s press. Total around ${t}.` },
      ];
    case "frenchpress":
      return [
        { at: "Prep", title: "Preheat", detail: "Warm the pot, dump. Coffee in — Hoffmann grind is medium, not boulders." },
        { at: "0:00", title: "Pour", detail: `All ${ctx.waterG} g at ${temp}. Stir so there are no dry pockets.` },
        { at: "4:00", title: "Break + skim", detail: "Spoon through the crust, scoop foam and floating grounds." },
        {
          at: ctx.roastStyle === "dark" ? "4:00" : "9:00–10:00",
          title: ctx.roastStyle === "dark" ? "Plunge to surface" : "Settle, then plunge to surface",
          detail:
            ctx.roastStyle === "dark"
              ? "Dark: plunge gently to the surface after the skim and pour. Do not mash the bed."
              : "Wait ~5 more minutes. Plunge only to the liquid surface, pour slowly, leave the silt.",
        },
      ];
    case "moccamaster":
      return [
        { at: "Prep", title: "Basket", detail: "Paper filter, rinse, medium grind. 60 g/L is the SCA Golden Cup starting point." },
        { at: "0:00", title: "Start", detail: `Water in the reservoir to ${ctx.waterG} g worth. Coffee ${ctx.coffeeG} g in the basket. Brew.` },
        { at: "0:30", title: "Swirl", detail: "Once the slurry is wet, one swirl so the bed is even. Then leave it." },
        { at: t, title: "Done", detail: `Carafe off the hot plate when the brew finishes (~${t}). Do not park it there.` },
      ];
    case "moka":
      return [
        { at: "Prep", title: "Hot fill", detail: `Fill the boiler with ${temp} water to the safety valve. Basket level-full (${ctx.coffeeG} g), no tamp.` },
        { at: "0:00", title: "Medium heat", detail: "Lid open so you can see the stream. Medium heat — not a race." },
        { at: "~1:00", title: "Blonde", detail: "When the coffee turns honey/blonde and starts to gurgle, take it off." },
        { at: "Stop", title: "Kill the brew", detail: "Wrap the base or run it under water so it does not keep extracting. Stir the top chamber." },
      ];
    case "espresso":
      return [
        { at: "Prep", title: "Dose + prep", detail: `${ctx.coffeeG} g in a warmed basket. WDT or tap, even tamp. Group at ${temp}.` },
        { at: "0:00", title: "Shot", detail: `9 bar. Stop at ${ctx.waterG} g in the cup (${formatRatio(ctx.waterG / ctx.coffeeG)}), about ${Math.round(ctx.timeS)} s.` },
        { at: "Taste", title: "Adjust", detail: "Sour/short → finer or longer. Bitter/harsh → coarser or cooler. Altitude does not cap the group." },
      ];
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
  if (method === "origami" || (style === "light" && (method === "v60" || method === "kalita"))) {
    out.push("WBrC 2023–26 — Light filter ~1:14–1:16, 91–96 °C (Medina Origami 2023; Wölfl OREA 2024; Peng 2025)");
  }
  if (method === "switch" || method === "clever" || method === "frenchpress") {
    out.push("Hoffmann Switch daily driver / Ultimate French Press; Liang et al. 2021 — immersion yield ~21% when time is free");
  }
  if (method === "aeropress") {
    out.push("WAC 2024 Stanica inverted 18 g / 100 g + bypass; WAC 2025 Pop upright 18 g / 100 g + 70 g bypass");
  }
  if (method === "moccamaster") out.push("SCA certified home brewer spec — 92 °C in the first minute, never above 96 °C");
  if (method === "moka") out.push("Hoffmann moka: hot fill to the valve, no tamp, off at first blonde");
  if (method === "espresso") out.push("WBC 2024–25 — Light espresso ~1:2–1:2.5, 90–94 °C group");
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
  if (method === "espresso") return Math.max(1.5, Math.min(3.5, round1(n)));
  if (method === "moka") return Math.max(6, Math.min(14, round1(n)));
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
