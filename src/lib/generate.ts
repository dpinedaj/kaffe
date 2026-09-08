import { expandCurve, levelToTemp, rorSeries, timeAtValue } from "./curve";
import {
  flavorById,
  originById,
  STYLES,
  type BrewId,
  type FlavorId,
  type OriginInfo,
  type ProcessId,
  type RoastStyleId,
} from "./knowledge";
import { encodeKpro, parseKpro, type KproProfile, type Point } from "./kpro";
import { BASELINE_KPRO } from "./template";

export interface FlavorPick {
  id: FlavorId;
  weight: number;
}

export interface RoastIntent {
  originId: string;
  process: ProcessId;
  altitudeM: number;
  moisture?: number;
  brew: BrewId;
  roastStyle: RoastStyleId;
  autoLevel: boolean;
  level: number;
  flavors: FlavorPick[];
  name?: string;
}

export interface Adjustment {
  fcTemp: number;
  preheatW: number;
  dryingS: number;
  midS: number;
  developmentS: number;
  fanS: number;
}

export interface AdjustmentBreakdown {
  origin: Adjustment;
  flavor: Adjustment;
  total: Adjustment;
}

export interface GeneratedRoast {
  profile: KproProfile;
  kproText: string;
  breakdown: AdjustmentBreakdown;
  firstCrackTemp: number;
  firstCrackTime: number;
  totalTime: number;
  dtr: number;
  preheatPower: number;
  roastPoly: Point[];
  rorPoly: Point[];
  fanPoly: Point[];
  curveName: string;
}

const ZERO: Adjustment = {
  fcTemp: 0,
  preheatW: 0,
  dryingS: 0,
  midS: 0,
  developmentS: 0,
  fanS: 0,
};

function add(a: Adjustment, b: Adjustment): Adjustment {
  return {
    fcTemp: a.fcTemp + b.fcTemp,
    preheatW: a.preheatW + b.preheatW,
    dryingS: a.dryingS + b.dryingS,
    midS: a.midS + b.midS,
    developmentS: a.developmentS + b.developmentS,
    fanS: a.fanS + b.fanS,
  };
}

function scale(a: Adjustment, w: number): Adjustment {
  return {
    fcTemp: a.fcTemp * w,
    preheatW: a.preheatW * w,
    dryingS: a.dryingS * w,
    midS: a.midS * w,
    developmentS: a.developmentS * w,
    fanS: a.fanS * w,
  };
}

const FLAVOR_DELTA: Record<FlavorId, Adjustment> = {
  fruity: { fcTemp: -1, preheatW: 18, dryingS: -4, midS: -8, developmentS: -18, fanS: 2 },
  lightSweet: { fcTemp: 0, preheatW: 8, dryingS: -2, midS: 4, developmentS: -6, fanS: 0 },
  deepSweet: { fcTemp: 1, preheatW: -6, dryingS: 4, midS: 12, developmentS: 10, fanS: -2 },
  bright: { fcTemp: -1.5, preheatW: 16, dryingS: -6, midS: -6, developmentS: -14, fanS: 3 },
  juicy: { fcTemp: -0.5, preheatW: 10, dryingS: -2, midS: 2, developmentS: -8, fanS: 1 },
  winey: { fcTemp: 0, preheatW: 4, dryingS: 8, midS: 4, developmentS: -6, fanS: 0 },
  floral: { fcTemp: -2, preheatW: 12, dryingS: -3, midS: -10, developmentS: -16, fanS: 2 },
  body: { fcTemp: 1.5, preheatW: -4, dryingS: 6, midS: 10, developmentS: 14, fanS: -4 },
  clean: { fcTemp: 0, preheatW: 6, dryingS: 0, midS: -2, developmentS: -4, fanS: 1 },
  balance: { fcTemp: 0, preheatW: 2, dryingS: 0, midS: 0, developmentS: 0, fanS: 0 },
};

function originAdjustment(origin: OriginInfo, process: ProcessId, altitudeM: number, brew: BrewId): Adjustment {
  let adj: Adjustment = { ...ZERO };
  if (origin.density === "hard") adj = add(adj, { ...ZERO, preheatW: 10, dryingS: 3, midS: -5, fcTemp: -1 });
  if (origin.density === "soft") adj = add(adj, { ...ZERO, preheatW: -20, dryingS: -8, fanS: 4 });
  if (process === "washed") adj = add(adj, { ...ZERO, dryingS: -6, midS: -4, developmentS: -4, fcTemp: -0.5 });
  if (process === "natural") adj = add(adj, { ...ZERO, dryingS: 4, midS: 4 });
  if (process === "honey") adj = add(adj, { ...ZERO, midS: 6, developmentS: 2 });
  if (process === "anaerobic") adj = add(adj, { ...ZERO, dryingS: 6, developmentS: -8 });
  if (altitudeM >= 1800) adj = add(adj, { ...ZERO, preheatW: 15, dryingS: 4, fcTemp: -0.5 });
  if (altitudeM < 1300) adj = add(adj, { ...ZERO, preheatW: -15, dryingS: -6 });
  if (brew === "filter") adj = add(adj, { ...ZERO, developmentS: -6 });
  if (brew === "espresso") adj = add(adj, { ...ZERO, developmentS: 8, midS: 4 });
  if (brew === "cupping") adj = add(adj, { ...ZERO, developmentS: 4, fcTemp: 0.5 });
  return adj;
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

function rebuildFromAnchors(anchors: Point[]): KproProfile["roast"] {
  const segs = [];
  for (let i = 0; i + 1 < anchors.length; i++) {
    const a = anchors[i];
    const b = anchors[i + 1];
    segs.push({
      start: a,
      cp1: { t: a.t + (b.t - a.t) * 0.35, v: a.v + (b.v - a.v) * 0.35 },
      cp2: { t: a.t + (b.t - a.t) * 0.7, v: a.v + (b.v - a.v) * 0.7 },
      end: b,
    });
  }
  return { anchors, segments: segs };
}

function curveName(intent: RoastIntent): string {
  const origin = originById(intent.originId);
  const proc =
    intent.process === "natural" ? "NAT" : intent.process === "washed" ? "WSH" : intent.process === "honey" ? "HNY" : "AN";
  const alt = intent.altitudeM >= 2000 ? "2-2.7k" : intent.altitudeM >= 1500 ? "1.5-2k" : "0-1.5k";
  const style = intent.roastStyle === "light" ? "L" : intent.roastStyle === "medium" ? "M" : "D";
  const brew = intent.brew === "filter" ? "F" : intent.brew === "espresso" ? "E" : intent.brew === "cupping" ? "C" : "O";
  return `${brew}-${proc} ${alt} ${style} ${origin.name.slice(0, 3).toUpperCase()}`;
}

export function defaultIntent(): RoastIntent {
  return {
    originId: "ethiopia",
    process: "natural",
    altitudeM: 2200,
    brew: "filter",
    roastStyle: "light",
    autoLevel: true,
    level: 2.2,
    flavors: [],
  };
}

export function generateProfile(intent: RoastIntent): GeneratedRoast {
  const origin = originById(intent.originId);
  const style = STYLES.find((s) => s.id === intent.roastStyle) ?? STYLES[0];
  const level = intent.autoLevel ? style.level : intent.level;
  const originAdj = originAdjustment(origin, intent.process, intent.altitudeM, intent.brew);
  const flavorAdj = flavorAdjustment(intent.flavors);
  const total = add(originAdj, flavorAdj);

  const base = parseKpro(BASELINE_KPRO, "baseline.kpro");
  const fcGuess = 374 + total.fcTemp * 2;
  const roastAnchors = applyTimeMorph(base.roast.anchors, total.dryingS, total.midS, total.developmentS, fcGuess).map(
    (p, i, arr) => {
      const last = i === arr.length - 1;
      return { t: p.t, v: p.v + (last ? total.fcTemp * 0.4 : 0) };
    },
  );
  const fanAnchors = applyTimeMorph(base.fan.anchors, 0, 0, total.fanS, fcGuess);

  const roast = rebuildFromAnchors(roastAnchors);
  const fan = rebuildFromAnchors(fanAnchors);
  const roastPoly = expandCurve(roast);
  const endTemp = levelToTemp(base.roastLevels, level) ?? 212;
  const totalTime = timeAtValue(roastPoly, endTemp) ?? roastAnchors[roastAnchors.length - 1].t;
  const firstCrackTemp = 204 + total.fcTemp;
  const firstCrackTime = timeAtValue(roastPoly, firstCrackTemp) ?? totalTime * 0.86;
  const dtr = totalTime > 0 ? Math.max(0.08, (totalTime - firstCrackTime) / totalTime) : 0.14;
  const preheatPower = Math.round(Math.max(700, Math.min(1400, 820 + total.preheatW)));

  const name = intent.name?.trim() || curveName(intent);
  const flavorsLabel = intent.flavors.map((f) => flavorById(f.id).name).join(" + ") || "bean default";
  const description = [
    `${origin.name} ${intent.process} · ${intent.altitudeM}m · ${intent.brew} · ${intent.roastStyle}`,
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
      zone2_time_start: String(Math.max(240, 300 + total.midS)),
      zone2_time_end: String(Math.max(250, 315 + total.midS + total.developmentS * 0.3)),
      zone2_boost: String(total.preheatW > 10 ? 3 : total.developmentS > 8 ? -2 : 1),
    },
  };

  return {
    profile,
    kproText: encodeKpro(profile),
    breakdown: { origin: originAdj, flavor: flavorAdj, total },
    firstCrackTemp,
    firstCrackTime,
    totalTime,
    dtr,
    preheatPower,
    roastPoly,
    rorPoly: rorSeries(roastPoly),
    fanPoly: expandCurve(fan),
    curveName: name,
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
