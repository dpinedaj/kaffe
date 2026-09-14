import { expandCurve, formatClock, formatClockFine, levelToTemp, timeAtValue } from "./curve";
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

export type DiffField = {
  group: string;
  key: string;
  label: string;
  unit?: string;
  zeroIsEmpty?: boolean;
};

export const DIFF_FIELDS: DiffField[] = [
  { group: "Identity", key: "profile_short_name", label: "Name" },
  { group: "Identity", key: "profile_designer", label: "Designer" },
  { group: "Identity", key: "profile_schema_version", label: "Schema" },
  { group: "Identity", key: "profile_modified", label: "Modified" },
  { group: "Identity", key: "recommended_level", label: "Recommended" },
  { group: "Curve", key: "expect_fc", label: "First crack", unit: "°C", zeroIsEmpty: true },
  { group: "Curve", key: "expect_colrchange", label: "Colour change", unit: "°C", zeroIsEmpty: true },
  { group: "Preheat", key: "preheat_nominal_temperature", label: "Temp", unit: "°C" },
  { group: "Preheat", key: "preheat_power", label: "Power", unit: "W" },
  { group: "Preheat", key: "preheat_min_time", label: "Min time", unit: "s" },
  { group: "Preheat", key: "preheat_max_time", label: "Max time", unit: "s" },
  { group: "Preheat", key: "preheat_temperature_proximity", label: "Proximity", unit: "°C" },
  { group: "Power", key: "roast_required_power", label: "Required", unit: "W" },
  { group: "Power", key: "roast_target_in_future", label: "Target ahead", unit: "s" },
  { group: "Power", key: "roast_end_by_time_ratio", label: "End by time" },
  { group: "PID", key: "roast_PID_Kp", label: "Kp" },
  { group: "PID", key: "roast_PID_Ki", label: "Ki" },
  { group: "PID", key: "roast_PID_Kd", label: "Kd" },
  { group: "PID", key: "roast_min_desired_rate_of_rise", label: "Min RoR", unit: "°C/min" },
  { group: "Heat adj", key: "specific_heat_adj_lower_temperature_limit", label: "Lower", unit: "°C" },
  { group: "Heat adj", key: "specific_heat_adj_upper_temperature_limit", label: "Upper", unit: "°C" },
  { group: "Heat adj", key: "specific_heat_adj_multiplier_Kp", label: "×Kp" },
  { group: "Heat adj", key: "specific_heat_adj_multiplier_Kd", label: "×Kd" },
  { group: "Cooldown", key: "cooldown_hi_speed", label: "High", unit: "RPM" },
  { group: "Cooldown", key: "cooldown_lo_speed", label: "Low", unit: "RPM" },
  { group: "Cooldown", key: "cooldown_lo_temperature", label: "Until", unit: "°C" },
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

function isZeroish(raw: string | undefined): boolean {
  if (raw == null || raw.trim() === "") return true;
  const n = parseFloat(raw);
  return Number.isFinite(n) && n === 0;
}

export function formatDiffValue(field: DiffField, raw: string | undefined): string {
  if (field.zeroIsEmpty && isZeroish(raw)) return "—";
  return formatScalar(raw);
}

export function visibleDiffGroups(tracks: OverlayTrack[]): [string, DiffField[]][] {
  const map = new Map<string, DiffField[]>();
  for (const field of DIFF_FIELDS) {
    const list = map.get(field.group) ?? [];
    list.push(field);
    map.set(field.group, list);
  }
  return [...map.entries()].filter(([, fields]) => !isInactiveZoneGroup(fields, tracks));
}

function isInactiveZoneGroup(fields: DiffField[], tracks: OverlayTrack[]): boolean {
  const start = fields.find((f) => f.label === "Start");
  const end = fields.find((f) => f.label === "End");
  if (!start || !end) return false;
  return tracks.every((t) => isZeroish(t.profile.raw[start.key]) && isZeroish(t.profile.raw[end.key]));
}

export const DEFAULT_YELLOW_TEMP = 150;

export interface OverlayDetailRow {
  label: string;
  value: string;
}

export interface OverlayDetailSection {
  id: string;
  title: string;
  rows: OverlayDetailRow[];
}

export interface OverlayTrackSummary {
  name: string;
  kind: "profile" | "log";
  designer: string;
  description: string;
  fileName: string;
  headline: OverlayDetailRow[];
  sections: OverlayDetailSection[];
}

function parseNum(raw: string | undefined): number | null {
  if (raw == null || raw.trim() === "") return null;
  const n = parseFloat(raw);
  return Number.isFinite(n) ? n : null;
}

function parsePositive(raw: string | undefined): number | null {
  const n = parseNum(raw);
  return n != null && n !== 0 ? n : null;
}

function dash(value: string | null | undefined): string {
  const t = value?.trim();
  return t ? t : "—";
}

function formatTemp(n: number | null | undefined, digits = 1): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${n.toFixed(digits)} °C`;
}

function formatWatts(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return `${Math.round(n)} W`;
}

function atTempTime(temp: number | null | undefined, time: number | null | undefined): string {
  if (temp == null && time == null) return "—";
  if (temp == null) return formatClock(time!);
  if (time == null) return formatTemp(temp);
  return `${formatTemp(temp)} · ${formatClock(time)}`;
}

function formatDtr(fraction: number | null | undefined, percentEvent: number | null | undefined): string {
  if (percentEvent != null && Number.isFinite(percentEvent)) return `${percentEvent.toFixed(1)}%`;
  if (fraction == null || !Number.isFinite(fraction)) return "—";
  return `${(fraction * 100).toFixed(1)}%`;
}

export function summarizeOverlayTrack(track: OverlayTrack): OverlayTrackSummary {
  const profile = track.profile;
  const log = track.log;
  const raw = profile.raw;
  const header = log?.header ?? raw;
  const poly = expandCurve(profile.roast);
  const fan = expandCurve(profile.fan);
  const yellowTemp = parsePositive(raw.expect_colrchange) ?? DEFAULT_YELLOW_TEMP;
  const expectFc = parsePositive(raw.expect_fc);
  const dropTemp = levelToTemp(profile.roastLevels, track.level);
  const yellowTime = timeAtValue(poly, yellowTemp);
  const fcTimeDesign = expectFc != null ? timeAtValue(poly, expectFc) : null;
  const dropTimeDesign = dropTemp != null ? timeAtValue(poly, dropTemp) : null;
  const curveEnd = poly[poly.length - 1];
  const fanStart = fan.find((p) => p.v > 1000)?.v ?? fan[0]?.v ?? null;
  const fanEnd = [...fan].reverse().find((p) => p.v > 1000)?.v ?? fan[fan.length - 1]?.v ?? null;

  const actualFcTime = log?.firstCrack ?? null;
  const actualFcTemp =
    actualFcTime != null && log ? rowValueAtTime(log.rows, KLOG_COL.meanTemp, actualFcTime) : null;
  const actualDropTime = log?.roastEnd ?? null;
  const actualDropTemp =
    actualDropTime != null && log ? rowValueAtTime(log.rows, KLOG_COL.meanTemp, actualDropTime) : null;

  const fcTime = actualFcTime ?? fcTimeDesign;
  const fcTemp = actualFcTemp ?? expectFc;
  const dropTime = actualDropTime ?? dropTimeDesign ?? curveEnd?.t ?? null;
  const dropShown = actualDropTemp ?? dropTemp ?? curveEnd?.v ?? null;
  const dtr =
    fcTime != null && dropTime != null && dropTime > 0 ? Math.max(0, (dropTime - fcTime) / dropTime) : null;
  const recLevel = parseNum(raw.recommended_level);
  const designer = (profile.designer || header.profile_designer || "").trim();
  const description = profile.description.trim();
  const fileName = log ? (header.profile_file_name?.trim() || log.fileName) : profile.fileName;

  const headline: OverlayDetailRow[] = log
    ? [
        { label: "Drop", value: atTempTime(dropShown, dropTime) },
        { label: "First crack", value: atTempTime(fcTemp, fcTime) },
        { label: "DTR", value: formatDtr(dtr, log.developmentPercent) },
        { label: "Duration", value: dropTime != null ? formatClock(dropTime) : "—" },
      ]
    : [
        { label: "Drop", value: atTempTime(dropShown, dropTime) },
        { label: "First crack", value: expectFc != null ? atTempTime(expectFc, fcTimeDesign) : "—" },
        { label: "Preheat", value: formatTemp(parseNum(raw.preheat_nominal_temperature), 0) },
        {
          label: "Fan",
          value: fanStart != null ? `${Math.round(fanStart)} → ${Math.round(fanEnd ?? fanStart)}` : "—",
        },
      ];

  const identityRows: OverlayDetailRow[] = [
    { label: "Type", value: log ? "Measured log" : "Design profile" },
    { label: "File", value: dash(fileName) },
    { label: "Designer", value: dash(designer) },
    { label: "Schema", value: dash(header.profile_schema_version ?? raw.profile_schema_version) },
    { label: "Modified", value: dash(header.profile_modified ?? raw.profile_modified) },
    { label: "Recommended", value: recLevel != null ? `L${recLevel.toFixed(1)}` : "—" },
  ];
  if (log) {
    identityRows.push(
      { label: "Profile used", value: dash(header.profile_file_name) },
      { label: "Log file", value: dash(log.fileName) },
    );
  }

  const curveRows: OverlayDetailRow[] = [
    { label: "Yellow", value: atTempTime(yellowTemp, yellowTime) },
    {
      label: "First crack",
      value: log ? atTempTime(fcTemp, fcTime) : expectFc != null ? atTempTime(expectFc, fcTimeDesign) : "—",
    },
    { label: "Drop", value: atTempTime(dropShown, dropTime) },
    { label: "DTR", value: formatDtr(dtr, log?.developmentPercent) },
    { label: "Design length", value: curveEnd ? formatClock(curveEnd.t) : "—" },
    {
      label: "Fan",
      value: fanStart != null ? `${Math.round(fanStart)} → ${Math.round(fanEnd ?? fanStart)} RPM` : "—",
    },
    {
      label: "Roast levels",
      value: profile.roastLevels.length
        ? profile.roastLevels.map((v, i) => `L${i} ${v.toFixed(0)}`).join(" · ")
        : "—",
    },
  ];
  if (log) {
    const phases = computePhases(log);
    curveRows.splice(
      3,
      0,
      { label: "Dry end", value: phases.dryEnd != null ? formatClockFine(phases.dryEnd) : "—" },
      { label: "Maillard", value: phases.maillard != null ? formatClockFine(phases.maillard) : "—" },
      { label: "Development", value: phases.development != null ? formatClockFine(phases.development) : "—" },
    );
  }

  const minRor = parseNum(raw.roast_min_desired_rate_of_rise);
  const machineRows: OverlayDetailRow[] = [
    { label: "Preheat", value: formatTemp(parseNum(raw.preheat_nominal_temperature), 0) },
    { label: "Preheat power", value: formatWatts(parseNum(raw.preheat_power)) },
    {
      label: "Preheat window",
      value: (() => {
        const min = parseNum(raw.preheat_min_time);
        const max = parseNum(raw.preheat_max_time);
        if (min == null && max == null) return "—";
        return `${min ?? "—"}–${max ?? "—"} s`;
      })(),
    },
    { label: "Roast power", value: formatWatts(parseNum(raw.roast_required_power)) },
    { label: "Min RoR", value: minRor != null ? `${formatScalar(raw.roast_min_desired_rate_of_rise)} °C/min` : "—" },
    {
      label: "PID",
      value: `Kp ${formatScalar(raw.roast_PID_Kp)} · Ki ${formatScalar(raw.roast_PID_Ki)} · Kd ${formatScalar(raw.roast_PID_Kd)}`,
    },
    {
      label: "Heat adj band",
      value: `${formatTemp(parseNum(raw.specific_heat_adj_lower_temperature_limit), 0)}–${formatTemp(parseNum(raw.specific_heat_adj_upper_temperature_limit), 0)}`,
    },
    {
      label: "Heat adj gains",
      value: `×Kp ${formatScalar(raw.specific_heat_adj_multiplier_Kp)} · ×Kd ${formatScalar(raw.specific_heat_adj_multiplier_Kd)}`,
    },
    {
      label: "Cooldown",
      value:
        parseNum(raw.cooldown_hi_speed) != null
          ? `${Math.round(parseNum(raw.cooldown_hi_speed)!)} → ${Math.round(parseNum(raw.cooldown_lo_speed) ?? 0)} RPM to ${formatTemp(parseNum(raw.cooldown_lo_temperature), 0)}`
          : "—",
    },
    {
      label: "Target ahead",
      value: parseNum(raw.roast_target_in_future) != null ? `${parseNum(raw.roast_target_in_future)} s` : "—",
    },
  ];

  const zones = activeZones(raw);
  const zoneRows: OverlayDetailRow[] = zones.length
    ? zones.map((z) => ({
        label: z.label,
        value: [
          `${formatClock(z.start)}–${formatClock(z.end)}`,
          z.boost != null && z.boost !== 0 ? `boost ${z.boost > 0 ? "+" : ""}${z.boost}` : null,
          z.multiplierKp != null && z.multiplierKp !== 1 ? `×Kp ${z.multiplierKp}` : null,
          z.multiplierKd != null && z.multiplierKd !== 1 ? `×Kd ${z.multiplierKd}` : null,
        ]
          .filter(Boolean)
          .join(" · "),
      }))
    : [{ label: "Zones", value: "None active" }];

  const sections: OverlayDetailSection[] = [
    { id: "identity", title: "Identity", rows: identityRows },
    { id: "curve", title: log ? "Roast" : "Design curve", rows: curveRows },
    { id: "machine", title: "Machine", rows: machineRows },
    { id: "zones", title: "Boost zones", rows: zoneRows },
  ];

  if (log) {
    const dev = computeDeviationSummary(log);
    const load = parsePositive(header.boost_load_size);
    const fanMul = parseNum(header.boost_load_fan_multiplier);
    const powerMul = parseNum(header.boost_load_power_multiplier);
    const sessionRows: OverlayDetailRow[] = [
      { label: "Roasted", value: dash(header.roast_date) },
      {
        label: "Machine",
        value:
          [header.model, header.firmware_version ? `fw ${header.firmware_version}` : null].filter(Boolean).join(" · ") ||
          "—",
      },
      {
        label: "Load",
        value: load != null ? `${Math.round(load)} g` : dash(header.reference_load_size),
      },
      {
        label: "Fan / power scale",
        value: fanMul != null ? `×${fanMul.toFixed(3)} fan · ×${(powerMul ?? fanMul).toFixed(3)} power` : "—",
      },
      { label: "Ambient", value: formatTemp(parseNum(header.ambient_temperature)) },
      { label: "Mains", value: dash(header.mains_voltage) },
      { label: "Heater available", value: formatWatts(parseNum(header.heater_power_available)) },
      {
        label: "Hours",
        value:
          parseNum(header.motor_hours) != null
            ? `motor ${parseNum(header.motor_hours)!.toFixed(2)} · heater ${parseNum(header.heater_hours)?.toFixed(2) ?? "—"}`
            : "—",
      },
      { label: "Back-to-back", value: parseNum(header.back2back_count) != null ? String(parseNum(header.back2back_count)) : "—" },
      {
        label: "Max above",
        value: dev.maxAbove ? `${dev.maxAbove.value.toFixed(2)} °C @ ${formatClock(dev.maxAbove.t)}` : "—",
      },
      {
        label: "Max below",
        value: dev.maxBelow ? `${dev.maxBelow.value.toFixed(2)} °C @ ${formatClock(dev.maxBelow.t)}` : "—",
      },
      { label: "Converged", value: dev.converged != null ? formatClock(dev.converged) : "never inside ±3 °C" },
      { label: "At end", value: dev.atEnd != null ? `${dev.atEnd.toFixed(2)} °C` : "—" },
    ];
    sections.splice(2, 0, { id: "session", title: "Session", rows: sessionRows });
  }

  return {
    name: track.name,
    kind: track.kind,
    designer,
    description,
    fileName,
    headline,
    sections,
  };
}

export function defaultLevel(profile: KproProfile, log?: RoastLog): number {
  if (log && log.roastingLevel > 0) return log.roastingLevel;
  return recommendedLevel(profile);
}
