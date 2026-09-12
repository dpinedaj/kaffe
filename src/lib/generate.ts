import { expandCurve, formatClock, levelToTemp, mergePhasePins, rebuildFromAnchors, rorSeries, sampleAtTime, timeAtValue } from "./curve";
import {
  flavorById,
  originById,
  varietyById,
  STYLES,
  type BeanSize,
  type BrewId,
  type DensityClass,
  type FlavorId,
  type OriginInfo,
  type ProcessId,
  type RoastStyleId,
  type VarietyInfo,
} from "./knowledge";
import { encodeKpro, parseKpro, type BezierSegment, type CurveData, type KproProfile, type Point } from "./kpro";
import { BASELINE_KPRO } from "./template";

export interface FlavorPick {
  id: FlavorId;
  weight: number;
}

export type ZoneId = "zone1" | "zone2" | "zone3";
export const ZONE_IDS: ZoneId[] = ["zone1", "zone2", "zone3"];
export type ZoneRole = "drying" | "maillard" | "into-fc" | "after-fc";

export const ZONE_SLOT_META: Record<ZoneId, { title: string; defaultRole: ZoneRole }> = {
  zone1: { title: "Zone 1 · early", defaultRole: "drying" },
  zone2: { title: "Zone 2 · into crack", defaultRole: "into-fc" },
  zone3: { title: "Zone 3 · after crack", defaultRole: "after-fc" },
};

export const ZONE_ROLE_META: Record<ZoneRole, { label: string; hint: string }> = {
  drying: {
    label: "Drying stall",
    hint: "Endothermic water loss. Extra RoR so the front does not stall before yellow.",
  },
  maillard: {
    label: "Maillard / color change",
    hint: "Color-change dip. Hold RoR so sugars brown without baking.",
  },
  "into-fc": {
    label: "Into first crack",
    hint: "Moisture dump + endotherm. Short lift so design RoR does not crash into crack.",
  },
  "after-fc": {
    label: "After first crack",
    hint: "Bean goes exothermic. Negative boost tames a flick. Official KL notes are cautious — use only if the roast runs away.",
  },
};

export interface ZoneIntent {
  enabled: boolean;
  startS: number;
  endS: number;
  boost: number;
  kp: number;
  kd: number;
  role?: ZoneRole;
  reason?: string;
}

export type ZoneSet = Record<ZoneId, ZoneIntent>;
export type RoastFamily = "nordic" | "classic" | "slow";
/** When the cup is meant to be drunk. Rest = degas 3–5 days; RTD = drink 1–3 days. */
export type DrinkPlan = "rest" | "rtd";

export interface RoastIntent {
  originId: string;
  varietyId: string;
  process: ProcessId;
  altitudeM: number;
  moisture?: number;
  /** Settled bulk density (g/L). Ignored while autoDensity is on. */
  densityGL?: number;
  /** When true (default), density follows altitude. Turn off after a measured reading. */
  autoDensity?: boolean;
  /** Probe temperature for expect_fc. When omitted, estimated from bean + flavor. */
  expectFc?: number;
  /** When true (default), boost windows are inferred from bean, flavor, drink plan, and design RoR. */
  autoZones?: boolean;
  zones?: ZoneSet;
  /** Rest (default) peaks at 3–5 days. RTD is drinkable from day 1. */
  drinkPlan?: DrinkPlan;
  brew: BrewId;
  roastStyle: RoastStyleId;
  autoLevel: boolean;
  level: number;
  flavors: FlavorPick[];
  name?: string;
  /** When set, the roast curve is taken from these anchors and flavors are inferred. */
  manualAnchors?: Point[];
}

export interface Adjustment {
  fcTemp: number;
  preheatW: number;
  dryingS: number;
  midS: number;
  developmentS: number;
  fanRpm: number;
}

export interface AdjustmentBreakdown {
  origin: Adjustment;
  variety: Adjustment;
  moisture: Adjustment;
  density: Adjustment;
  flavor: Adjustment;
  total: Adjustment;
}

export interface GeneratedRoast {
  profile: KproProfile;
  kproText: string;
  breakdown: AdjustmentBreakdown;
  firstCrackTemp: number;
  autoFirstCrackTemp: number;
  firstCrackTime: number;
  densityClass: DensityClass;
  densitySource: "measured" | "altitude";
  resolvedDensityGL: number;
  zones: ZoneSet;
  totalTime: number;
  dtr: number;
  dryTime: number;
  mailTime: number;
  devTime: number;
  drySlope: number;
  mailSlope: number;
  devSlope: number;
  preheatPower: number;
  roastPoly: Point[];
  rorPoly: Point[];
  fanPoly: Point[];
  curveName: string;
  inferredFlavors: FlavorPick[];
  manual: boolean;
  family: RoastFamily;
}

const ZERO: Adjustment = {
  fcTemp: 0,
  preheatW: 0,
  dryingS: 0,
  midS: 0,
  developmentS: 0,
  fanRpm: 0,
};

function add(a: Adjustment, b: Adjustment): Adjustment {
  return {
    fcTemp: a.fcTemp + b.fcTemp,
    preheatW: a.preheatW + b.preheatW,
    dryingS: a.dryingS + b.dryingS,
    midS: a.midS + b.midS,
    developmentS: a.developmentS + b.developmentS,
    fanRpm: a.fanRpm + b.fanRpm,
  };
}

function scale(a: Adjustment, w: number): Adjustment {
  return {
    fcTemp: a.fcTemp * w,
    preheatW: a.preheatW * w,
    dryingS: a.dryingS * w,
    midS: a.midS * w,
    developmentS: a.developmentS * w,
    fanRpm: a.fanRpm * w,
  };
}

export const FLAVOR_DELTA: Record<FlavorId, Adjustment> = {
  fruity: { fcTemp: -1, preheatW: 18, dryingS: -4, midS: -8, developmentS: -18, fanRpm: 80 },
  lightSweet: { fcTemp: 0, preheatW: 8, dryingS: -2, midS: 4, developmentS: -6, fanRpm: 0 },
  deepSweet: { fcTemp: 1, preheatW: -6, dryingS: 4, midS: 12, developmentS: 10, fanRpm: -100 },
  bright: { fcTemp: -1.5, preheatW: 16, dryingS: -6, midS: -6, developmentS: -14, fanRpm: 120 },
  juicy: { fcTemp: -0.5, preheatW: 10, dryingS: -2, midS: 2, developmentS: -8, fanRpm: 40 },
  winey: { fcTemp: 0, preheatW: 4, dryingS: 8, midS: 4, developmentS: -6, fanRpm: 0 },
  floral: { fcTemp: -2, preheatW: 12, dryingS: -3, midS: -10, developmentS: -16, fanRpm: 80 },
  body: { fcTemp: 1.5, preheatW: -4, dryingS: 6, midS: 10, developmentS: 14, fanRpm: -180 },
  clean: { fcTemp: 0, preheatW: 6, dryingS: 0, midS: -2, developmentS: -4, fanRpm: 40 },
  balance: { fcTemp: 0, preheatW: 2, dryingS: 0, midS: 0, developmentS: 0, fanRpm: 0 },
};

/** Hard-bean charge: more energy, longer dry, modest extra air. Matches origin.density === "hard". */
export const HARD_DENSITY_ADJ: Adjustment = {
  fcTemp: -1,
  preheatW: 10,
  dryingS: 3,
  midS: -5,
  developmentS: 0,
  fanRpm: 50,
};

/** Soft-bean charge: gentler front, more fan so the porous surface does not scorch. */
export const SOFT_DENSITY_ADJ: Adjustment = {
  fcTemp: 0,
  preheatW: -20,
  dryingS: -8,
  midS: 0,
  developmentS: 0,
  fanRpm: 200,
};

/** Typical settled bulk density for mid-altitude washed Arabica (g/L ≈ kg/m³). */
export const REFERENCE_DENSITY_GL = 680;
export const DENSITY_SOFT_GL = 620;
export const DENSITY_HARD_GL = 740;

export function classifyDensity(gPerL: number): DensityClass {
  if (gPerL < 650) return "soft";
  if (gPerL >= 710) return "hard";
  return "medium";
}

export function inferredDensityClass(origin: OriginInfo, altitudeM: number): DensityClass {
  if (origin.density !== "medium") return origin.density;
  if (altitudeM >= 1800) return "hard";
  if (altitudeM < 1300) return "soft";
  return "medium";
}

/**
 * Estimate settled bulk density from growing elevation.
 * Nepal 2021 (IJHAF): ~620 kg/m³ at 800–900 m, ~688 kg/m³ at 1400–1500 m.
 * Slope ≈ 0.11 g/L per metre. Specialty bulk ranges sit a little higher
 * (Brazil ~660–720, highland Ethiopia ~710–780), so the line is anchored at
 * 640 g/L @ 850 m, then nudged by origin/variety hardness.
 */
export function densityFromAltitude(altitudeM: number, origin?: OriginInfo, variety?: VarietyInfo): number {
  const alt = Math.max(700, Math.min(2600, altitudeM));
  let g = 640 + (alt - 850) * 0.11;
  if (origin?.density === "hard") g += 10;
  if (origin?.density === "soft") g -= 10;
  if (variety && variety.id !== "unknown") {
    if (variety.density === "hard") g += 6;
    if (variety.density === "soft") g -= 6;
  }
  return Math.round(Math.max(600, Math.min(780, g)));
}

export function isAutoDensity(intent: RoastIntent): boolean {
  if (intent.autoDensity === false) return false;
  if (intent.autoDensity === true) return true;
  return intent.densityGL == null;
}

export function resolveDensityGL(intent: RoastIntent, origin: OriginInfo, variety: VarietyInfo): number {
  if (!isAutoDensity(intent) && intent.densityGL != null && Number.isFinite(intent.densityGL)) {
    return Math.max(560, Math.min(800, intent.densityGL));
  }
  return densityFromAltitude(intent.altitudeM, origin, variety);
}

/**
 * Measured bulk density → heat. Denser seed needs more charge and a longer dry;
 * softer seed needs less preheat and more fan. Interpolated around 680 g/L so
 * 620 ≈ current soft origin and 740 ≈ current hard origin.
 */
export function densityAdjustment(densityGL?: number): Adjustment {
  if (densityGL == null || !Number.isFinite(densityGL)) return { ...ZERO };
  const d = Math.max(560, Math.min(800, densityGL));
  if (Math.abs(d - REFERENCE_DENSITY_GL) < 8) return { ...ZERO };
  if (d > REFERENCE_DENSITY_GL) {
    const t = Math.min(1.25, (d - REFERENCE_DENSITY_GL) / (DENSITY_HARD_GL - REFERENCE_DENSITY_GL));
    return scale(HARD_DENSITY_ADJ, t);
  }
  const t = Math.min(1.25, (REFERENCE_DENSITY_GL - d) / (REFERENCE_DENSITY_GL - DENSITY_SOFT_GL));
  return scale(SOFT_DENSITY_ADJ, t);
}

function originAdjustment(process: ProcessId, brew: BrewId): Adjustment {
  let adj: Adjustment = { ...ZERO };
  if (process === "washed") adj = add(adj, { ...ZERO, dryingS: -6, midS: -4, developmentS: -4, fcTemp: -0.5 });
  if (process === "natural") adj = add(adj, { ...ZERO, dryingS: 4, midS: 4, fanRpm: 80 });
  if (process === "anaerobic") adj = add(adj, { ...ZERO, dryingS: 6, developmentS: -8 });
  if (process === "honey") adj = add(adj, { ...ZERO, midS: 6, developmentS: 2 });
  if (brew === "filter") adj = add(adj, { ...ZERO, developmentS: -6 });
  if (brew === "espresso") adj = add(adj, { ...ZERO, developmentS: 8, midS: 4 });
  if (brew === "cupping") adj = add(adj, { ...ZERO, developmentS: 4, fcTemp: 0.5 });
  return adj;
}

export function varietyAdjustment(variety: VarietyInfo): Adjustment {
  return { ...variety.roast };
}

/** Typical export green is ~10–12%. 11% is the no-op reference. */
export const REFERENCE_MOISTURE = 11;

export function moistureAdjustment(moisture?: number): Adjustment {
  if (moisture == null || !Number.isFinite(moisture)) return { ...ZERO };
  const pct = Math.max(6, Math.min(16, moisture));
  const d = pct - REFERENCE_MOISTURE;
  if (Math.abs(d) < 0.05) return { ...ZERO };
  return {
    fcTemp: Number((d * 0.15).toFixed(2)),
    preheatW: Math.round(d * 18),
    dryingS: Math.round(d * 10),
    midS: Math.round(d * 2),
    developmentS: Math.round(d * -1),
    fanRpm: Math.round(d * 50),
  };
}

export function offZone(role?: ZoneRole): ZoneIntent {
  return { enabled: false, startS: 0, endS: 0, boost: 0, kp: 1, kd: 1, role };
}

const VOLATILE_FLAVORS: FlavorId[] = ["floral", "fruity", "bright", "juicy"];
const HEAVY_FLAVORS: FlavorId[] = ["body", "deepSweet"];

function flavorMass(intent: RoastIntent, ids: FlavorId[]): number {
  return intent.flavors.filter((f) => ids.includes(f.id)).reduce((s, f) => s + f.weight, 0);
}

export function drinkPlanOf(intent: RoastIntent): DrinkPlan {
  return intent.drinkPlan === "rtd" ? "rtd" : "rest";
}

export function isRtd(intent: RoastIntent): boolean {
  return drinkPlanOf(intent) === "rtd";
}

function clampBoost(n: number, lo: number, hi: number): number {
  return Math.round(Math.max(lo, Math.min(hi, n)) * 2) / 2;
}

export function zoneTemplate(role: ZoneRole, firstCrackTime: number, totalTime: number, boost?: number): ZoneIntent {
  const fc = Math.max(90, firstCrackTime);
  const end = Math.max(fc + 20, totalTime);
  if (role === "drying") {
    return { enabled: true, startS: 60, endS: Math.round(Math.min(150, fc - 45)), boost: boost ?? 2, kp: 1, kd: 1, role };
  }
  if (role === "maillard") {
    return { enabled: true, startS: 150, endS: Math.round(Math.max(165, fc - 28)), boost: boost ?? 2, kp: 1, kd: 1, role };
  }
  if (role === "into-fc") {
    return {
      enabled: true,
      startS: Math.round(Math.max(90, fc - 20)),
      endS: Math.round(Math.min(end, fc + 6)),
      boost: boost ?? 3,
      kp: 1,
      kd: 1,
      role,
    };
  }
  const afterStart = Math.round(Math.max(fc + 12, Math.min(end - 12, fc + 15)));
  return {
    enabled: true,
    startS: afterStart,
    endS: Math.round(Math.max(afterStart + 12, end)),
    boost: boost ?? -3,
    kp: 1,
    kd: 1,
    role,
  };
}

/**
 * Infer boosts from bean physics + flavor + the design RoR — not a blanket FC lift.
 *
 * KL (Chris Hilder): a boost is °C/min added to RoR-error to pre-empt endotherm/exotherm.
 * Official Nordic uses a short +3 into crack. Community uses a long mid-roast +zone for
 * crashy lots, and −6…−15 after FC on runaway espresso (official docs are cautious).
 *   Rao: enter crack already decelerating; do not slam heat at FC. So +boost is before/at
 * the moisture dump, −boost only after crack if the design RoR is still hot.
 *
 * RTD (KL core / Fnq): a RoR step after drying–Maillard plus sustained energy through
 * first crack (“T through FC”) to force CO₂ out so the cup is drinkable in 1–3 days.
 * Rest profiles do not drive through crack as hard — CO₂ stays in the seed and the cup
 * peaks after 3–5 days of degassing.
 */
export function suggestedZones(
  firstCrackTime: number,
  totalTime: number,
  intent: RoastIntent,
  rorPoly: Point[] = [],
  densityClass: DensityClass = "medium",
): ZoneSet {
  if (isRtd(intent)) return suggestedRtdZones(firstCrackTime, totalTime, intent, densityClass);

  const fc = Math.max(90, firstCrackTime);
  const end = Math.max(fc + 20, totalTime);
  const moisture = intent.moisture;
  const volatile = flavorMass(intent, VOLATILE_FLAVORS);
  const heavy = flavorMass(intent, HEAVY_FLAVORS);
  const rorFc = sampleAtTime(rorPoly, fc) ?? 10;
  const rorPre = sampleAtTime(rorPoly, Math.max(0, fc - 25)) ?? rorFc;
  const rorDrop = rorPre - rorFc;

  let dryScore = 0;
  if (moisture != null && moisture >= 12.5) dryScore += 3;
  else if (moisture != null && moisture >= 12) dryScore += 1.5;
  if (densityClass === "hard" && (intent.process === "natural" || intent.process === "anaerobic")) dryScore += 1;
  const zone1Dry =
    dryScore >= 2
      ? {
          ...zoneTemplate("drying", fc, end, clampBoost(2 + ((moisture ?? 11) - 11) * 0.5, 2, 4)),
          reason:
            moisture != null && moisture >= 12
              ? `Wet green (${moisture}%). Extra RoR while water leaves so drying does not stall.`
              : "Dense natural/anaerobic lot. Extra RoR through the wet front.",
        }
      : null;

  let mailScore = 0;
  if (intent.process === "honey") mailScore += 2;
  if (heavy >= 0.6) mailScore += 2;
  if (intent.roastStyle === "medium" && heavy >= 0.4) mailScore += 1;
  const zone1Mail =
    !zone1Dry && mailScore >= 2
      ? {
          ...zoneTemplate("maillard", fc, end, 2),
          reason:
            heavy >= 0.6
              ? "Body / deep-sweet goal. Hold RoR through color change so sugars brown without a stall."
              : "Honey process. Color-change dip — a small +boost keeps Maillard moving.",
        }
      : null;

  let fcScore = 0;
  if (intent.roastStyle === "light") fcScore += 1.5;
  if (volatile >= 0.6) fcScore += 2;
  if (densityClass === "hard") fcScore += 1.5;
  if (rorFc < 8 && (intent.roastStyle === "light" || densityClass === "hard")) fcScore += 2;
  else if (rorFc < 10 && intent.roastStyle === "light") fcScore += 1;
  if (rorDrop > 4 && intent.roastStyle === "light") fcScore += 1.5;
  if (intent.roastStyle === "dark") fcScore -= 1;
  const wantIntoFc = fcScore >= 3 || (rorFc < 7.5 && fcScore >= 2 && intent.roastStyle === "light");
  let intoBoost = 2;
  if (intent.roastStyle === "light") intoBoost += 1;
  if (volatile >= 0.6) intoBoost += 1;
  if (rorFc < 8) intoBoost += 1;
  const zone2 = wantIntoFc
    ? {
        ...zoneTemplate("into-fc", fc, end, clampBoost(intoBoost, 2, 5)),
        reason: [
          intent.roastStyle === "light" ? "Light drop" : null,
          volatile >= 0.6 ? "volatile flavors" : null,
          densityClass === "hard" ? "dense seed" : null,
          rorFc < 10 ? `design RoR ${rorFc.toFixed(1)} °C/min into crack` : null,
          rorDrop > 4 ? "RoR already falling hard" : null,
        ]
          .filter(Boolean)
          .join(", ")
          .replace(/^./, (c) => c.toUpperCase()) + ". Short +boost through the moisture dump (Nordic-style).",
      }
    : offZone("into-fc");

  let afterScore = 0;
  if (intent.roastStyle === "dark") afterScore += 2;
  if (intent.brew === "espresso") afterScore += 1.5;
  if (heavy >= 0.6) afterScore += 1.5;
  if (rorFc > 13) afterScore += 2;
  if (intent.process === "natural" && (intent.roastStyle === "dark" || intent.brew === "espresso")) afterScore += 1;
  if (intent.roastStyle === "light" || volatile >= 0.8) afterScore -= 3;
  let afterBoost = -2;
  if (intent.roastStyle === "dark") afterBoost -= 1;
  if (intent.brew === "espresso") afterBoost -= 1;
  if (rorFc > 14) afterBoost -= 2;
  const zone3 =
    afterScore >= 3
      ? {
          ...zoneTemplate("after-fc", fc, end, clampBoost(afterBoost, -6, -2)),
          reason: [
            intent.roastStyle === "dark" ? "Dark finish" : null,
            intent.brew === "espresso" ? "espresso" : null,
            heavy >= 0.6 ? "body/sweetness" : null,
            rorFc > 13 ? `hot design RoR ${rorFc.toFixed(1)} °C/min at crack` : null,
          ]
            .filter(Boolean)
            .join(", ")
            .replace(/^./, (c) => c.toUpperCase()) +
            ". Negative boost after crack to absorb the exotherm (KL community −6…−15; we stay conservative).",
        }
      : offZone("after-fc");

  return {
    zone1: zone1Dry ?? zone1Mail ?? offZone("drying"),
    zone2,
    zone3,
  };
}

/**
 * Official RTD profiles (and Fnq’s write-up of RTD 1500–2000) put a RoR step
 * right after drying/Maillard, then keep energy on through first crack so CO₂
 * leaves during the roast. Nano only has three slots, so after-crack negative
 * boost is skipped — that would hold gas in, which is the Rest idea.
 */
function suggestedRtdZones(
  firstCrackTime: number,
  totalTime: number,
  intent: RoastIntent,
  densityClass: DensityClass,
): ZoneSet {
  const fc = Math.max(90, firstCrackTime);
  const end = Math.max(fc + 20, totalTime);
  const moisture = intent.moisture;
  let dryScore = 0;
  if (moisture != null && moisture >= 12.5) dryScore += 3;
  else if (moisture != null && moisture >= 12) dryScore += 1.5;
  if (densityClass === "hard" && (intent.process === "natural" || intent.process === "anaerobic")) dryScore += 1;
  const zone1Dry =
    dryScore >= 2
      ? {
          ...zoneTemplate("drying", fc, end, clampBoost(2 + ((moisture ?? 11) - 11) * 0.5, 2, 4)),
          reason:
            moisture != null && moisture >= 12
              ? `Wet green (${moisture}%). RTD still dries first so the later CO₂ step has a stable front.`
              : "Dense natural/anaerobic lot. Extra RoR through the wet front before the RTD step.",
        }
      : null;

  const altNudge = intent.altitudeM >= 1800 || densityClass === "hard" ? 0.5 : 0;
  const mailBoost = clampBoost(2.5 + altNudge, 2, 4);
  const intoBoost = clampBoost(
    3.5 + (intent.roastStyle === "light" ? 0.5 : 0) + (densityClass === "hard" ? 0.5 : 0),
    3,
    5,
  );
  const mailStart = zone1Dry ? Math.round(zone1Dry.endS) : 90;
  const mailEnd = Math.round(Math.max(mailStart + 24, Math.min(fc - 28, mailStart + 180)));
  const zoneMail: ZoneIntent = {
    enabled: true,
    startS: mailStart,
    endS: mailEnd,
    boost: mailBoost,
    kp: 1,
    kd: 1,
    role: "maillard",
    reason:
      "RTD RoR step after drying/Maillard (see KL RTD 1500–2000). Extra °C/min here moves CO₂ out so the cup is ready in 1–3 days, not 3–5.",
  };
  const intoStart = Math.round(Math.min(Math.max(mailEnd, fc - 32), fc - 8));
  const zoneInto: ZoneIntent = {
    enabled: true,
    startS: intoStart,
    endS: Math.round(Math.min(end, Math.max(intoStart + 16, fc + 18))),
    boost: intoBoost,
    kp: 1,
    kd: 1,
    role: "into-fc",
    reason:
      "RTD “T through crack”: keep energy on into and through first crack. Forces remaining CO₂ out and flattens the dip/flick. Rest profiles do this much less.",
  };

  if (zone1Dry) return { zone1: zone1Dry, zone2: zoneMail, zone3: zoneInto };
  return { zone1: zoneMail, zone2: zoneInto, zone3: offZone("after-fc") };
}

export function resolveZones(
  intent: RoastIntent,
  firstCrackTime: number,
  totalTime: number,
  rorPoly: Point[] = [],
  densityClass: DensityClass = "medium",
): ZoneSet {
  if (intent.autoZones !== false) return suggestedZones(firstCrackTime, totalTime, intent, rorPoly, densityClass);
  return intent.zones ?? suggestedZones(firstCrackTime, totalTime, intent, rorPoly, densityClass);
}

export function zoneFields(zones: ZoneSet): Record<string, string> {
  const raw: Record<string, string> = {};
  for (const id of ZONE_IDS) {
    const z = zones[id];
    const on = z.enabled && z.endS > z.startS;
    raw[`${id}_time_start`] = on ? z.startS.toFixed(1) : "0.0";
    raw[`${id}_time_end`] = on ? z.endS.toFixed(1) : "0.0";
    raw[`${id}_boost`] = on ? z.boost.toFixed(1) : "0.0";
    raw[`${id}_multiplier_Kp`] = (z.kp ?? 1).toFixed(1);
    raw[`${id}_multiplier_Kd`] = (z.kd ?? 1).toFixed(1);
  }
  return raw;
}

export function formatZoneSummary(z: ZoneIntent): string {
  if (!z.enabled || z.endS <= z.startS) return "off";
  const sign = z.boost > 0 ? "+" : "";
  const role = z.role ? `${ZONE_ROLE_META[z.role].label} · ` : "";
  return `${role}${formatClock(z.startS)}–${formatClock(z.endS)} · ${sign}${z.boost} °C/min`;
}

function flavorAdjustment(picks: FlavorPick[]): Adjustment {
  return picks.reduce((acc, pick) => add(acc, scale(FLAVOR_DELTA[pick.id], pick.weight)), { ...ZERO });
}

function processCode(process: ProcessId): string {
  if (process === "natural") return "NAT";
  if (process === "washed") return "WSH";
  if (process === "honey") return "HNY";
  if (process === "anaerobic") return "AN";
  return "OTH";
}

function brewCode(brew: BrewId): string {
  if (brew === "filter") return "F";
  if (brew === "espresso") return "E";
  if (brew === "cupping") return "C";
  return "O";
}

function styleCode(style: RoastStyleId): string {
  if (style === "light") return "L";
  if (style === "dark") return "D";
  return "M";
}

function roastLevelOf(intent: RoastIntent): number {
  if (!intent.autoLevel) return intent.level;
  return STYLES.find((s) => s.id === intent.roastStyle)?.level ?? intent.level;
}

function originCode(intent: RoastIntent): string {
  const origin = originById(intent.originId);
  return origin.shortCode ?? origin.name.slice(0, 3).toUpperCase();
}

function varietyCode(intent: RoastIntent): string {
  const variety = varietyById(intent.varietyId);
  if (variety.id === "unknown" || !variety.shortCode) return "";
  return variety.shortCode;
}

const KPRO_SHORT_MAX = 17;

function fileSlug(name: string): string {
  const s = name.trim().replace(/\s+/g, "_").replace(/[^A-Za-z0-9._+-]/g, "");
  return (s || "Kaffe").slice(0, 120);
}

/** Human-readable name: brew, process, level, lot, altitude, rest/RTD, and extras. */
export function curveName(intent: RoastIntent): string {
  const variety = varietyById(intent.varietyId);
  const level = roastLevelOf(intent).toFixed(1);
  const lot = [originCode(intent), varietyCode(intent)].filter(Boolean).join("-");
  const flavors = intent.flavors
    .filter((f) => f.weight > 0)
    .map((f) => flavorById(f.id).name.replace(/\s+/g, "-").toLowerCase())
    .join("+");
  const parts = [
    `${brewCode(intent.brew)}-${processCode(intent.process)}`,
    `${styleCode(intent.roastStyle)}${level}`,
    lot,
    `${Math.round(intent.altitudeM)}m`,
    isRtd(intent) ? "RTD" : "Rest",
  ];
  if (flavors) parts.push(flavors);
  if (intent.moisture != null && Number.isFinite(intent.moisture)) {
    parts.push(`${Number(intent.moisture).toFixed(1)}H`);
  }
  if (intent.autoDensity === false && intent.densityGL != null && Number.isFinite(intent.densityGL)) {
    parts.push(`${Math.round(intent.densityGL)}gL`);
  }
  if (intent.expectFc != null && Number.isFinite(intent.expectFc)) {
    parts.push(`FC${Math.round(intent.expectFc)}`);
  }
  if (variety.beanSize === "large") parts.push("lg");
  if (variety.beanSize === "small") parts.push("sm");
  if (intent.manualAnchors && intent.manualAnchors.length >= 3) parts.push("man");
  return parts.join(" ");
}

/** Nano `profile_short_name` is 17 characters. Pack brew-process-level-lot, RTD if on. */
export function kproShortName(intent: RoastIntent): string {
  const lv = String(Math.round(roastLevelOf(intent) * 10));
  const origin = originCode(intent);
  const vari = varietyCode(intent);
  const head = `${brewCode(intent.brew)}-${processCode(intent.process)}-${styleCode(intent.roastStyle)}${lv}`;
  const tail = isRtd(intent) ? "RTD" : vari;
  const parts = tail ? [head, origin, tail] : [head, origin];
  return parts.join("-").slice(0, KPRO_SHORT_MAX);
}

const ADJ_KEYS: (keyof Adjustment)[] = ["fcTemp", "preheatW", "dryingS", "midS", "developmentS", "fanRpm"];
const FLAVOR_IDS = Object.keys(FLAVOR_DELTA) as FlavorId[];

function dotAdj(a: Adjustment, b: Adjustment): number {
  return ADJ_KEYS.reduce((sum, k) => sum + a[k] * b[k], 0);
}

function normAdj(a: Adjustment): number {
  return Math.sqrt(dotAdj(a, a));
}

export function inferFlavorsFromAdjustment(residual: Adjustment): FlavorPick[] {
  const n = normAdj(residual);
  if (n < 2) return [];
  const ranked = FLAVOR_IDS
    .map((id) => {
      const d = FLAVOR_DELTA[id];
      const dn = normAdj(d);
      const cosine = dn === 0 ? 0 : dotAdj(residual, d) / (n * dn);
      const proj = dn === 0 ? 0 : dotAdj(residual, d) / (dn * dn);
      return { id, cosine, weight: Math.max(0, Math.min(1, proj)) };
    })
    .filter((x) => x.cosine > 0.2 && x.weight > 0.15)
    .sort((a, b) => b.cosine - a.cosine)
    .slice(0, 2);
  return ranked.map((x) => ({ id: x.id, weight: Number(x.weight.toFixed(2)) }));
}

function measureCurve(poly: Point[], fcTemp: number) {
  const dry = timeAtValue(poly, 150) ?? 180;
  const fcTime = timeAtValue(poly, fcTemp) ?? Math.max(dry + 60, poly[Math.floor(poly.length * 0.75)]?.t ?? 380);
  const endT = poly[poly.length - 1]?.t ?? 480;
  const endV = poly[poly.length - 1]?.v ?? 212;
  const early = timeAtValue(poly, 100) ?? 80;
  return { dry, fcTime, endT, endV, early };
}

export function inferAdjustmentFromAnchors(manual: Point[], originAnchors: Point[], originFcTemp: number): Adjustment {
  const man = expandCurve(rebuildFromAnchors(manual));
  const org = expandCurve(rebuildFromAnchors(originAnchors));
  const m = measureCurve(man, originFcTemp);
  const o = measureCurve(org, originFcTemp);
  return {
    fcTemp: Number((((m.endV - o.endV) + (originFcTemp - 204) * 0) * 0.6).toFixed(1)),
    preheatW: Number(((o.early - m.early) * 1.4).toFixed(0)),
    dryingS: Number((m.dry - o.dry).toFixed(0)),
    midS: Number((m.fcTime - m.dry - (o.fcTime - o.dry)).toFixed(0)),
    developmentS: Number((m.endT - m.fcTime - (o.endT - o.fcTime)).toFixed(0)),
    fanRpm: 0,
  };
}

/**
 * Nano 7 fan: Schwartzberg G' high through drying / most of Maillard, then ~10%
 * less air in development. Shape is phase-relative (yellow → FC → drop), blended
 * with the official 10 min clock so it matches KL Washed/Natural v1.1 and the
 * Nordic template — not a crash at first crack.
 */
export const FAN_HOLD_RPM = 14700;
export const FAN_END_RPM = 13200;
/** Official 600 s templates: drop underway by 5:00, low plateau by 9:18. */
export const FAN_HOLD_FRAC = 300 / 600;
export const FAN_LOW_FRAC = 558 / 600;
export const FAN_START_FRAC = 18 / 600;
/** Fraction of Maillard completed before the drop (KL v1.1 / Explorer). */
export const FAN_MAIL_ALPHA = 0.78;
/** Fraction of development elapsed when the low plateau is reached. */
export const FAN_DEV_BETA = 0.72;
const FAN_DROP_CP2_FRAC = (540 - 300) / (558 - 300);
const FAN_MIN = 12000;
const FAN_MAX = 16800;

function clampRpm(n: number): number {
  return Math.round(Math.max(FAN_MIN, Math.min(FAN_MAX, n)));
}

export interface FanCurveInput {
  totalTime: number;
  firstCrackTime: number;
  /** Time to yellow (~150 °C). */
  dryTime?: number;
  /** Uniform Studio-style transform (flavor / density / process / moisture). */
  rpmOffset?: number;
  beanSize?: BeanSize;
  roastStyle?: RoastStyleId;
  drinkPlan?: DrinkPlan;
  process?: ProcessId;
  brew?: BrewId;
  moisture?: number | null;
  densityGL?: number;
  volatileWeight?: number;
  heavyWeight?: number;
}

export interface FanSchedule {
  tStart: number;
  tHold: number;
  tLow: number;
  tEnd: number;
  holdRpm: number;
  endRpm: number;
  /** Maillard fraction before drop. */
  alpha: number;
  /** Development fraction before low plateau. */
  beta: number;
}

function fanEarlyExtra(input: FanCurveInput): number {
  const size = input.beanSize === "large" ? 280 : input.beanSize === "small" ? -40 : 0;
  const moisture = input.moisture != null && Number.isFinite(input.moisture) ? clamp(input.moisture, 6, 16) : REFERENCE_MOISTURE;
  // Extra hold-only air for wet lots: moistureAdjustment already shifts the whole
  // curve; this keeps G' up through drying a little longer without lifting drop RPM.
  const wetHold = Math.round(Math.max(0, moisture - REFERENCE_MOISTURE) * 25);
  return size + wetHold;
}

function fanLateExtra(input: FanCurveInput): number {
  const style = input.roastStyle === "dark" ? -100 : input.roastStyle === "light" ? 80 : 0;
  const rtd = input.drinkPlan === "rtd" ? -80 : 0;
  const espresso = input.brew === "espresso" ? -50 : 0;
  const heavy = -40 * (input.heavyWeight ?? 0);
  const volatile = 25 * (input.volatileWeight ?? 0);
  return Math.round(style + rtd + espresso + heavy + volatile);
}

export function planFanSchedule(input: FanCurveInput): FanSchedule {
  const T = Math.max(180, input.totalTime);
  const tFc = input.firstCrackTime > 40 ? input.firstCrackTime : T * 0.62;
  const tDry =
    input.dryTime != null && input.dryTime > 30 && input.dryTime < tFc - 24
      ? input.dryTime
      : clamp(0.28 * tFc, 50, tFc - 40);
  const moisture = input.moisture != null && Number.isFinite(input.moisture) ? clamp(input.moisture, 6, 16) : REFERENCE_MOISTURE;
  const rho = input.densityGL != null && Number.isFinite(input.densityGL) ? clamp(input.densityGL, 560, 800) : REFERENCE_DENSITY_GL;
  const volatile = input.volatileWeight ?? 0;
  const heavy = input.heavyWeight ?? 0;

  let alpha = FAN_MAIL_ALPHA;
  if (input.roastStyle === "light") alpha -= 0.06;
  if (input.roastStyle === "dark") alpha += 0.06;
  alpha += 0.04 * heavy - 0.05 * volatile;
  if (input.process === "natural" || input.process === "anaerobic") alpha += 0.04;
  if (input.process === "washed") alpha -= 0.02;
  if (input.drinkPlan === "rtd") alpha += 0.05;
  if (input.beanSize === "large") alpha += 0.04;
  if (input.beanSize === "small") alpha -= 0.02;
  alpha += 0.015 * (moisture - REFERENCE_MOISTURE);
  alpha += 0.04 * ((rho - REFERENCE_DENSITY_GL) / 80);
  alpha = clamp(alpha, 0.62, 0.9);

  let beta = FAN_DEV_BETA;
  if (input.roastStyle === "dark") beta += 0.06;
  if (input.roastStyle === "light") beta -= 0.04;
  if (input.drinkPlan === "rtd") beta -= 0.08;
  if (input.brew === "espresso") beta += 0.04;
  beta = clamp(beta, 0.55, 0.85);

  const tStart = Math.max(8, Math.min(22, FAN_START_FRAC * T));
  const tHoldPhase = tDry + alpha * (tFc - tDry);
  const tHoldClock = FAN_HOLD_FRAC * T;
  let tHold = 0.55 * tHoldPhase + 0.45 * tHoldClock;
  tHold = Math.min(tHold, tFc - 20);
  tHold = Math.max(tHold, tDry + 24, tStart + 80);

  let tLow = tFc + beta * (T - tFc);
  tLow = Math.max(tLow, tHold + 75);
  tLow = Math.min(tLow, T - 12);

  const tEnd = T;
  if (!(tStart + 8 < tHold && tHold + 8 < tLow && tLow + 8 < tEnd)) {
    tHold = tStart + (tEnd - tStart) * FAN_HOLD_FRAC;
    tLow = tStart + (tEnd - tStart) * FAN_LOW_FRAC;
    if (tLow >= tEnd - 8) tLow = tEnd - 12;
    if (tHold >= tLow - 40) tHold = Math.max(tStart + 40, tLow - 90);
  }

  const offset = input.rpmOffset ?? 0;
  const holdRpm = clampRpm(FAN_HOLD_RPM + offset + fanEarlyExtra(input));
  const endRpm = clampRpm(Math.min(holdRpm - 700, FAN_END_RPM + offset + fanLateExtra(input)));
  return { tStart, tHold, tLow, tEnd, holdRpm, endRpm, alpha, beta };
}

export function buildOfficialFanCurve(input: FanCurveInput): CurveData {
  const { tStart, tHold, tLow, tEnd, holdRpm: hold, endRpm: end } = planFanSchedule(input);
  const a0 = { t: tStart, v: hold };
  const a1 = { t: tHold, v: hold };
  const a2 = { t: tLow, v: end };
  const a3 = { t: tEnd, v: end };
  const holdSpan = Math.max(1, a1.t - a0.t);
  const dropSpan = Math.max(1, a2.t - a1.t);
  const midLow = (a2.t + a3.t) / 2;

  const segments: BezierSegment[] = [
    {
      start: a0,
      cp1: { t: a0.t + holdSpan * (24 / 282), v: hold },
      cp2: { t: a0.t + holdSpan * (42 / 282), v: hold },
      end: a1,
    },
    {
      start: a1,
      cp1: { t: a1.t, v: end },
      cp2: { t: a1.t + dropSpan * FAN_DROP_CP2_FRAC, v: end },
      end: a2,
    },
    {
      start: a2,
      cp1: { t: midLow, v: end },
      cp2: { t: midLow, v: end },
      end: a3,
    },
  ];
  return { anchors: [a0, a1, a2, a3], segments };
}

export function buildOfficialFanAnchors(input: FanCurveInput): Point[] {
  return buildOfficialFanCurve(input).anchors;
}

/** `endTemp` is drop °C (recommended level), not the last Bézier handle past drop. */
export function inferStyleFromCurve(dtr: number, endTemp: number): RoastStyleId {
  if (endTemp < 211.4 || (dtr < 0.185 && endTemp < 213)) return "light";
  if (endTemp > 213.8 || dtr > 0.232) return "dark";
  return "medium";
}

/**
 * Pace families from official / community KL evidence:
 * - Nordic Light: ~5:20–6:30, DTR ~20% (community fast filter)
 * - Classic / Ninja / Firestarter: ~9:00–9:35, FC ~7:40, DTR ~20% at L3
 * - Slow dark/espresso: ~10–12 min (Nano 7 typical ~10 min at 120 g)
 */
export const FAMILY_TOTAL_S: Record<RoastFamily, number> = {
  nordic: 400,
  classic: 540,
  slow: 660,
};

export const FAMILY_DTR: Record<RoastFamily, number> = {
  nordic: 0.2,
  classic: 0.21,
  slow: 0.23,
};

export interface DurationPlan {
  family: RoastFamily;
  startS: number;
  dryS: number;
  fcS: number;
  endS: number;
  dtr: number;
  fcTemp: number;
  /** Dehydration slope, °C/min from ~50°C to yellow (~150°C). */
  drySlope: number;
  /** Maillard slope, °C/min from yellow to first crack. */
  mailSlope: number;
  /** Development slope, °C/min from first crack to drop. */
  devSlope: number;
}

export function pickRoastFamilyFromTotal(endS: number): RoastFamily {
  if (endS < 465) return "nordic";
  if (endS < 600) return "classic";
  return "slow";
}

export const CHARGE_TEMP = 50;
export const YELLOW_TEMP = 150;
/** Official Nordic last minute is ~1 °C/min. Cooling is klog roast_end, not this tail. */
const DROP_TAIL_S = 60;
const DROP_TAIL_C = 2;
/** Hernández / Schwartzberg-style reference: mid-altitude washed Arabica, Nano 7 fluid bed. */
const ROR_DRY_REF = 40;
const ROR_MAIL_REF = 12;
const ROR_DEV_REF = 7;
const FC_TEMP_REF = 203.5;

function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}

/**
 * Floor the RoR-error controller may ask for while catching the profile.
 * Kaffelogic Studio flags the Nordic baseline −0.7 when the curve itself
 * never goes below ~0.8 °C/min: that slack lets tracking look like a crash.
 * Keep ~1 °C/min of room under design min RoR, but not below −0.2 unless
 * the Bézier is actually that slow (charge skipped; measure through drop).
 */
export function minDesiredRor(ror: Point[], tStart: number, tEnd: number): number {
  let min = Infinity;
  for (const p of ror) {
    if (p.t < tStart || p.t > tEnd) continue;
    if (p.v < min) min = p.v;
  }
  if (!Number.isFinite(min)) min = 4;
  return clamp(Math.round((min - 1) * 10) / 10, -1, -0.2);
}

/**
 * Phase times from roast kinetics, not from a single family bucket.
 *
 * Dehydration (Schwartzberg 2002; Hernández et al. 2007): moisture loss is Arrhenius
 * diffusion ~ X²/d²·exp(−E/RT). We don't integrate the ODE; we keep the same
 * dependencies as a drying slope: wetter and denser seed slow the 50→150°C rise.
 * Steeper dry slope preserves acidity and aroma; shallower builds body
 * (Royal Coffee water-activity / Maillard cupping).
 *
 * Maillard (van Boekel 2006; Royal Coffee aW): faster through 150°C→FC → brighter
 * acidity and thinner body; slower → viscosity and caramel.
 *
 * First crack: typically 196–205°C internal, 203–210°C on a naked KL probe.
 * Denser seed cracks hotter/later (stronger cell wall, more energy). Moisture
 * mainly delays the *time* to crack via evaporative cooling, not the crack temp.
 *
 * Development time at constant colour is a real sensory lever (Münchow et al.
 * 2020; Alstrup et al. 2020). Rao’s 20–25% DTR is craft for drums at
 * typical load; high energy-to-batch (sample / fluid-bed Nano) can sit nearer
 * 15%. Hilder: default KL ~20% at light levels. Formula below is that Nano
 * band, not a claim that 20–25% is a law.
 */
export function durationPlan(
  intent: RoastIntent,
  variety: VarietyInfo,
  adj: Adjustment,
  densityGL: number,
  dropTemp: number,
): DurationPlan {
  const volatile = flavorMass(intent, VOLATILE_FLAVORS) + (variety.flavorLean.some((id) => VOLATILE_FLAVORS.includes(id)) ? 0.3 : 0);
  const heavy =
    flavorMass(intent, HEAVY_FLAVORS) + (variety.flavorLean.includes("body") || variety.flavorLean.includes("deepSweet") ? 0.3 : 0);
  const moisture = intent.moisture != null && Number.isFinite(intent.moisture) ? clamp(intent.moisture, 6, 16) : REFERENCE_MOISTURE;
  const rho = clamp(densityGL, 560, 800);
  const sizeK = variety.beanSize === "large" ? 0.82 : variety.beanSize === "small" ? 1.08 : 1;
  let processK = 1;
  if (intent.process === "washed") processK = 1.04;
  if (intent.process === "natural") processK = 0.94;
  if (intent.process === "honey") processK = 0.92;
  if (intent.process === "anaerobic") processK = 0.9;
  const beanK = (REFERENCE_DENSITY_GL / rho) ** 0.5 * (REFERENCE_MOISTURE / moisture) ** 0.45 * sizeK * processK;

  const kDry =
    1 +
    0.18 * volatile -
    0.16 * heavy +
    (intent.roastStyle === "light" ? 0.12 : 0) +
    (intent.roastStyle === "dark" ? -0.1 : 0) +
    (intent.brew === "filter" ? 0.05 : 0) +
    (intent.brew === "espresso" ? -0.08 : 0) +
    (isRtd(intent) ? (intent.altitudeM >= 1500 ? 0.08 : 0.03) : 0);
  const kMail =
    1 +
    0.2 * volatile -
    0.22 * heavy +
    (intent.roastStyle === "light" ? 0.18 : 0) +
    (intent.roastStyle === "dark" ? -0.12 : 0) +
    (intent.process === "honey" ? -0.08 : 0) +
    (isRtd(intent) ? 0.12 : 0);
  const kDev =
    1 +
    0.15 * volatile -
    0.2 * heavy +
    (intent.roastStyle === "light" ? 0.12 : 0) +
    (intent.roastStyle === "dark" ? -0.15 : 0) +
    (intent.brew === "espresso" ? -0.1 : 0) +
    (isRtd(intent) ? 0.06 : 0);

  const drySlope = clamp(ROR_DRY_REF * beanK * kDry, 28, 85);
  const mailSlope = clamp(ROR_MAIL_REF * beanK ** 0.5 * kMail, 7, 28);
  const devSlope = clamp(ROR_DEV_REF * kDev, 4, 14);

  const estimatedFc = clamp(
    FC_TEMP_REF +
      (3.8 * (rho - REFERENCE_DENSITY_GL)) / 80 +
      adj.fcTemp +
      (intent.process === "washed" ? -0.4 : 0) +
      (intent.process === "natural" ? 0.3 : 0),
    196,
    Math.min(212, dropTemp - 4),
  );
  const fcTemp =
    intent.expectFc != null && Number.isFinite(intent.expectFc) ? clamp(intent.expectFc, 185, 222) : estimatedFc;

  let dry = ((YELLOW_TEMP - CHARGE_TEMP) / drySlope) * 60 + adj.dryingS * 0.35;
  let maillard = ((fcTemp - YELLOW_TEMP) / mailSlope) * 60 + adj.midS * 0.35;
  dry = clamp(dry, 85, 230);
  maillard = clamp(maillard, 100, 340);

  const drop = Math.max(fcTemp + 3, dropTemp);
  let development = ((drop - fcTemp) / devSlope) * 60 + adj.developmentS * 0.35;
  const preTotal = dry + maillard;
  const targetDtr = clamp(
    0.2 +
      (intent.roastStyle === "dark" ? 0.035 : 0) +
      (intent.roastStyle === "light" ? -0.015 : 0) +
      (intent.brew === "espresso" ? 0.02 : 0) +
      (intent.brew === "filter" && intent.roastStyle === "light" ? -0.015 : 0) +
      0.025 * heavy -
      0.03 * volatile,
    0.15,
    0.27,
  );
  const dtrDev = (targetDtr * preTotal) / (1 - targetDtr);
  development = clamp(0.4 * development + 0.6 * dtrDev, 50, 220);

  const startS = 7;
  const fcS = startS + dry + maillard;
  const endS = clamp(Math.max(fcS + development, fcS / (1 - targetDtr)), 330, 780);
  return {
    family: pickRoastFamilyFromTotal(endS),
    startS,
    dryS: startS + dry,
    fcS,
    endS,
    dtr: (endS - fcS) / endS,
    fcTemp: Number(estimatedFc.toFixed(1)),
    drySlope: Number(drySlope.toFixed(1)),
    mailSlope: Number(mailSlope.toFixed(1)),
    devSlope: Number(devSlope.toFixed(1)),
  };
}

/** Yellow / FC / drop times and °C/min slopes read off the finished curve. */
export function measurePhases(poly: Point[], fcTemp: number, dropTemp: number): {
  dryTime: number;
  mailTime: number;
  devTime: number;
  drySlope: number;
  mailSlope: number;
  devSlope: number;
} {
  const t0 = poly[0]?.t ?? 7;
  const tYellow = timeAtValue(poly, YELLOW_TEMP) ?? t0 + 90;
  const tFc = timeAtValue(poly, fcTemp) ?? t0 + 300;
  const tEnd = timeAtValue(poly, dropTemp) ?? poly[poly.length - 1]?.t ?? tFc + 60;
  const dryTime = Math.max(1, tYellow - t0);
  const mailTime = Math.max(1, tFc - tYellow);
  const devTime = Math.max(1, tEnd - tFc);
  return {
    dryTime,
    mailTime,
    devTime,
    drySlope: Number(((YELLOW_TEMP - CHARGE_TEMP) / (dryTime / 60)).toFixed(1)),
    mailSlope: Number(((fcTemp - YELLOW_TEMP) / (mailTime / 60)).toFixed(1)),
    devSlope: Number((Math.max(0.5, dropTemp - fcTemp) / (devTime / 60)).toFixed(1)),
  };
}

function applyTempMorph(points: Point[], fcTempDelta: number): Point[] {
  return points.map((p, i, arr) => ({
    t: p.t,
    v: p.v + (i === arr.length - 1 ? fcTempDelta * 0.4 : 0),
  }));
}

/** Stretch the Nordic baseline so yellow / FC / drop land on the duration plan. */
export function fitAnchorsToPlan(anchors: Point[], plan: DurationPlan, fcTemp: number, dropTemp: number): Point[] {
  if (anchors.length < 3) return anchors.map((p) => ({ ...p }));
  const poly = expandCurve(rebuildFromAnchors(anchors));
  const t0 = anchors[0].t;
  let tDry = timeAtValue(poly, YELLOW_TEMP) ?? 90;
  let tFc = timeAtValue(poly, fcTemp) ?? 320;
  let tDrop = timeAtValue(poly, dropTemp) ?? anchors[anchors.length - 1].t;
  tDry = Math.max(t0 + 20, tDry);
  tFc = Math.max(tDry + 40, tFc);
  tDrop = Math.max(tFc + 20, tDrop);

  const mapT = (t: number): number => {
    if (t <= tDry) {
      const span = Math.max(1, tDry - t0);
      return plan.startS + (plan.dryS - plan.startS) * ((t - t0) / span);
    }
    if (t <= tFc) {
      const span = Math.max(1, tFc - tDry);
      return plan.dryS + (plan.fcS - plan.dryS) * ((t - tDry) / span);
    }
    if (t <= tDrop) {
      const span = Math.max(1, tDrop - tFc);
      return plan.fcS + (plan.endS - plan.fcS) * ((t - tFc) / span);
    }
    return plan.endS + (t - tDrop) * (DROP_TAIL_S / Math.max(1, anchors[anchors.length - 1].t - tDrop));
  };

  const mapped = anchors.map((p) => ({ t: Math.max(1, mapT(p.t)), v: p.v }));
  mapped[0] = { ...mapped[0], t: plan.startS };
  mapped[mapped.length - 1] = { t: plan.endS + DROP_TAIL_S, v: dropTemp + DROP_TAIL_C };
  return mergePhasePins(
    mapped,
    [
      { t: plan.dryS, v: YELLOW_TEMP },
      { t: plan.fcS, v: fcTemp },
      { t: plan.endS, v: dropTemp },
    ],
    24,
  );
}

export function defaultIntent(): RoastIntent {
  return {
    originId: "colombia-antioquia",
    varietyId: "castillo",
    process: "washed",
    altitudeM: 1550,
    brew: "filter",
    roastStyle: "light",
    autoLevel: true,
    autoDensity: true,
    autoZones: true,
    drinkPlan: "rest",
    level: 1.6,
    flavors: [],
  };
}

export function generateProfile(intent: RoastIntent): GeneratedRoast {
  const origin = originById(intent.originId);
  const variety = varietyById(intent.varietyId);
  const style = STYLES.find((s) => s.id === intent.roastStyle) ?? STYLES[0];
  let level = intent.autoLevel ? style.level : intent.level;
  const resolvedDensityGL = resolveDensityGL(intent, origin, variety);
  const originAdj = originAdjustment(intent.process, intent.brew);
  const varietyAdj = varietyAdjustment(variety);
  const moistureAdj = moistureAdjustment(intent.moisture);
  const densityAdj = densityAdjustment(resolvedDensityGL);
  const beanAdj = add(add(add(originAdj, varietyAdj), moistureAdj), densityAdj);
  const base = parseKpro(BASELINE_KPRO, "baseline.kpro");
  let endTemp = levelToTemp(base.roastLevels, level) ?? 212;
  const beanPlan = durationPlan({ ...intent, flavors: [], expectFc: undefined }, variety, beanAdj, resolvedDensityGL, endTemp);
  const beanAnchors = fitAnchorsToPlan(
    applyTempMorph(base.roast.anchors, beanAdj.fcTemp),
    beanPlan,
    beanPlan.fcTemp,
    endTemp,
  );

  let flavorAdj = flavorAdjustment(intent.flavors);
  let total = add(beanAdj, flavorAdj);
  const plan = durationPlan(intent, variety, total, resolvedDensityGL, endTemp);
  const autoFirstCrackTemp = plan.fcTemp;
  let firstCrackTemp =
    intent.expectFc != null && Number.isFinite(intent.expectFc)
      ? Math.max(185, Math.min(222, intent.expectFc))
      : autoFirstCrackTemp;

  let roastAnchors: Point[];
  if (intent.manualAnchors && intent.manualAnchors.length >= 3) {
    roastAnchors = intent.manualAnchors.map((p) => ({ t: p.t, v: p.v }));
    flavorAdj = inferAdjustmentFromAnchors(roastAnchors, beanAnchors, beanPlan.fcTemp);
    total = add(beanAdj, flavorAdj);
    endTemp = roastAnchors[roastAnchors.length - 1]?.v ?? endTemp;
  } else {
    roastAnchors = fitAnchorsToPlan(
      applyTempMorph(base.roast.anchors, total.fcTemp),
      plan,
      firstCrackTemp,
      endTemp,
    );
  }
  const roast = rebuildFromAnchors(roastAnchors);
  const roastPoly = expandCurve(roast);
  const densitySource = isAutoDensity(intent) ? "altitude" : "measured";
  const densityClass = classifyDensity(resolvedDensityGL);
  const totalTime = timeAtValue(roastPoly, endTemp) ?? roastAnchors[roastAnchors.length - 1].t;
  const firstCrackTime = timeAtValue(roastPoly, firstCrackTemp) ?? totalTime * 0.86;
  const rorPoly = rorSeries(roastPoly);
  const zones = resolveZones(intent, firstCrackTime, totalTime, rorPoly, densityClass);
  const dryEndTime = timeAtValue(roastPoly, YELLOW_TEMP) ?? firstCrackTime * 0.35;
  const roastEndT = roastAnchors[roastAnchors.length - 1]?.t ?? totalTime;
  const fan = buildOfficialFanCurve({
    totalTime: Math.max(totalTime, roastEndT),
    firstCrackTime,
    dryTime: dryEndTime,
    rpmOffset: total.fanRpm,
    beanSize: variety.beanSize,
    roastStyle: intent.roastStyle,
    drinkPlan: drinkPlanOf(intent),
    process: intent.process,
    brew: intent.brew,
    moisture: intent.moisture,
    densityGL: resolvedDensityGL,
    volatileWeight: flavorMass(intent, VOLATILE_FLAVORS),
    heavyWeight: flavorMass(intent, HEAVY_FLAVORS),
  });
  const dtr = totalTime > 0 ? Math.max(0.08, (totalTime - firstCrackTime) / totalTime) : 0.14;
  const phases = measurePhases(roastPoly, firstCrackTemp, endTemp);
  const preheatPower = Math.round(Math.max(700, Math.min(1400, 820 + total.preheatW)));
  const inferredFlavors = intent.manualAnchors ? inferFlavorsFromAdjustment(flavorAdj) : intent.flavors;

  const displayName = intent.name?.trim() || curveName(intent);
  const shortName = (intent.name?.trim() ? fileSlug(intent.name) : kproShortName(intent)).slice(0, 17);
  const flavorsLabel = intent.flavors.map((f) => flavorById(f.id).name).join(" + ") || "bean default";
  const description = [
    `${origin.name} · ${variety.name} · ${intent.process} · ${intent.altitudeM}m${
      intent.moisture != null ? ` · ${intent.moisture}% H₂O` : ""
    } · ${Math.round(resolvedDensityGL)} g/L · ${intent.brew} · ${intent.roastStyle}`,
    `Flavor: ${flavorsLabel}`,
    isRtd(intent)
      ? "Cup: RTD — brew 1–3 days. RoR step after Maillard and +boost through first crack to drive CO₂ out in the roast (KL core RTD / Fnq). Flavour drops hard around day 4."
      : "Cup: Rest — peak 3–5 days after roast. Gentler through first crack so CO₂ degasses in the bag, not in the machine (KL core Rest).",
    `Generated by Kaffe for Nano 7.`,
  ].join("\n");

  const profile: KproProfile = {
    ...base,
    name: shortName,
    fileName: `${fileSlug(displayName)}.kpro`,
    designer: "Kaffe",
    description,
    roast,
    fan,
    raw: {
      ...base.raw,
      profile_short_name: shortName,
      profile_designer: "Kaffe",
      recommended_level: level.toFixed(1),
      preheat_power: preheatPower.toFixed(1),
      roast_required_power: String(Math.max(preheatPower, 1100)),
      expect_fc: firstCrackTemp.toFixed(1),
      roast_min_desired_rate_of_rise: minDesiredRor(rorPoly, (roastPoly[0]?.t ?? 7) + 20, totalTime).toFixed(1),
      ...zoneFields(zones),
    },
  };

  return {
    profile,
    kproText: encodeKpro(profile),
    breakdown: { origin: originAdj, variety: varietyAdj, moisture: moistureAdj, density: densityAdj, flavor: flavorAdj, total },
    firstCrackTemp,
    autoFirstCrackTemp,
    firstCrackTime,
    totalTime,
    dtr,
    dryTime: phases.dryTime,
    mailTime: phases.mailTime,
    devTime: phases.devTime,
    drySlope: phases.drySlope,
    mailSlope: phases.mailSlope,
    devSlope: phases.devSlope,
    preheatPower,
    roastPoly,
    rorPoly,
    fanPoly: expandCurve(fan),
    curveName: displayName,
    inferredFlavors,
    manual: Boolean(intent.manualAnchors?.length),
    densityClass,
    densitySource,
    resolvedDensityGL,
    zones,
    family: pickRoastFamilyFromTotal(totalTime),
  };
}

export function downloadText(filename: string, text: string, type = "text/plain"): void {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function signed(n: number, unit: string, digits = 0): string {
  const v = Number(n.toFixed(digits));
  const abs = Math.abs(v);
  const shown = digits === 0 ? String(Math.round(abs)) : abs.toFixed(digits);
  const sign = v > 0 ? "+" : v < 0 ? "−" : "";
  return `${sign}${shown}${unit}`;
}
