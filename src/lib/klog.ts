import { kproFromRaw, parseRoastLevels, type KproProfile } from "./kpro";

export interface KlogEvent {
  key: string;
  t: number;
}

export interface RoastLog {
  fileName: string;
  name: string;
  header: Record<string, string>;
  events: KlogEvent[];
  rows: number[][];
  firstCrack: number | null;
  roastEnd: number;
  endReason: number;
  developmentPercent: number | null;
  roastingLevel: number;
  roastLevels: number[];
  design: KproProfile;
  aborted: boolean;
}

export const KLOG_COL = {
  time: 0,
  spotTemp: 1,
  temp: 2,
  meanTemp: 3,
  profile: 4,
  profileROR: 5,
  actualROR: 6,
  desiredROR: 7,
  powerKW: 8,
  actualFanRPM: 13,
} as const;

export function rowValueAtTime(rows: number[][], valueCol: number, t: number): number | null {
  if (rows.length === 0) return null;
  const timeCol = KLOG_COL.time;
  if (t < rows[0][timeCol] || t > rows[rows.length - 1][timeCol]) return null;
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (t >= a[timeCol] && t <= b[timeCol]) {
      if (b[timeCol] === a[timeCol]) return a[valueCol];
      const f = (t - a[timeCol]) / (b[timeCol] - a[timeCol]);
      return a[valueCol] + f * (b[valueCol] - a[valueCol]);
    }
  }
  return rows[rows.length - 1][valueCol];
}

export function klogValueAt(log: RoastLog, col: number, t: number): number | null {
  if (t > log.roastEnd) return null;
  return rowValueAtTime(log.rows, col, t);
}

export function firstUpwardCrossing(rows: number[][], valueCol: number, threshold: number): number | null {
  const timeCol = KLOG_COL.time;
  for (let i = 0; i + 1 < rows.length; i++) {
    const a = rows[i];
    const b = rows[i + 1];
    if (a[valueCol] < threshold && b[valueCol] >= threshold) {
      if (b[valueCol] === a[valueCol]) return a[timeCol];
      const f = (threshold - a[valueCol]) / (b[valueCol] - a[valueCol]);
      return a[timeCol] + f * (b[timeCol] - a[timeCol]);
    }
  }
  return null;
}

export const DEFAULT_DRY_END_TEMP = 150;

export function defaultDryEndTemp(log: RoastLog): number {
  const v = parseFloat(log.header.expect_colrchange ?? "");
  return Number.isFinite(v) && v !== 0 ? v : DEFAULT_DRY_END_TEMP;
}

function lastEventValue(events: KlogEvent[], key: string): number | null {
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].key === key) return events[i].t;
  }
  return null;
}

export function parseKlog(text: string, fileName: string): RoastLog {
  const header: Record<string, string> = {};
  const events: KlogEvent[] = [];
  const rows: number[][] = [];

  for (const rawLine of text.split("\n")) {
    const line = rawLine.replace(/\r$/, "");
    if (!line.trim()) continue;

    if (line.startsWith("!")) {
      const idx = line.indexOf(":");
      if (idx === -1) continue;
      const key = line.slice(1, idx).trim();
      const value = parseFloat(line.slice(idx + 1));
      if (Number.isFinite(value)) events.push({ key, t: value });
      continue;
    }

    const colonIdx = line.indexOf(":");
    if (colonIdx !== -1) {
      header[line.slice(0, colonIdx).trim()] = line.slice(colonIdx + 1);
      continue;
    }

    const parts = line.split("\t").filter((s) => s.trim() !== "");
    if (parts.length === 0) continue;
    const nums = parts.map((s) => parseFloat(s));
    if (!Number.isFinite(nums[0])) continue;
    rows.push(nums);
  }

  const stem = fileName.replace(/\.klog$/i, "");
  const profileName = header.profile_file_name?.trim().replace(/\.kpro$/i, "");
  const name = profileName ? `${stem} (${profileName})` : stem;
  const firstCrack = lastEventValue(events, "first_crack");
  const roastEnd = lastEventValue(events, "roast_end") ?? 0;
  const endReason = lastEventValue(events, "roast_end_reason") ?? 0;

  return {
    fileName,
    name,
    header,
    events,
    rows,
    firstCrack,
    roastEnd,
    endReason,
    developmentPercent: lastEventValue(events, "development_percent"),
    roastingLevel: parseFloat(header.roasting_level ?? "") || 0,
    roastLevels: parseRoastLevels(header.roast_levels),
    design: kproFromRaw(header, name, fileName),
    aborted: endReason !== 0 || roastEnd < 60,
  };
}
