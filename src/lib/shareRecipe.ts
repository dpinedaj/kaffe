import { BREW_METHODS } from "./brew";
import { normalizeRecipe, type UserBrewRecipe } from "./brewRecipes";

/**
 * A recipe travels in the link's #fragment, which browsers never send to the server:
 * "z." + base64url(deflate-raw(JSON)), or "j." + base64url(JSON) where CompressionStream is missing.
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

export async function decodeRecipe(code: string): Promise<UserBrewRecipe | null> {
  try {
    const [kind, body] = [code.slice(0, 2), code.slice(2)];
    let bytes = fromBase64Url(body);
    if (kind === "z.") bytes = await pipe(bytes, new DecompressionStream("deflate-raw"));
    else if (kind !== "j.") return null;
    return normalizeRecipe(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

/** The page URL without any fragment, plus #r=<recipe>. */
export async function recipeLink(recipe: UserBrewRecipe, pageUrl: string): Promise<string> {
  return `${pageUrl.split("#")[0]}#${HASH_KEY}=${await encodeRecipe(recipe)}`;
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
