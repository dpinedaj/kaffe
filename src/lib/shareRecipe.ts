import type { Locale } from "../i18n/translate";
import { BREW_METHODS, recipeOrigin, techniquesFor, type BrewMethod, type BrewRecipe, type Grind, type SwitchMode } from "./brew";
import { normalizeRecipe, youOrigin, type UserBrewRecipe } from "./brewRecipes";
import { buildBrewSteps } from "./brewSteps";
import type { RoastStyleId } from "./knowledge";

/**
 * A recipe travels in the link's #fragment, which browsers never send to the server.
 * - "c." a built-in card: only the numbers its steps are built from, so the link stays short and the
 *   recipient reads the steps in their own language.
 * - "z." base64url(deflate-raw(JSON)) for My recipes, whose steps are free text
 *   ("j." is the same without compression, where CompressionStream is missing).
 */
const HASH_KEY = "r";

type SharedFields = Omit<UserBrewRecipe, "id" | "createdAt" | "updatedAt">;

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

function payloadOf(recipe: UserBrewRecipe): SharedFields {
  const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = recipe;
  return rest;
}

export async function encodeRecipe(recipe: UserBrewRecipe): Promise<string> {
  const bytes = new TextEncoder().encode(JSON.stringify(payloadOf(recipe)));
  if (typeof CompressionStream === "undefined") return `j.${toBase64Url(bytes)}`;
  return `z.${toBase64Url(await pipe(bytes, new CompressionStream("deflate-raw")))}`;
}

export async function decodeRecipe(code: string, locale: Locale = "en"): Promise<UserBrewRecipe | null> {
  try {
    const [kind, body] = [code.slice(0, 2), code.slice(2)];
    if (kind === "c.") return decodeCard(body, locale);
    let bytes = fromBase64Url(body);
    if (kind === "z.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (kind !== "j.") return null;
    return normalizeRecipe(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];
const STYLES: Record<string, RoastStyleId> = { l: "light", m: "medium", d: "dark" };

/** "c.v60~hedrick~15~16.7~251~~96~150~2~g~l~" — method, recipe, dose, ratio, water, bypass, kettle, time, grind, flags, style, switch. */
export function encodeCard(card: BrewRecipe): string {
  const flags = `${card.gassy ? "g" : ""}${card.natural ? "n" : ""}`;
  return `c.${[
    card.method,
    card.technique ?? "",
    card.coffeeG,
    card.ratioN,
    card.waterG,
    card.bypassG || "",
    card.kettleC,
    card.timeS,
    GRINDS.indexOf(card.grind),
    flags,
    card.roastStyle[0],
    card.switchMode ?? "",
  ].join("~")}`;
}

function decodeCard(body: string, locale: Locale): UserBrewRecipe | null {
  const [method, technique, coffee, ratio, water, bypass, kettle, time, grindIdx, flags, style, switchMode] = body.split("~");
  if (!BREW_METHODS.some((m) => m.id === method)) return null;
  const nums = [coffee, ratio, water, kettle, time].map(Number);
  if (nums.some((n) => !Number.isFinite(n) || n <= 0)) return null;
  const [coffeeG, ratioN, waterG, kettleC, timeS] = nums;
  const grind = GRINDS[Number(grindIdx)];
  const roastStyle = STYLES[style];
  if (!grind || !roastStyle) return null;
  const tech = techniquesFor(method as BrewMethod, locale).find((x) => x.id === technique);
  if (technique && !tech) return null;
  const bypassG = bypass ? Number(bypass) : undefined;
  const steps = buildBrewSteps({
    locale,
    method: method as BrewMethod,
    coffeeG,
    waterG,
    bypassG,
    kettleC,
    timeS,
    grind,
    gassy: flags?.includes("g") ?? false,
    natural: flags?.includes("n") ?? false,
    roastStyle,
    switchMode: (switchMode || undefined) as SwitchMode | undefined,
    technique: tech?.id,
    startC: tech?.startC,
    finishC: tech?.finishC,
  });
  return normalizeRecipe({
    name: tech?.name ?? BREW_METHODS.find((m) => m.id === method)?.name ?? method,
    method,
    flavor: tech?.flavor ?? "",
    mechanic: tech?.mechanic ?? "",
    origin: youOrigin(),
    forkedFrom: recipeOrigin(method as BrewMethod, tech?.id),
    coffeeG,
    ratioN,
    wantedC: kettleC,
    timeS,
    grind,
    bypassG,
    gaggiuino: tech?.gaggiuino,
    steps,
  });
}

/** The page URL without any fragment, plus #r=<recipe>. */
export async function recipeLink(recipe: UserBrewRecipe, pageUrl: string): Promise<string> {
  return `${pageUrl.split("#")[0]}#${HASH_KEY}=${await encodeRecipe(recipe)}`;
}

/** A built-in card's link: a few dozen characters, built synchronously. */
export function cardLink(card: BrewRecipe, pageUrl: string): string {
  return `${pageUrl.split("#")[0]}#${HASH_KEY}=${encodeCard(card)}`;
}

/** The encoded recipe in a location hash such as "#r=z.…", if there is one. */
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
