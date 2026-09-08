import { expandCurve, levelToTemp, timeAtValue } from "./curve";
import type { Point } from "./kpro";
import {
  defaultDryEndTemp,
  firstUpwardCrossing,
  KLOG_COL,
  rowValueAtTime,
  type RoastLog,
} from "./klog";
import { activeZones, recommendedLevel, type ActiveZone, type KproProfile } from "./kpro";

export const DEVIATION_BAND = 3;
export const DEVIATION_SUMMARY_START = 30;
export const DEFAULT_ALIGN_TEMP = 200;

export interface Phases {
  dryEnd: number | null;
  maillard: number | null;
  development: number | null;
  dtr: number | null;
}

export interface DeviationSummary {
  maxAbove: { value: number; t: number } | null;
  maxBelow: { value: number; t: number } | null;
  converged: number | null;
  atEnd: number | null;
}

export type AlignRefCol = "meanTemp" | "temp" | "spotTemp";

export interface OverlayTrack {
  id: string;
  kind: "profile" | "log";
  color: string;
  name: string;
  profile: KproProfile;
  log?: RoastLog;
  level: number;
}

export const PALETTE = ["#0A84FF", "#FF9F0A", "#BF5AF2", "#30D158", "#FF453A", "#64D2FF"];

export function computePhasesAt(log: RoastLog, dryEndTemp: number, fcTime: number | null): Phases {
  const dryEnd = firstUpwardCrossing(log.rows, KLOG_COL.meanTemp, dryEndTemp);
  const maillard = fcTime != null && dryEnd != null ? fcTime - dryEnd : null;
  const development = fcTime != null ? log.roastEnd - fcTime : null;
  const dtr = development != null && log.roastEnd > 0 ? development / log.roastEnd : null;
  return { dryEnd, maillard, development, dtr };
}

export function computePhases(log: RoastLog, dryEndTemp = defaultDryEndTemp(log)): Phases {
  return computePhasesAt(log, dryEndTemp, log.firstCrack);
}

export function defaultAlignTemp(log: RoastLog): number {
  if (log.firstCrack != null) {
    const v = rowValueAtTime(log.rows, KLOG_COL.meanTemp, log.firstCrack);
    if (v != null) return Math.round(v * 10) / 10;
  }
  const expectFc = parseFloat(log.header.expect_fc ?? "");
  if (Number.isFinite(expectFc) && expectFc !== 0) return expectFc;
  return DEFAULT_ALIGN_TEMP;
}

export function deviationSeries(log: RoastLog): Point[] {
  const out: Point[] = [];
  for (const row of log.rows) {
    const t = row[KLOG_COL.time];
    if (t > log.roastEnd) continue;
    out.push({ t, v: row[KLOG_COL.meanTemp] - row[KLOG_COL.profile] });
  }
  return out;
}

export function computeDeviationSummary(
  log: RoastLog,
  band = DEVIATION_BAND,
  startT = DEVIATION_SUMMARY_START,
): DeviationSummary {
  const series = deviationSeries(log).filter((p) => p.t >= startT);
  if (series.length === 0) return { maxAbove: null, maxBelow: null, converged: null, atEnd: null };

  let maxAbove = series[0];
  let maxBelow = series[0];
  let lastViolation = -1;
  series.forEach((p, i) => {
    if (p.v > maxAbove.v) maxAbove = p;
    if (p.v < maxBelow.v) maxBelow = p;
    if (Math.abs(p.v) >= band) lastViolation = i;
  });
  const converged = lastViolation === series.length - 1 ? null : series[lastViolation + 1].t;
  const meanEnd = rowValueAtTime(log.rows, KLOG_COL.meanTemp, log.roastEnd);
  const profileEnd = rowValueAtTime(log.rows, KLOG_COL.profile, log.roastEnd);
  const atEnd = meanEnd != null && profileEnd != null ? meanEnd - profileEnd : null;
  return {
    maxAbove: { value: maxAbove.v, t: maxAbove.t },
    maxBelow: { value: maxBelow.v, t: maxBelow.t },
    converged,
    atEnd,
  };
}

export function alignOffset(
  log: RoastLog,
  temp: number,
  col: AlignRefCol = "meanTemp",
): number | null {
  const idx = KLOG_COL[col];
  return firstUpwardCrossing(log.rows, idx, temp);
}

export function designEndTime(profile: KproProfile, level: number): number | null {
  const poly = expandCurve(profile.roast);
  const temp = levelToTemp(profile.roastLevels, level);
  if (temp == null) return null;
  return timeAtValue(poly, temp);
}

export function trackZones(track: OverlayTrack): ActiveZone[] {
  return activeZones(track.profile.raw);
}

export const DIFF_FIELDS: { group: string; key: string; label: string; unit?: string }[] = [
  { group: "Preheat", key: "preheat_nominal_temperature", label: "Temp", unit: "°C" },
  { group: "Preheat", key: "preheat_power", label: "Power", unit: "W" },
  { group: "PID", key: "roast_PID_Kp", label: "Kp" },
  { group: "PID", key: "roast_PID_Ki", label: "Ki" },
  { group: "PID", key: "roast_PID_Kd", label: "Kd" },
  { group: "Zone 1", key: "zone1_time_start", label: "Start", unit: "s" },
  { group: "Zone 1", key: "zone1_time_end", label: "End", unit: "s" },
  { group: "Zone 1", key: "zone1_boost", label: "boost" },
  { group: "Zone 1", key: "zone1_multiplier_Kp", label: "×Kp" },
  { group: "Zone 1", key: "zone1_multiplier_Kd", label: "×Kd" },
  { group: "Zone 2", key: "zone2_time_start", label: "Start", unit: "s" },
  { group: "Zone 2", key: "zone2_time_end", label: "End", unit: "s" },
  { group: "Zone 2", key: "zone2_boost", label: "boost" },
  { group: "Zone 2", key: "zone2_multiplier_Kp", label: "×Kp" },
  { group: "Zone 2", key: "zone2_multiplier_Kd", label: "×Kd" },
  { group: "Zone 3", key: "zone3_time_start", label: "Start", unit: "s" },
  { group: "Zone 3", key: "zone3_time_end", label: "End", unit: "s" },
  { group: "Zone 3", key: "zone3_boost", label: "boost" },
  { group: "Corner 1", key: "corner1_time_start", label: "Start", unit: "s" },
  { group: "Corner 1", key: "corner1_time_end", label: "End", unit: "s" },
  { group: "Other", key: "recommended_level", label: "Recommended level" },
];

export function formatScalar(raw: string | undefined): string {
  if (raw == null || raw.trim() === "") return "—";
  const isPureNumber = /^-?\d+(\.\d+)?$/.test(raw.trim());
  const n = parseFloat(raw);
  if (isPureNumber && Number.isFinite(n)) {
    return Number.isInteger(n) ? String(n) : String(parseFloat(n.toFixed(4)));
  }
  return raw.trim();
}

export function defaultLevel(profile: KproProfile, log?: RoastLog): number {
  if (log && log.roastingLevel > 0) return log.roastingLevel;
  return recommendedLevel(profile);
}
