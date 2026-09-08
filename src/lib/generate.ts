import { expandCurve, formatClock, levelToTemp, rebuildFromAnchors, rorSeries, sampleAtTime, timeAtValue } from "./curve";
import {
  flavorById,
  originById,
  varietyById,
  STYLES,
  type BrewId,
  type DensityClass,
  type FlavorId,
  type OriginInfo,
  type ProcessId,
  type RoastStyleId,
  type VarietyInfo,
} from "./knowledge";
import { encodeKpro, parseKpro, type KproProfile, type Point } from "./kpro";
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
  /** When true (default), boost windows are inferred from bean, flavor, and design RoR. */
  autoZones?: boolean;
  zones?: ZoneSet;
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
  preheatPower: number;
  roastPoly: Point[];
  rorPoly: Point[];
  fanPoly: Point[];
  curveName: string;
  inferredFlavors: FlavorPick[];
  manual: boolean;
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
 * Rao: enter crack already decelerating; do not slam heat at FC. So +boost is before/at
 * the moisture dump, −boost only after crack if the design RoR is still hot.
 */
export function suggestedZones(
  firstCrackTime: number,
  totalTime: number,
  intent: RoastIntent,
  rorPoly: Point[] = [],
  densityClass: DensityClass = "medium",
): ZoneSet {
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
  if (rorFc < 8) fcScore += 2;
  else if (rorFc < 10) fcScore += 1;
  if (rorDrop > 4) fcScore += 1.5;
  if (intent.roastStyle === "dark") fcScore -= 1;
  const wantIntoFc = fcScore >= 3 || (rorFc < 7.5 && fcScore >= 2);
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

function applyTimeMorph(points: Point[], dry: number, mid: number, dev: number, fcT: number): Point[] {
  const fc = fcT;
  return points.map((p) => {
    let t = p.t;
    if (p.t < 150) t += dry * (p.t / 150);
    else if (p.t < fc) t += dry + mid * ((p.t - 150) / Math.max(1, fc - 150));
    else t += dry + mid + dev * ((p.t - fc) / Math.max(1, 540 - fc));
    return { t: Math.max(1, t), v: p.v };
  });
}

function curveName(intent: RoastIntent): string {
  const origin = originById(intent.originId);
  const variety = varietyById(intent.varietyId);
  const proc =
    intent.process === "natural" ? "NAT" : intent.process === "washed" ? "WSH" : intent.process === "honey" ? "HNY" : "AN";
  const alt = intent.altitudeM >= 2000 ? "2-2.7k" : intent.altitudeM >= 1500 ? "1.5-2k" : "0-1.5k";
  const style = intent.roastStyle === "light" ? "L" : intent.roastStyle === "medium" ? "M" : "D";
  const brew = intent.brew === "filter" ? "F" : intent.brew === "espresso" ? "E" : intent.brew === "cupping" ? "C" : "O";
  const code = origin.shortCode ?? origin.name.slice(0, 3).toUpperCase();
  const varCode = variety.id !== "unknown" && variety.shortCode ? `-${variety.shortCode}` : "";
  return `${brew}-${proc} ${alt} ${style} ${code}${varCode}`;
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

/** Official Nano 7 pattern: hold ~14700 RPM, then decline ~1500 RPM into development. */
export const FAN_HOLD_RPM = 14700;
export const FAN_END_RPM = 13200;
const FAN_MIN = 12000;
const FAN_MAX = 16800;

function clampRpm(n: number): number {
  return Math.round(Math.max(FAN_MIN, Math.min(FAN_MAX, n)));
}

export function buildOfficialFanAnchors(
  totalTime: number,
  firstCrackTime: number,
  rpmOffset: number,
  earlyExtra = 0,
  lateExtra = 0,
): Point[] {
  const endT = Math.max(180, totalTime);
  const holdT = Math.max(90, Math.min(endT - 45, firstCrackTime > 0 ? firstCrackTime : endT * 0.62));
  const startT = Math.max(8, Math.min(22, endT * 0.04));
  const hold = clampRpm(FAN_HOLD_RPM + rpmOffset + earlyExtra);
  const end = clampRpm(FAN_END_RPM + rpmOffset + lateExtra);
  return [
    { t: startT, v: hold },
    { t: holdT, v: hold },
    { t: endT, v: Math.min(hold, end) },
  ];
}

export function inferStyleFromCurve(dtr: number, endTemp: number): RoastStyleId {
  if (dtr < 0.145 || endTemp < 210) return "light";
  if (dtr > 0.22 || endTemp > 216) return "dark";
  return "medium";
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
    level: 2.2,
    flavors: [],
  };
}

function morphAnchors(baseAnchors: Point[], total: Adjustment): Point[] {
  const fcGuess = 374 + total.fcTemp * 2;
  return applyTimeMorph(baseAnchors, total.dryingS, total.midS, total.developmentS, fcGuess).map((p, i, arr) => {
    const last = i === arr.length - 1;
    return { t: p.t, v: p.v + (last ? total.fcTemp * 0.4 : 0) };
  });
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
  const beanAnchors = morphAnchors(base.roast.anchors, beanAdj);

  let flavorAdj = flavorAdjustment(intent.flavors);
  let roastAnchors: Point[];
  if (intent.manualAnchors && intent.manualAnchors.length >= 3) {
    roastAnchors = intent.manualAnchors.map((p) => ({ t: p.t, v: p.v }));
    flavorAdj = inferAdjustmentFromAnchors(roastAnchors, beanAnchors, 204 + beanAdj.fcTemp);
  } else {
    roastAnchors = morphAnchors(base.roast.anchors, add(beanAdj, flavorAdj));
  }
  const total = add(beanAdj, flavorAdj);
  const roast = rebuildFromAnchors(roastAnchors);
  const roastPoly = expandCurve(roast);
  const autoFirstCrackTemp = 204 + total.fcTemp;
  const firstCrackTemp =
    intent.expectFc != null && Number.isFinite(intent.expectFc)
      ? Math.max(185, Math.min(222, intent.expectFc))
      : autoFirstCrackTemp;
  const densitySource = isAutoDensity(intent) ? "altitude" : "measured";
  const densityClass = classifyDensity(resolvedDensityGL);
  let endTemp = levelToTemp(base.roastLevels, level) ?? 212;
  if (intent.manualAnchors) {
    endTemp = roastAnchors[roastAnchors.length - 1]?.v ?? endTemp;
  }
  const totalTime = timeAtValue(roastPoly, endTemp) ?? roastAnchors[roastAnchors.length - 1].t;
  const firstCrackTime = timeAtValue(roastPoly, firstCrackTemp) ?? totalTime * 0.86;
  const rorPoly = rorSeries(roastPoly);
  const zones = resolveZones(intent, firstCrackTime, totalTime, rorPoly, densityClass);
  const earlyExtra = variety.beanSize === "large" ? 280 : variety.beanSize === "small" ? -40 : 0;
  const lateExtra = intent.roastStyle === "dark" ? -100 : intent.roastStyle === "light" ? 80 : 0;
  const fan = rebuildFromAnchors(buildOfficialFanAnchors(totalTime, firstCrackTime, total.fanRpm, earlyExtra, lateExtra));
  const dtr = totalTime > 0 ? Math.max(0.08, (totalTime - firstCrackTime) / totalTime) : 0.14;
  const preheatPower = Math.round(Math.max(700, Math.min(1400, 820 + total.preheatW)));
  const inferredFlavors = intent.manualAnchors ? inferFlavorsFromAdjustment(flavorAdj) : intent.flavors;

  const name = intent.name?.trim() || curveName(intent);
  const flavorsLabel = intent.flavors.map((f) => flavorById(f.id).name).join(" + ") || "bean default";
  const description = [
    `${origin.name} · ${variety.name} · ${intent.process} · ${intent.altitudeM}m${
      intent.moisture != null ? ` · ${intent.moisture}% H₂O` : ""
    } · ${Math.round(resolvedDensityGL)} g/L · ${intent.brew} · ${intent.roastStyle}`,
    `Flavor: ${flavorsLabel}`,
    `Generated by Kaffe for Nano 7.`,
  ].join("\n");

  const profile: KproProfile = {
    ...base,
    name: name.replace(/\s+/g, "_").slice(0, 17),
    fileName: `${name.replace(/\s+/g, "_")}.kpro`,
    designer: "Kaffe",
    description,
    roast,
    fan,
    raw: {
      ...base.raw,
      profile_short_name: name.replace(/\s+/g, "_").slice(0, 17),
      profile_designer: "Kaffe",
      recommended_level: level.toFixed(1),
      preheat_power: preheatPower.toFixed(1),
      roast_required_power: String(Math.max(preheatPower, 1100)),
      expect_fc: firstCrackTemp.toFixed(1),
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
    preheatPower,
    roastPoly,
    rorPoly,
    fanPoly: expandCurve(fan),
    curveName: name,
    inferredFlavors,
    manual: Boolean(intent.manualAnchors?.length),
    densityClass,
    densitySource,
    resolvedDensityGL,
    zones,
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
