import {
  BREW_METHODS,
  boilingPointC,
  clampDose,
  clampRatio,
  formatBrewTime,
  type BrewMethod,
  type BrewRecipe,
  type BrewStep,
  type Grind,
} from "./brew";

export const USER_RECIPE_KIND = "kaffe.brew-recipe";
export const USER_RECIPE_PACK = "kaffe.brew-recipe-pack";
export const USER_RECIPE_VERSION = 1;

const KEY = "kaffe.brew.mine.v1";
const GRINDS: Grind[] = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];

export interface UserBrewRecipe {
  id: string;
  name: string;
  method: BrewMethod;
  flavor: string;
  mechanic: string;
  origin: string;
  forkedFrom?: string;
  coffeeG: number;
  ratioN: number;
  wantedC: number;
  timeS: number;
  grind: Grind;
  bypassG?: number;
  gaggiuino?: string;
  steps: BrewStep[];
  createdAt: string;
  updatedAt: string;
}

export function youOrigin(now = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `You · ${y}-${m}-${d}`;
}

export function cloneFromCard(recipe: BrewRecipe, name?: string): UserBrewRecipe {
  const methodName = BREW_METHODS.find((m) => m.id === recipe.method)?.name ?? recipe.method;
  const now = new Date().toISOString();
  return {
    id: newRecipeId(),
    name: name?.trim() || `${methodName} card`,
    method: recipe.method,
    flavor: "",
    mechanic: "",
    origin: youOrigin(),
    forkedFrom: recipe.origin,
    coffeeG: recipe.coffeeG,
    ratioN: recipe.ratioN,
    wantedC: recipe.wantedC,
    timeS: recipe.timeS,
    grind: recipe.grind,
    bypassG: recipe.bypassG,
    gaggiuino: recipe.gaggiuino,
    steps: recipe.steps.map((s) => ({ ...s })),
    createdAt: now,
    updatedAt: now,
  };
}

export function viewUserRecipe(
  mine: UserBrewRecipe,
  kitchenAltitudeM?: number,
): BrewRecipe {
  const waterG = Math.round(mine.coffeeG * mine.ratioN) - (mine.bypassG ?? 0);
  const boilC =
    kitchenAltitudeM != null && Number.isFinite(kitchenAltitudeM)
      ? Math.round(boilingPointC(kitchenAltitudeM) * 10) / 10
      : undefined;
  const openKettle = mine.method !== "espresso" && mine.method !== "coldbrew";
  let kettleC = mine.wantedC;
  let cappedByBoil = false;
  if (openKettle && boilC != null) {
    const ceiling = Math.round((boilC - 1) * 10) / 10;
    if (mine.wantedC > ceiling) {
      kettleC = ceiling;
      cappedByBoil = true;
    }
  }
  const cupG = waterG + (mine.bypassG ?? 0);
  const ratio = Number.isInteger(mine.ratioN) ? `1:${mine.ratioN}` : `1:${mine.ratioN.toFixed(1)}`;
  return {
    method: mine.method,
    roastStyle: "light",
    ratio,
    ratioN: mine.ratioN,
    coffeeG: mine.coffeeG,
    waterG,
    bypassG: mine.bypassG,
    cupG,
    wantedC: mine.wantedC,
    kettleC,
    boilC,
    cappedByBoil,
    kettleNote: openKettle
      ? cappedByBoil
        ? `Rolling boil · local ceiling ${boilC?.toFixed(1)} °C`
        : `${kettleC.toFixed(0)} °C`
      : mine.method === "coldbrew"
        ? "Fridge · cold or room-temp water, no kettle"
        : "Group / boiler — pressurized, not limited by kettle boil",
    timeLabel:
      mine.method === "espresso"
        ? `${Math.round(mine.timeS)} s`
        : mine.method === "coldbrew"
          ? `${Math.round(mine.timeS / 3600)} h fridge`
          : formatBrewTime(mine.timeS),
    timeS: mine.timeS,
    grind: mine.grind,
    grindNote: mine.grind.replace("-", " "),
    restLabel: "Yours",
    origin: mine.origin,
    gaggiuino: mine.gaggiuino,
    steps: mine.steps,
    why: [
      `${mine.name} is saved on this device.`,
      mine.forkedFrom ? `Forked from ${mine.forkedFrom}. Championship cards were not edited.` : "Written here. Championship cards were not edited.",
    ],
    sources: ["Yours · local device · export a .json to share"],
    warnings:
      cappedByBoil && boilC != null
        ? [`Wanted ${mine.wantedC.toFixed(0)} °C. Local boil will not reach it.`]
        : [],
  };
}

export function loadMine(): UserBrewRecipe[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map(normalizeRecipe).filter((r): r is UserBrewRecipe => r != null);
  } catch {
    return [];
  }
}

export function saveMine(items: UserBrewRecipe[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* quota / private mode */
  }
}

export function upsertMine(item: UserBrewRecipe): UserBrewRecipe[] {
  const next = { ...item, updatedAt: new Date().toISOString() };
  const items = loadMine();
  const i = items.findIndex((r) => r.id === next.id);
  if (i >= 0) items[i] = next;
  else items.unshift(next);
  saveMine(items);
  return items;
}

export function removeMine(id: string): UserBrewRecipe[] {
  const items = loadMine().filter((r) => r.id !== id);
  saveMine(items);
  return items;
}

export function mineForMethod(method: BrewMethod, items = loadMine()): UserBrewRecipe[] {
  return items.filter((r) => r.method === method);
}

export function serializeRecipe(recipe: UserBrewRecipe): string {
  return JSON.stringify({ kind: USER_RECIPE_KIND, version: USER_RECIPE_VERSION, recipe }, null, 2);
}

export function serializePack(recipes: UserBrewRecipe[]): string {
  return JSON.stringify({ kind: USER_RECIPE_PACK, version: USER_RECIPE_VERSION, recipes }, null, 2);
}

export function parseRecipeFile(text: string): UserBrewRecipe[] {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    throw new Error("That file is not JSON.");
  }
  if (!raw || typeof raw !== "object") throw new Error("Empty recipe file.");
  const obj = raw as Record<string, unknown>;
  if (obj.kind === USER_RECIPE_PACK && Array.isArray(obj.recipes)) {
    const out = obj.recipes.map(normalizeRecipe).filter((r): r is UserBrewRecipe => r != null);
    if (!out.length) throw new Error("No recipes in that pack.");
    return out;
  }
  const one = obj.kind === USER_RECIPE_KIND ? obj.recipe : raw;
  const rec = normalizeRecipe(one);
  if (!rec) throw new Error("That file is not a Kaffe brew recipe.");
  return [rec];
}

export function importRecipes(text: string): UserBrewRecipe[] {
  const incoming = parseRecipeFile(text).map((r) => ({
    ...r,
    id: newRecipeId(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    origin: r.origin.startsWith("You ·") ? r.origin : r.origin,
  }));
  let items = loadMine();
  for (const rec of incoming) {
    items = [rec, ...items];
  }
  saveMine(items);
  return incoming;
}

export function downloadText(filename: string, text: string): void {
  const blob = new Blob([text], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function recipeFileName(recipe: UserBrewRecipe): string {
  const slug = recipe.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${slug || recipe.method}.json`;
}

export function newRecipeId(): string {
  return crypto.randomUUID();
}

export const GRIND_OPTIONS: Grind[] = GRINDS;

function normalizeRecipe(raw: unknown): UserBrewRecipe | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const method = o.method;
  if (typeof method !== "string" || !BREW_METHODS.some((m) => m.id === method)) return null;
  const coffeeG = Number(o.coffeeG);
  const ratioN = Number(o.ratioN);
  const wantedC = Number(o.wantedC);
  const timeS = Number(o.timeS);
  if (![coffeeG, ratioN, wantedC, timeS].every(Number.isFinite)) return null;
  const grind = GRINDS.includes(o.grind as Grind) ? (o.grind as Grind) : "medium";
  const steps = Array.isArray(o.steps)
    ? o.steps
        .map((s) => {
          if (!s || typeof s !== "object") return null;
          const step = s as Record<string, unknown>;
          if (typeof step.title !== "string") return null;
          return {
            at: typeof step.at === "string" ? step.at : "",
            title: step.title,
            detail: typeof step.detail === "string" ? step.detail : "",
          };
        })
        .filter((s): s is BrewStep => s != null)
    : [];
  const now = new Date().toISOString();
  return {
    id: typeof o.id === "string" && o.id ? o.id : newRecipeId(),
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : "Untitled",
    method: method as BrewMethod,
    flavor: typeof o.flavor === "string" ? o.flavor : "",
    mechanic: typeof o.mechanic === "string" ? o.mechanic : "",
    origin: typeof o.origin === "string" && o.origin.trim() ? o.origin.trim() : youOrigin(),
    forkedFrom: typeof o.forkedFrom === "string" ? o.forkedFrom : undefined,
    coffeeG: clampDose(coffeeG),
    ratioN: clampRatio(ratioN, method as BrewMethod),
    wantedC: Math.max(8, Math.min(100, Math.round(wantedC * 10) / 10)),
    timeS: Math.max(1, Math.round(timeS)),
    grind,
    bypassG: o.bypassG != null && Number.isFinite(Number(o.bypassG)) ? Math.max(0, Math.round(Number(o.bypassG))) : undefined,
    gaggiuino: typeof o.gaggiuino === "string" && o.gaggiuino.trim() ? o.gaggiuino.trim() : undefined,
    steps,
    createdAt: typeof o.createdAt === "string" ? o.createdAt : now,
    updatedAt: typeof o.updatedAt === "string" ? o.updatedAt : now,
  };
}
