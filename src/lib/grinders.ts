import { bedResistsDose, type BrewMethod, type Grind } from "./brew";
import { GRINDER_CATALOG } from "./grinders.catalog";

const KEY = "kaffe.grinder";

/** Honest Coffee Guide brew-method bands, used as a starting card — not a lock. */
export type GrindBandId =
  | "espresso"
  | "moka"
  | "aeropress"
  | "v60"
  | "pourOver"
  | "steep"
  | "frenchPress"
  | "coldBrew"
  | "cupping";

export type SettingKind = "clicks" | "dial" | "niche" | "dotted" | "letters" | "rotation" | "label";

export interface GrindBand {
  lo: number;
  hi: number;
}

export interface Grinder {
  id: string;
  brand: string;
  name: string;
  kind: SettingKind;
  /** How to read the number: clicks from chirp, Baratza step, Niche ring… */
  unit: string;
  note?: string;
  source: string;
  minSafe?: number;
  /**
   * `letters`: micro letters per macro number (Vario A–W = 23); stored as (macro − 1) × steps + letter.
   * `rotation`: numbers per full turn (Eureka Mignon 0–5 = 6); stored as turns × steps + number.
   */
  steps?: number;
  /** `rotation` only: how HCG writes turn and number, "1+3.5" or "1/30". */
  sep?: "+" | "/";
  aliases?: string[];
  bands: Partial<Record<GrindBandId, GrindBand>>;
}

export interface GrindSetting {
  grinder: Grinder;
  band: GrindBandId;
  lo: number;
  hi: number;
  at: number;
  label: string;
}

/** Position inside an HCG *method* band. The band is already V60 / steep / espresso — do not sit on the fine edge. */
const GRIND_T: Record<Grind, number> = {
  fine: 0.3,
  "medium-fine": 0.45,
  medium: 0.58,
  "medium-coarse": 0.74,
  coarse: 0.9,
};

const BRAND_ALIASES: Record<string, string[]> = {
  "1Zpresso": ["1z", "1zpresso"],
  "Breville (Sage)": ["breville", "sage"],
  Timemore: ["timemore", "chestnut"],
  Turin: ["turin", "df64", "df54", "df83"],
  KINGrinder: ["kingrinder", "king"],
  "Mahlkönig": ["mahlkonig", "mahlkoenig", "ek43"],
  "Cera+": ["cera", "cera+", "cge", "cge01"],
  Flair: ["flair", "royal"],
  "Option-O": ["option-o", "lagom"],
};

/** Honest Coffee Guide starting settings. Zero / chirp is burrs touching unless noted. */
export const GRINDERS: Grinder[] = GRINDER_CATALOG;

/**
 * Mills the maker sells for filter, not espresso. HCG still extrapolates an
 * espresso band for them from the micron chart, but the steps are too coarse
 * (or the burrs too loose) to dial a shot — the ESP sibling is the espresso one.
 */
export const FILTER_ONLY_GRINDERS: ReadonlySet<string> = new Set([
  "baratza-encore",
  "baratza-maestro",
  "baratza-maestro-plus",
  "baratza-starbucks-barista",
  "baratza-virtuoso",
  "baratza-virtuoso-plus",
  "capresso-infinity",
  "capresso-infinity-plus",
  "bellelife-electric-coffee-grinder",
  "cores-cone-grinder-c330",
  "fellow-ode-brew-grinder-gen-1",
  "fellow-ode-brew-grinder-gen-2",
  "fuji-royal-r-220",
  "hario-mini-mill-plus",
  "hario-mini-mill-slim",
  "hario-mini-mill-slim-pro",
  "hario-smart-g",
  "hario-v60-evc-8b",
  "hario-v60-evcg-8b-e",
  "javapresse-manual-coffee-grinder",
  "melitta-molino",
  "oxo-conical-burr-coffee-grinder",
  "wilfa-balance",
  "wilfa-svart",
  "wilfa-svart-aroma",
  "1zpresso-jx",
  "1zpresso-jx-s",
  "1zpresso-zp6",
  "1zpresso-zp6-special",
  "kingrinder-p0",
  "kingrinder-p1",
  "kingrinder-p2",
  "timemore-c2",
  "timemore-c2-fold",
  "timemore-c2-max",
  "timemore-c2-max-pro",
  "timemore-c3",
  "timemore-c3-max",
  "timemore-c3-max-pro",
  "timemore-c3-pro",
  "timemore-c3s",
  "timemore-c3s-pro",
  "timemore-c5-pro",
  "timemore-g1",
  "timemore-g1-plus",
  "timemore-nano",
  "timemore-slim",
  "timemore-x-millab-m01",
  "timemore-sculptor-064",
  "timemore-sculptor-078",
  "xbloom-studio",
]);

export function grinderById(id: string | undefined): Grinder | undefined {
  if (!id) return undefined;
  return GRINDERS.find((g) => g.id === id);
}

/** Can dial a shot: charted espresso band and not a filter-only mill. */
export function grindsEspresso(g: Grinder): boolean {
  return g.bands.espresso != null && !FILTER_ONLY_GRINDERS.has(g.id);
}

/** Espresso lists espresso-capable mills only; every other method takes any charted grinder. */
export function grinderFitsMethod(g: Grinder, method: BrewMethod): boolean {
  if (method === "espresso") return grindsEspresso(g);
  return true;
}

export function grindersForMethod(method: BrewMethod): Grinder[] {
  return GRINDERS.filter((g) => grinderFitsMethod(g, method));
}

export function grindersByBrand(pool: Grinder[] = GRINDERS): { brand: string; grinders: Grinder[] }[] {
  const map = new Map<string, Grinder[]>();
  for (const g of pool) {
    const list = map.get(g.brand) ?? [];
    list.push(g);
    map.set(g.brand, list);
  }
  return [...map.entries()].map(([brand, grinders]) => ({ brand, grinders }));
}

export function normalizeGrindQuery(raw: string): string {
  return raw
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, " ")
    .trim();
}

function haystack(g: Grinder): string {
  const extra = BRAND_ALIASES[g.brand] ?? [];
  return normalizeGrindQuery([g.brand, g.name, g.id, ...(g.aliases ?? []), ...extra].join(" "));
}

/** Levenshtein distance, bailing out once it passes `max`. */
function editDistanceWithin(a: string, b: string, max: number): boolean {
  if (Math.abs(a.length - b.length) > max) return false;
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let rowMin = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      rowMin = Math.min(rowMin, v);
    }
    if (rowMin > max) return false;
    prev = cur;
  }
  return prev[b.length] <= max;
}

/** Substring, the same with spaces squeezed out ("c3esp"), or one typo on a whole word ("chesnut"). */
function tokenHits(token: string, hay: string, compactHay: string, words: string[]): boolean {
  if (hay.includes(token) || compactHay.includes(token)) return true;
  if (token.length < 4) return false;
  return words.some((w) => w.length >= 4 && editDistanceWithin(token, w, 1));
}

export function searchGrinders(query: string, pool: Grinder[] = GRINDERS): Grinder[] {
  const q = normalizeGrindQuery(query);
  if (!q) return pool;
  const tokens = q.split(" ");
  const hits = pool.filter((g) => {
    const hay = haystack(g);
    const compactHay = hay.replace(/\s+/g, "");
    const words = hay.split(" ");
    return tokens.every((t) => tokenHits(t, hay, compactHay, words));
  });
  const compact = q.replace(/\s+/g, "");
  return hits.sort((a, b) => scoreGrinder(b, compact) - scoreGrinder(a, compact));
}

function scoreGrinder(g: Grinder, compact: string): number {
  const id = normalizeGrindQuery(g.id).replace(/\s+/g, "");
  const name = normalizeGrindQuery(g.name).replace(/\s+/g, "");
  const brand = normalizeGrindQuery(g.brand).replace(/\s+/g, "");
  if (id === compact || name === compact) return 100;
  if (name.startsWith(compact)) return 80;
  if (brand.startsWith(compact)) return 60;
  if (id.includes(compact)) return 40;
  return 10;
}

export function bandForMethod(method: BrewMethod): GrindBandId {
  if (method === "espresso") return "espresso";
  if (method === "moka") return "moka";
  if (method === "aeropress") return "aeropress";
  if (method === "frenchpress") return "frenchPress";
  if (method === "coldbrew") return "coldBrew";
  if (method === "cupping") return "cupping";
  if (method === "siphon") return "steep";
  if (method === "batch") return "pourOver";
  if (method === "chemex") return "pourOver";
  if (method === "switch" || method === "clever") return "steep";
  return "v60";
}

/** Pour-over, espresso, moka, Switch, Clever: bed depth moves grind. Full immersion does not. */
export function grindFollowsDose(method: BrewMethod): boolean {
  return bedResistsDose(method);
}

/**
 * Extra band position from cup dose vs the card. Residual after the recipe word
 * already jumped at 1.45× / 0.7×, so we do not double-count.
 */
export function doseGrindT(
  method: BrewMethod,
  coffeeG: number | undefined,
  cardDoseG: number | undefined,
): number {
  if (!grindFollowsDose(method)) return 0;
  if (coffeeG == null || cardDoseG == null || !(cardDoseG > 0) || !(coffeeG > 0)) return 0;
  let r = coffeeG / cardDoseG;
  if (r >= 1.45) r /= 1.45;
  else if (r <= 0.7) r /= 0.7;
  if (Math.abs(Math.log(r)) < 0.04) return 0;
  const t = 0.35 * Math.log(r);
  return Math.max(-0.14, Math.min(0.14, t));
}

export function settingAt(lo: number, hi: number, grind: Grind, minSafe?: number, extraT = 0): number {
  let t = (GRIND_T[grind] ?? 0.52) + extraT;
  t = Math.max(0.18, Math.min(0.94, t));
  let at = lo + t * (hi - lo);
  if (minSafe != null) at = Math.max(minSafe, at);
  return at;
}

export function formatDotted(ticks: number): string {
  const t = Math.max(0, Math.round(ticks));
  const r = Math.floor(t / 100);
  const n = Math.floor((t % 100) / 10);
  const c = t % 10;
  return `${r}.${n}.${c}`;
}

function formatLetters(value: number, steps: number): string {
  const v = Math.max(0, Math.round(value));
  return `${Math.floor(v / steps) + 1}${String.fromCharCode(65 + (v % steps))}`;
}

function formatRotation(value: number, steps: number, sep: string): string {
  const v = Math.max(0, Math.round(value * 2) / 2);
  const turns = Math.floor(v / steps);
  const n = v - turns * steps;
  const num = Number.isInteger(n) ? String(n) : n.toFixed(1);
  return turns > 0 ? `${turns}${sep}${num}` : num;
}

export function formatSetting(value: number, kind: SettingKind, grinder?: Pick<Grinder, "steps" | "sep">): string {
  if (kind === "dotted") return formatDotted(value);
  if (kind === "letters" && grinder?.steps) return formatLetters(value, grinder.steps);
  if (kind === "rotation" && grinder?.steps) return formatRotation(value, grinder.steps, grinder.sep ?? "+");
  if (kind === "niche") return String(Math.round(value));
  const rounded = Math.round(value * 2) / 2;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function resolveGrindSetting(
  grinderId: string | undefined,
  method: BrewMethod,
  grind: Grind,
  dose?: { coffeeG?: number; cardDoseG?: number; nudgeT?: number },
): GrindSetting | undefined {
  const grinder = grinderById(grinderId);
  if (!grinder || grinder.kind === "label" || !grinderFitsMethod(grinder, method)) return undefined;
  const bandId = bandForMethod(method);
  const range = grinder.bands[bandId];
  if (!range) return undefined;
  const extraT = doseGrindT(method, dose?.coffeeG, dose?.cardDoseG) + (dose?.nudgeT ?? 0);
  const at = settingAt(range.lo, range.hi, grind, grinder.minSafe, extraT);
  const mid = formatSetting(at, grinder.kind, grinder);
  const lo = formatSetting(range.lo, grinder.kind, grinder);
  const hi = formatSetting(range.hi, grinder.kind, grinder);
  const noun = grinder.kind === "clicks" ? "clicks" : "";
  const core = noun ? `${mid} ${noun}` : mid;
  const label = lo === hi ? core : `${core} · ${lo}–${hi}`;
  return { grinder, band: bandId, lo: range.lo, hi: range.hi, at, label };
}

export function grindNoteWithSetting(grindNote: string, setting: GrindSetting | undefined): string {
  if (!setting) return grindNote;
  return `${grindNote} · ${setting.label}`;
}

export function loadKitchenGrinder(): string | undefined {
  if (typeof localStorage === "undefined") return undefined;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return undefined;
    return grinderById(raw) ? raw : undefined;
  } catch {
    return undefined;
  }
}

export function saveKitchenGrinder(id: string | undefined): void {
  if (typeof localStorage === "undefined") return;
  try {
    if (!id) localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, id);
  } catch {
    /* quota / private mode */
  }
}
