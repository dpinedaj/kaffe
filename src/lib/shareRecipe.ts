import type { Locale } from "../i18n/translate";
import { BREW_METHODS, recipeOrigin, techniquesFor, type BrewRecipe, type BrewStep, type Grind } from "./brew";
import { normalizeRecipe, youOrigin, type UserBrewRecipe } from "./brewRecipes";
import {
  CARD_FIELDS,
  cardBody,
  cardSteps,
  parseCardBody,
  specBody,
  specTechnique,
  type CardSpec,
} from "./cardCode";

/**
 * A recipe travels in the link's #fragment, which browsers never send to the server.
 * - "c.<card>" a built-in card: only the numbers its steps are built from (cardCode.ts), so the
 *   recipient reads the steps in their own language. "c.<card>~<name>[~t90~c18…]" is one of My
 *   recipes whose steps still match the card it started from, with any changed numbers after the name.
 * - "m." base64url(deflate-raw(JSON)) for My recipes: the card it started from plus only what you
 *   changed — unchanged steps are indexes into the card. "n." is the same JSON uncompressed, used
 *   when that is shorter or CompressionStream is missing.
 * - "z." / "j." full recipe JSON, from the first version of sharing. Still read, no longer written.
 */
const HASH_KEY = "r";
const LOCALES: Locale[] = ["en", "es"];
const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];

type StepCode = number | [string, string, string];
const NUMERIC = ["c", "r", "t", "d", "g", "y"] as const;
type NumericKey = (typeof NUMERIC)[number];

/** Only what differs from the card a recipe started from (or everything, for one written from scratch). */
interface MinePayload {
  /** Card code it started from. */
  b?: string;
  /** Method, when there is no card. */
  k?: string;
  n: string;
  f?: string;
  h?: string;
  /** Source credit, when it is not "You · date". */
  o?: string;
  /** forkedFrom, when it differs from the card's credit ("" for none). */
  p?: string;
  /** Gaggiuino profile, when it differs from the card's ("" for none). */
  q?: string;
  c?: number;
  r?: number;
  t?: number;
  d?: number;
  g?: number;
  y?: number;
  /** Steps: a number is that step of the card, an array is a written step. Omitted when it is the card's steps as-is. */
  s?: StepCode[];
}

function toBase64Url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function fromBase64Url(text: string): Uint8Array {
  const b64 = text.replace(/-/g, "+").replace(/_/g, "/");
  const bin = atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function pipe(bytes: Uint8Array, stream: CompressionStream | DecompressionStream): Promise<Uint8Array> {
  const out = new Blob([new Uint8Array(bytes)]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(out).arrayBuffer());
}

function sameStep(a: BrewStep, b: BrewStep): boolean {
  return a.at === b.at && a.title === b.title && a.detail === b.detail;
}

function matches(steps: BrewStep[], base: BrewStep[]): number {
  return steps.filter((s) => base.some((b) => sameStep(s, b))).length;
}

interface Base {
  spec: CardSpec;
  /** Language the recipe's steps were written in, so unchanged ones are found in the card. */
  locale: Locale;
  steps: BrewStep[];
}

function bestLocale(spec: CardSpec, steps: BrewStep[]): Base {
  let best: Base | undefined;
  let bestScore = -1;
  for (const locale of LOCALES) {
    const built = cardSteps(spec, locale);
    const score = matches(steps, built);
    if (score > bestScore) {
      best = { spec, locale, steps: built };
      bestScore = score;
    }
  }
  return best!;
}

/**
 * Recipes saved before they remembered their card: find the card from the credit, the numbers and
 * the step text. Only accepted when at least half of the steps match it word for word.
 */
function inferBase(recipe: UserBrewRecipe): Base | undefined {
  if (!recipe.forkedFrom || recipe.steps.length === 0) return undefined;
  const techs = techniquesFor(recipe.method)
    .map((x) => x.id as string | undefined)
    .concat(undefined)
    .filter((id) => recipeOrigin(recipe.method, id) === recipe.forkedFrom);
  if (techs.length === 0) return undefined;
  const text = recipe.steps.map((s) => s.detail).join(" ");
  const kettles = new Set([recipe.wantedC, ...[...text.matchAll(/(\d{2,3}(?:\.\d)?) °C/g)].map((m) => Number(m[1]))]);
  const bypassG = recipe.bypassG || undefined;
  const waterG = Math.round(recipe.coffeeG * recipe.ratioN) - (bypassG ?? 0);
  let best: Base | undefined;
  let bestScore = 0;
  for (const technique of techs) {
    for (const kettleC of kettles) {
      for (const roastStyle of ["light", "medium", "dark"] as const) {
        for (const gassy of [false, true]) {
          for (const natural of [false, true]) {
            const spec: CardSpec = {
              method: recipe.method,
              technique,
              coffeeG: recipe.coffeeG,
              ratioN: recipe.ratioN,
              waterG,
              bypassG,
              kettleC,
              timeS: recipe.timeS,
              grind: recipe.grind,
              gassy,
              natural,
              roastStyle,
            };
            const found = bestLocale(spec, recipe.steps);
            const score = matches(recipe.steps, found.steps);
            if (score > bestScore) {
              best = found;
              bestScore = score;
            }
          }
        }
      }
    }
  }
  return best && bestScore * 2 >= recipe.steps.length ? best : undefined;
}

function baseOf(recipe: UserBrewRecipe): Base | undefined {
  const spec = recipe.base ? parseCardBody(recipe.base) : null;
  return spec && spec.method === recipe.method ? bestLocale(spec, recipe.steps) : inferBase(recipe);
}

function escapeName(name: string): string {
  return encodeURIComponent(name).replace(/~/g, "%7E");
}

function payloadFor(recipe: UserBrewRecipe, base: Base | undefined): MinePayload {
  const p: MinePayload = { n: recipe.name };
  if (recipe.flavor) p.f = recipe.flavor;
  if (recipe.mechanic) p.h = recipe.mechanic;
  // "You · date" / "Shared · date" are re-stamped on the other phone, so only a real credit travels.
  if (!/^(You|Shared) ·/.test(recipe.origin)) p.o = recipe.origin;
  if (!base) {
    p.k = recipe.method;
    p.c = recipe.coffeeG;
    p.r = recipe.ratioN;
    p.t = recipe.wantedC;
    p.d = recipe.timeS;
    p.g = GRINDS.indexOf(recipe.grind);
    if (recipe.bypassG) p.y = recipe.bypassG;
    if (recipe.forkedFrom) p.p = recipe.forkedFrom;
    if (recipe.gaggiuino) p.q = recipe.gaggiuino;
    p.s = recipe.steps.map((s) => [s.at, s.title, s.detail]);
    return p;
  }
  const { spec } = base;
  p.b = specBody(spec);
  if (recipe.coffeeG !== spec.coffeeG) p.c = recipe.coffeeG;
  if (recipe.ratioN !== spec.ratioN) p.r = recipe.ratioN;
  if (recipe.wantedC !== spec.kettleC) p.t = recipe.wantedC;
  if (recipe.timeS !== spec.timeS) p.d = recipe.timeS;
  if (recipe.grind !== spec.grind) p.g = GRINDS.indexOf(recipe.grind);
  if ((recipe.bypassG || undefined) !== spec.bypassG) p.y = recipe.bypassG ?? 0;
  if ((recipe.forkedFrom ?? "") !== (recipeOrigin(spec.method, spec.technique) ?? "")) p.p = recipe.forkedFrom ?? "";
  const gaggiuino = spec.method === "espresso" ? specTechnique(spec, "en")?.gaggiuino : undefined;
  if ((recipe.gaggiuino ?? "") !== (gaggiuino ?? "")) p.q = recipe.gaggiuino ?? "";
  const codes: StepCode[] = recipe.steps.map((s) => {
    const i = base.steps.findIndex((b) => sameStep(s, b));
    return i >= 0 ? i : [s.at, s.title, s.detail];
  });
  const asIs = codes.length === base.steps.length && codes.every((c, i) => c === i);
  if (!asIs) p.s = codes;
  return p;
}

/** The shortest link payload for one of My recipes. */
export async function encodeRecipe(recipe: UserBrewRecipe): Promise<string> {
  const base = baseOf(recipe);
  const p = payloadFor(recipe, base);
  // Steps untouched and only numbers changed: the card code, the name and those numbers are enough.
  if (base && Object.keys(p).every((k) => k === "n" || k === "b" || NUMERIC.includes(k as NumericKey))) {
    const nums = NUMERIC.filter((k) => p[k] != null).map((k) => `~${k}${p[k]}`);
    return `c.${p.b}~${escapeName(p.n)}${nums.join("")}`;
  }
  const bytes = new TextEncoder().encode(JSON.stringify(p));
  const plain = `n.${toBase64Url(bytes)}`;
  if (typeof CompressionStream === "undefined") return plain;
  const packed = `m.${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
  return packed.length < plain.length ? packed : plain;
}

function decodeCard(body: string, locale: Locale): UserBrewRecipe | null {
  const fields = body.split("~");
  const specText = fields.slice(0, CARD_FIELDS).join("~");
  const spec = parseCardBody(specText);
  if (!spec) return null;
  const own = fields.length > CARD_FIELDS;
  if (own) {
    const p: MinePayload = { b: specText, n: decodeURIComponent(fields[CARD_FIELDS]) };
    for (const extra of fields.slice(CARD_FIELDS + 1)) {
      const m = /^([crtdgy])(\d+(?:\.\d+)?)$/.exec(extra);
      if (!m) return null;
      p[m[1] as NumericKey] = Number(m[2]);
    }
    return decodeMine(p, locale);
  }
  const tech = specTechnique(spec, locale);
  return normalizeRecipe({
    name: tech?.name ?? BREW_METHODS.find((m) => m.id === spec.method)?.name ?? spec.method,
    method: spec.method,
    flavor: tech?.flavor ?? "",
    mechanic: tech?.mechanic ?? "",
    origin: youOrigin(),
    forkedFrom: recipeOrigin(spec.method, tech?.id),
    base: specBody(spec),
    coffeeG: spec.coffeeG,
    ratioN: spec.ratioN,
    wantedC: spec.kettleC,
    timeS: spec.timeS,
    grind: spec.grind,
    bypassG: spec.bypassG,
    gaggiuino: tech?.gaggiuino,
    steps: cardSteps(spec, locale),
  });
}

function decodeMine(p: MinePayload, locale: Locale): UserBrewRecipe | null {
  if (!p || typeof p.n !== "string") return null;
  const spec = p.b ? parseCardBody(p.b) : null;
  if (p.b && !spec) return null;
  const method = spec?.method ?? p.k;
  if (!BREW_METHODS.some((m) => m.id === method)) return null;
  const baseSteps = spec ? cardSteps(spec, locale) : [];
  let steps: BrewStep[] = baseSteps;
  if (p.s) {
    if (!Array.isArray(p.s)) return null;
    const out: BrewStep[] = [];
    for (const code of p.s) {
      if (typeof code === "number") {
        const step = baseSteps[code];
        if (!step) return null;
        out.push(step);
      } else if (Array.isArray(code) && code.length === 3 && code.every((x) => typeof x === "string")) {
        out.push({ at: code[0], title: code[1], detail: code[2] });
      } else return null;
    }
    steps = out;
  }
  const tech = spec ? specTechnique(spec, locale) : undefined;
  return normalizeRecipe({
    name: p.n,
    method,
    flavor: p.f ?? "",
    mechanic: p.h ?? "",
    origin: p.o ?? youOrigin(),
    forkedFrom: p.p != null ? p.p || undefined : spec ? recipeOrigin(spec.method, spec.technique) : undefined,
    base: p.b,
    coffeeG: p.c ?? spec?.coffeeG,
    ratioN: p.r ?? spec?.ratioN,
    wantedC: p.t ?? spec?.kettleC,
    timeS: p.d ?? spec?.timeS,
    grind: p.g != null ? GRINDS[p.g] : spec?.grind,
    bypassG: p.y != null ? p.y || undefined : spec?.bypassG,
    gaggiuino: p.q != null ? p.q || undefined : method === "espresso" ? tech?.gaggiuino : undefined,
    steps,
  });
}

export async function decodeRecipe(code: string, locale: Locale = "en"): Promise<UserBrewRecipe | null> {
  try {
    const [kind, body] = [code.slice(0, 2), code.slice(2)];
    if (kind === "c.") return decodeCard(body, locale);
    let bytes = fromBase64Url(body);
    if (kind === "m." || kind === "z.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (kind !== "n." && kind !== "j.") return null;
    const raw = JSON.parse(new TextDecoder().decode(bytes));
    return kind === "m." || kind === "n." ? decodeMine(raw, locale) : normalizeRecipe(raw);
  } catch {
    return null;
  }
}

/** A built-in card as a short code. */
export function encodeCard(card: BrewRecipe): string {
  return `c.${cardBody(card)}`;
}

/** The page URL without any fragment, plus #r=<recipe>. */
export async function recipeLink(recipe: UserBrewRecipe, pageUrl: string): Promise<string> {
  return `${pageUrl.split("#")[0]}#${HASH_KEY}=${await encodeRecipe(recipe)}`;
}

/** A built-in card's link: a few dozen characters, built synchronously. */
export function cardLink(card: BrewRecipe, pageUrl: string): string {
  return `${pageUrl.split("#")[0]}#${HASH_KEY}=${encodeCard(card)}`;
}

/** The encoded recipe in a location hash such as "#r=c.…", if there is one. */
export function sharedCodeFromHash(hash: string): string | undefined {
  const params = new URLSearchParams(hash.replace(/^#/, ""));
  return params.get(HASH_KEY) ?? undefined;
}

/** "Kasuya 4:6 · V60 · 15 g · 1:16 · 92 °C" */
export function recipeSummary(recipe: UserBrewRecipe): string {
  const method = BREW_METHODS.find((m) => m.id === recipe.method)?.name ?? recipe.method;
  const ratio = Number.isInteger(recipe.ratioN) ? `1:${recipe.ratioN}` : `1:${recipe.ratioN.toFixed(1)}`;
  const parts = [method, `${recipe.coffeeG} g`, ratio];
  if (recipe.method !== "coldbrew") parts.push(`${Math.round(recipe.wantedC)} °C`);
  return `${recipe.name} · ${parts.join(" · ")}`;
}

/** A shared copy says who it came from instead of claiming the recipient wrote it. */
export function asReceived(recipe: UserBrewRecipe, now = new Date()): UserBrewRecipe {
  if (!recipe.origin.startsWith("You ·")) return recipe;
  const d = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  return { ...recipe, origin: `Shared · ${d}` };
}
