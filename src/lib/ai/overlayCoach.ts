import {
  FLAVORS,
  ORIGINS,
  VARIETIES,
  type BrewId,
  type FlavorId,
  type ProcessId,
  type RoastStyleId,
} from "../knowledge";
import type { DrinkPlan, FlavorPick, RoastIntent } from "../generate";
import { computeDeviationSummary, computePhases, DIFF_FIELDS, type OverlayTrack } from "../overlay";

export const FLAVOR_IDS: FlavorId[] = FLAVORS.map((f) => f.id);
const PROCESS_IDS: ProcessId[] = ["natural", "washed", "honey", "anaerobic", "other"];
const BREW_IDS: BrewId[] = ["filter", "espresso", "omni", "cupping"];
const STYLE_IDS: RoastStyleId[] = ["light", "medium", "dark"];
const DRINK_IDS: DrinkPlan[] = ["rest", "rtd"];

export interface OverlayCoachReply {
  feedback: string;
  intentPatch: Partial<RoastIntent> | null;
}

export interface OverlayCoachChatTurn {
  role: "user" | "assistant";
  text: string;
}

/** True only in `vite` / `npm run dev`. Production / GitHub Pages is always false. */
export function isLocalAiUiEnabled(): boolean {
  return import.meta.env.DEV;
}

export function buildOverlayReviewContext(tracks: OverlayTrack[]): Record<string, unknown> {
  return {
    tracks: tracks.map((t) => {
      const log = t.log;
      const phases = log ? computePhases(log) : null;
      const deviation = log ? computeDeviationSummary(log) : null;
      const scalars: Record<string, string> = {};
      for (const field of DIFF_FIELDS) {
        const v = t.profile.raw[field.key];
        if (v != null && v !== "") scalars[field.key] = v;
      }
      return {
        name: t.name,
        kind: t.kind,
        level: t.level,
        expectFc: t.profile.raw.expect_fc ?? null,
        preheatPower: t.profile.raw.preheat_power ?? null,
        recommendedLevel: t.profile.raw.recommended_level ?? null,
        scalars,
        log: log
          ? {
              roastEndS: log.roastEnd,
              firstCrackS: log.firstCrack,
              roastingLevel: log.roastingLevel,
              aborted: log.aborted,
              phases,
              deviation,
            }
          : null,
      };
    }),
    allowed: {
      originIds: ORIGINS.map((o) => o.id),
      varietyIds: VARIETIES.map((v) => v.id),
      processes: PROCESS_IDS,
      brews: BREW_IDS,
      roastStyles: STYLE_IDS,
      drinkPlans: DRINK_IDS,
      flavorIds: FLAVOR_IDS,
    },
    rules: [
      "Do not change batch size; BOOST firmware scales fan and heat from the 120 g curve.",
      "Do not emit roast_profile Bézier points. Only bean intent fields.",
      "At most two flavors. Prefer Rest unless the user asked for drink-now / RTD.",
      "A boost is °C/min on RoR-error, not the BOOST kit.",
    ],
  };
}

export function parseCoachReply(raw: string): OverlayCoachReply {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidates = [fenced?.[1]?.trim(), trimmed];
  for (const candidate of candidates) {
    if (!candidate) continue;
    try {
      const parsed = JSON.parse(candidate) as unknown;
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) continue;
      const obj = parsed as Record<string, unknown>;
      const feedback =
        typeof obj.feedback === "string" && obj.feedback.trim()
          ? obj.feedback.trim()
          : trimmed;
      const intentPatch = sanitizeIntentPatch(obj.intentPatch);
      return { feedback, intentPatch };
    } catch {
      /* try next */
    }
  }
  return { feedback: trimmed || "No reply.", intentPatch: null };
}

export function applyIntentPatch(base: RoastIntent, patch: Partial<RoastIntent> | null): RoastIntent {
  if (!patch) return { ...base, flavors: [...base.flavors] };
  const next: RoastIntent = { ...base, flavors: [...base.flavors] };

  if (typeof patch.originId === "string" && ORIGINS.some((o) => o.id === patch.originId)) {
    next.originId = patch.originId;
  }
  if (typeof patch.varietyId === "string" && VARIETIES.some((v) => v.id === patch.varietyId)) {
    next.varietyId = patch.varietyId;
  }
  if (isProcess(patch.process)) next.process = patch.process;
  if (isFiniteNumber(patch.altitudeM)) next.altitudeM = clamp(patch.altitudeM, 400, 2600);
  if (patch.moisture === undefined) {
    /* keep */
  } else if (patch.moisture == null) {
    delete next.moisture;
  } else if (isFiniteNumber(patch.moisture)) {
    next.moisture = clamp(patch.moisture, 8, 16);
  }
  if (typeof patch.autoDensity === "boolean") next.autoDensity = patch.autoDensity;
  if (isFiniteNumber(patch.densityGL)) {
    next.densityGL = clamp(patch.densityGL, 580, 800);
    next.autoDensity = false;
  }
  if (isFiniteNumber(patch.expectFc)) next.expectFc = clamp(patch.expectFc, 190, 220);
  if (typeof patch.autoZones === "boolean") next.autoZones = patch.autoZones;
  if (isDrink(patch.drinkPlan)) next.drinkPlan = patch.drinkPlan;
  if (isBrew(patch.brew)) next.brew = patch.brew;
  if (isStyle(patch.roastStyle)) next.roastStyle = patch.roastStyle;
  if (typeof patch.autoLevel === "boolean") next.autoLevel = patch.autoLevel;
  if (isFiniteNumber(patch.level)) next.level = clamp(patch.level, 0, 6);
  if (typeof patch.name === "string" && patch.name.trim()) next.name = patch.name.trim().slice(0, 40);
  if (Array.isArray(patch.flavors)) next.flavors = sanitizeFlavors(patch.flavors);

  return next;
}

function sanitizeIntentPatch(raw: unknown): Partial<RoastIntent> | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const applied = applyIntentPatch(
    {
      originId: ORIGINS[0].id,
      varietyId: VARIETIES[0].id,
      process: "washed",
      altitudeM: 1500,
      brew: "filter",
      roastStyle: "light",
      autoLevel: true,
      autoDensity: true,
      autoZones: true,
      drinkPlan: "rest",
      level: 2.2,
      flavors: [],
    },
    raw as Partial<RoastIntent>,
  );
  const patch: Partial<RoastIntent> = {};
  const src = raw as Record<string, unknown>;
  if ("originId" in src) patch.originId = applied.originId;
  if ("varietyId" in src) patch.varietyId = applied.varietyId;
  if ("process" in src) patch.process = applied.process;
  if ("altitudeM" in src) patch.altitudeM = applied.altitudeM;
  if ("moisture" in src) patch.moisture = applied.moisture;
  if ("autoDensity" in src) patch.autoDensity = applied.autoDensity;
  if ("densityGL" in src) patch.densityGL = applied.densityGL;
  if ("expectFc" in src) patch.expectFc = applied.expectFc;
  if ("autoZones" in src) patch.autoZones = applied.autoZones;
  if ("drinkPlan" in src) patch.drinkPlan = applied.drinkPlan;
  if ("brew" in src) patch.brew = applied.brew;
  if ("roastStyle" in src) patch.roastStyle = applied.roastStyle;
  if ("autoLevel" in src) patch.autoLevel = applied.autoLevel;
  if ("level" in src) patch.level = applied.level;
  if ("name" in src) patch.name = applied.name;
  if ("flavors" in src) patch.flavors = applied.flavors;
  return Object.keys(patch).length ? patch : null;
}

function sanitizeFlavors(raw: FlavorPick[]): FlavorPick[] {
  const out: FlavorPick[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const id = (item as FlavorPick).id;
    if (!FLAVOR_IDS.includes(id)) continue;
    const weight = isFiniteNumber((item as FlavorPick).weight) ? clamp((item as FlavorPick).weight, 0, 1) : 1;
    if (weight < 0.15) continue;
    if (out.some((x) => x.id === id)) continue;
    out.push({ id, weight: Number(weight.toFixed(2)) });
    if (out.length >= 2) break;
  }
  return out;
}

function isProcess(v: unknown): v is ProcessId {
  return typeof v === "string" && (PROCESS_IDS as string[]).includes(v);
}
function isBrew(v: unknown): v is BrewId {
  return typeof v === "string" && (BREW_IDS as string[]).includes(v);
}
function isStyle(v: unknown): v is RoastStyleId {
  return typeof v === "string" && (STYLE_IDS as string[]).includes(v);
}
function isDrink(v: unknown): v is DrinkPlan {
  return typeof v === "string" && (DRINK_IDS as string[]).includes(v);
}
function isFiniteNumber(v: unknown): v is number {
  return typeof v === "number" && Number.isFinite(v);
}
function clamp(n: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, n));
}
