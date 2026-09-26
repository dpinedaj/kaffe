import type { BrewMethod, Grind } from "./brew";

/**
 * Two-axis cup check after Barista Hustle’s Coffee Compass (Perger): sour ↔ bitter is
 * extraction, weak ↔ strong is strength. Works without a refractometer.
 */
export type TasteBalance = "sour" | "balanced" | "bitter";
export type TasteStrength = "weak" | "right" | "strong";

export const BALANCES: TasteBalance[] = ["sour", "balanced", "bitter"];
export const STRENGTHS: TasteStrength[] = ["weak", "right", "strong"];

export interface TasteEntry {
  at: string;
  /** Which roast / bag this cup came from (Brew attach key). */
  lot: string;
  lotLabel?: string;
  method: BrewMethod;
  technique?: string;
  balance: TasteBalance;
  strength: TasteStrength;
  stars?: number;
  note?: string;
}

export interface TasteTip {
  key: "taste.tip.finer" | "taste.tip.coarser" | "taste.tip.stronger" | "taste.tip.weaker" | "taste.tip.keep";
  vars?: Record<string, string | number>;
}

const KEY = "kaffe.taste.v1";
const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];

function step(grind: Grind, dir: 1 | -1): Grind {
  const i = Math.max(0, Math.min(GRINDS.length - 1, GRINDS.indexOf(grind) + dir));
  return GRINDS[i];
}

/** Next-cup moves: extraction first (grind / time / temperature), then strength (ratio). */
export function tasteTips(
  balance: TasteBalance,
  strength: TasteStrength,
  recipe: { grind: Grind; ratioN: number; method: BrewMethod },
): TasteTip[] {
  const tips: TasteTip[] = [];
  const shot = recipe.method === "espresso";
  if (balance === "sour") tips.push({ key: "taste.tip.finer", vars: { grind: step(recipe.grind, 1) } });
  if (balance === "bitter") tips.push({ key: "taste.tip.coarser", vars: { grind: step(recipe.grind, -1) } });
  const r = recipe.ratioN;
  const fmt = (n: number) => `1:${Math.round(n * 10) / 10}`;
  if (strength === "weak") tips.push({ key: "taste.tip.stronger", vars: { ratio: fmt(shot ? r * 0.9 : r * 0.93) } });
  if (strength === "strong") tips.push({ key: "taste.tip.weaker", vars: { ratio: fmt(shot ? r * 1.1 : r * 1.07) } });
  if (!tips.length) tips.push({ key: "taste.tip.keep" });
  return tips;
}

export function loadTastes(): TasteEntry[] {
  try {
    const raw = typeof localStorage === "undefined" ? null : localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as TasteEntry[]) : [];
    return Array.isArray(parsed) ? parsed.filter((x) => x && x.lot && x.balance && x.strength) : [];
  } catch {
    return [];
  }
}

export function saveTaste(entry: TasteEntry): TasteEntry[] {
  const next = [entry, ...loadTastes()].slice(0, 120);
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* quota / private mode */
  }
  return next;
}

export function tastesForLot(lot: string, items = loadTastes()): TasteEntry[] {
  return items.filter((x) => x.lot === lot);
}
