export interface Point {
  t: number;
  v: number;
}

export interface BezierSegment {
  start: Point;
  cp1: Point;
  cp2: Point;
  end: Point;
}

export interface CurveData {
  anchors: Point[];
  segments: BezierSegment[];
}

export type ZoneKey = "zone1" | "zone2" | "zone3" | "corner1";

export interface ActiveZone {
  key: ZoneKey;
  label: string;
  start: number;
  end: number;
  boost: number | null;
  multiplierKp: number | null;
  multiplierKd: number | null;
}

export interface KproProfile {
  name: string;
  fileName: string;
  designer: string;
  description: string;
  roast: CurveData;
  fan: CurveData;
  roastLevels: number[];
  raw: Record<string, string>;
}

export const KPRO_KEY_ORDER = [
  "profile_short_name",
  "profile_designer",
  "profile_description",
  "profile_schema_version",
  "emulation_mode",
  "recommended_level",
  "expect_fc",
  "expect_colrchange",
  "preheat_power",
  "preheat_nominal_temperature",
  "preheat_min_power_offset",
  "preheat_min_time",
  "preheat_max_time",
  "preheat_check_gradient_time",
  "preheat_target_in_future",
  "preheat_mode",
  "preheat_end_detection_count",
  "preheat_temperature_proximity",
  "roast_required_power",
  "roast_min_desired_rate_of_rise",
  "roast_target_in_future",
  "roast_use_prediction_method",
  "roast_target_timeshift",
  "roast_end_by_time_ratio",
  "roast_PID_Kp",
  "roast_PID_Ki",
  "roast_PID_Kd",
  "roast_PID_min_i",
  "roast_PID_max_i",
  "roast_PID_iLimitApplyAtZero",
  "roast_PID_differentialOnError",
  "specific_heat_adj_upper_temperature_limit",
  "specific_heat_adj_lower_temperature_limit",
  "specific_heat_adj_multiplier_Kp",
  "specific_heat_adj_multiplier_Kd",
  "zone1_time_start",
  "zone1_time_end",
  "zone1_multiplier_Kp",
  "zone1_multiplier_Kd",
  "zone1_boost",
  "zone2_time_start",
  "zone2_time_end",
  "zone2_multiplier_Kp",
  "zone2_multiplier_Kd",
  "zone2_boost",
  "zone3_time_start",
  "zone3_time_end",
  "zone3_multiplier_Kp",
  "zone3_multiplier_Kd",
  "zone3_boost",
  "corner1_time_start",
  "corner1_time_end",
  "cooldown_hi_speed",
  "cooldown_lo_speed",
  "cooldown_lo_temperature",
  "roast_levels",
  "profile_modified",
  "roast_profile",
  "fan_profile",
] as const;

export function parseLines(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    if (!line.trim()) continue;
    const idx = line.indexOf(":");
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    out[key] = line.slice(idx + 1).replace(/\r$/, "");
  }
  return out;
}

export function toPairs(csv: string | undefined): Point[] {
  if (!csv) return [];
  const nums = csv
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
  const pairs: Point[] = [];
  for (let i = 0; i + 1 < nums.length; i += 2) {
    pairs.push({ t: nums[i], v: nums[i + 1] });
  }
  return pairs.filter((p) => p.t > 0);
}

export function buildCurve(csv: string | undefined): CurveData {
  const pairs = toPairs(csv);
  const groups: Point[][] = [];
  for (let i = 0; i + 2 < pairs.length + 1; i += 3) {
    const g = pairs.slice(i, i + 3);
    if (g.length === 3) groups.push(g);
  }
  const anchors = groups.map((g) => g[0]);
  const segments: BezierSegment[] = [];

  for (let i = 0; i + 1 < groups.length; i++) {
    const [cp1, cp2] = [groups[i][1], groups[i][2]].sort((a, b) => a.t - b.t);
    segments.push({
      start: groups[i][0],
      cp1,
      cp2,
      end: groups[i + 1][0],
    });
  }

  if (groups.length > 0) {
    const lastAnchor = anchors[anchors.length - 1];
    const [cp, finalAnchor] = [groups[groups.length - 1][1], groups[groups.length - 1][2]].sort(
      (a, b) => a.t - b.t,
    );
    if (finalAnchor.t > lastAnchor.t) {
      segments.push({ start: lastAnchor, cp1: cp, cp2: cp, end: finalAnchor });
      anchors.push(finalAnchor);
    }
  }

  return { anchors, segments };
}

export function parseRoastLevels(csv: string | undefined): number[] {
  if (!csv) return [];
  return csv
    .split(",")
    .map((s) => parseFloat(s.trim()))
    .filter((n) => Number.isFinite(n));
}

function num(raw: Record<string, string>, key: string): number | null {
  const v = raw[key];
  if (v == null) return null;
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : null;
}

const ZONE_DEFS: { key: ZoneKey; label: string }[] = [
  { key: "zone1", label: "Z1" },
  { key: "zone2", label: "Z2" },
  { key: "zone3", label: "Z3" },
  { key: "corner1", label: "C1" },
];

export function activeZones(raw: Record<string, string>): ActiveZone[] {
  const out: ActiveZone[] = [];
  for (const { key, label } of ZONE_DEFS) {
    const start = num(raw, `${key}_time_start`);
    const end = num(raw, `${key}_time_end`);
    if (start == null || end == null || end <= start) continue;
    out.push({
      key,
      label,
      start,
      end,
      boost: num(raw, `${key}_boost`),
      multiplierKp: num(raw, `${key}_multiplier_Kp`),
      multiplierKd: num(raw, `${key}_multiplier_Kd`),
    });
  }
  return out;
}

export function kproFromRaw(raw: Record<string, string>, name: string, fileName: string): KproProfile {
  return {
    name,
    fileName,
    designer: raw.profile_designer?.trim() ?? "",
    description: (raw.profile_description ?? "").replace(/\\v/g, "\n"),
    roast: buildCurve(raw.roast_profile),
    fan: buildCurve(raw.fan_profile),
    roastLevels: parseRoastLevels(raw.roast_levels),
    raw,
  };
}

export function parseKpro(text: string, fileName: string): KproProfile {
  const raw = parseLines(text);
  const shortName = raw.profile_short_name?.trim();
  return kproFromRaw(raw, shortName || fileName.replace(/\.kpro$/i, ""), fileName);
}

function encodePairs(pairs: Point[]): string {
  return pairs.map((p) => `${trimNum(p.t)},${trimNum(p.v)}`).join(",");
}

function trimNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  const s = n.toFixed(10).replace(/\.?0+$/, "");
  return s === "-0" ? "0" : s;
}

/** Encode a curve as Kaffelogic 3-pair groups: [anchor, later-cp, earlier-cp]. */
export function encodeCurve(curve: CurveData, padValue: number): string {
  const anchors = [...curve.anchors].sort((a, b) => a.t - b.t);
  if (anchors.length === 0) return `${padValue === 20 ? "0.0,20.0" : `0.0,${padValue}`},0,0.0`;

  const pairs: Point[] = [];
  const bodyAnchors =
    curve.segments.length > 0 &&
    anchors.length >= 2 &&
    curve.segments[curve.segments.length - 1].end.t === anchors[anchors.length - 1].t
      ? anchors.slice(0, -1)
      : anchors;

  for (let i = 0; i < bodyAnchors.length; i++) {
    const start = bodyAnchors[i];
    const next = anchors[i + 1] ?? curve.segments[i]?.end;
    const seg = curve.segments[i];
    let later: Point;
    let earlier: Point;
    if (seg && next) {
      const cps = [seg.cp1, seg.cp2].sort((a, b) => a.t - b.t);
      earlier = cps[0];
      later = cps[1] ?? next;
    } else if (next) {
      const midT = start.t + (next.t - start.t) * 0.4;
      const midT2 = start.t + (next.t - start.t) * 0.75;
      earlier = { t: midT, v: start.v + (next.v - start.v) * 0.4 };
      later = { t: midT2, v: start.v + (next.v - start.v) * 0.75 };
    } else {
      earlier = { t: start.t + 20, v: start.v + 2 };
      later = { t: start.t + 40, v: start.v + 4 };
    }
    pairs.push(start, later, earlier);
  }

  const head = padValue === 20 ? "0.0,20.0,0,0.0," : `0.0,${trimNum(padValue)},0,0.0,`;
  return head + encodePairs(pairs) + ",0,0.0";
}

export function formatModified(date = new Date()): string {
  const dd = String(date.getUTCDate()).padStart(2, "0");
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const yyyy = date.getUTCFullYear();
  const hh = String(date.getUTCHours()).padStart(2, "0");
  const mi = String(date.getUTCMinutes()).padStart(2, "0");
  const ss = String(date.getUTCSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss} UTC`;
}

export function encodeKpro(profile: KproProfile): string {
  const raw: Record<string, string> = { ...profile.raw };
  raw.profile_short_name = profile.name;
  raw.profile_designer = profile.designer || raw.profile_designer || "Kaffe";
  raw.profile_description = profile.description.replace(/\n/g, "\\v");
  raw.roast_levels = profile.roastLevels.join(",");
  raw.roast_profile = encodeCurve(profile.roast, 20);
  const fanPad = profile.fan.anchors[0]?.v ?? 14700;
  raw.fan_profile = encodeCurve(profile.fan, fanPad);
  raw.profile_modified = formatModified();

  const keys = [...KPRO_KEY_ORDER] as string[];
  for (const key of Object.keys(raw)) {
    if (!keys.includes(key)) keys.push(key);
  }

  return keys
    .filter((key) => raw[key] != null && raw[key] !== "")
    .map((key) => `${key}:${raw[key]}`)
    .join("\n")
    .concat("\n");
}

export function recommendedLevel(profile: KproProfile): number {
  const n = parseFloat(profile.raw.recommended_level ?? "");
  return Number.isFinite(n) ? n : 3;
}
