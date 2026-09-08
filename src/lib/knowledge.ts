export type ProcessId = "natural" | "washed" | "honey" | "anaerobic" | "other";
export type BrewId = "filter" | "espresso" | "omni" | "cupping";
export type RoastStyleId = "light" | "medium" | "dark";
export type FlavorId =
  | "fruity"
  | "lightSweet"
  | "deepSweet"
  | "bright"
  | "juicy"
  | "winey"
  | "floral"
  | "body"
  | "clean"
  | "balance";

export type Rec = "recommended" | "neutral" | "avoid";

export interface OriginInfo {
  id: string;
  name: string;
  regions: string;
  typicalProcess: ProcessId;
  typicalAltitude: number;
  density: "soft" | "medium" | "hard";
}

export interface FlavorInfo {
  id: FlavorId;
  name: string;
  icon: string;
  strategy: string[];
  why: string;
  expected: string[];
  tradeoffs: string[];
  warning: string;
  suggestedStyle: RoastStyleId;
}

export const ORIGINS: OriginInfo[] = [
  { id: "ethiopia", name: "Ethiopia", regions: "Yirgacheffe / Sidamo / Guji", typicalProcess: "natural", typicalAltitude: 2000, density: "hard" },
  { id: "kenya", name: "Kenya", regions: "Nyeri / Kirinyaga", typicalProcess: "washed", typicalAltitude: 1750, density: "hard" },
  { id: "colombia", name: "Colombia", regions: "Huila / Nariño / Cauca", typicalProcess: "washed", typicalAltitude: 1700, density: "medium" },
  { id: "rwanda", name: "Rwanda", regions: "Nyamasheke / Huye", typicalProcess: "washed", typicalAltitude: 1800, density: "hard" },
  { id: "brazil", name: "Brazil", regions: "Cerrado / Minas", typicalProcess: "natural", typicalAltitude: 1100, density: "soft" },
  { id: "guatemala", name: "Guatemala", regions: "Huehuetenango / Antigua", typicalProcess: "washed", typicalAltitude: 1600, density: "medium" },
  { id: "costa-rica", name: "Costa Rica", regions: "Tarrazú / West Valley", typicalProcess: "honey", typicalAltitude: 1600, density: "medium" },
  { id: "peru", name: "Peru", regions: "Cajamarca / Cusco", typicalProcess: "washed", typicalAltitude: 1800, density: "hard" },
  { id: "indonesia", name: "Indonesia", regions: "Sumatra / Java", typicalProcess: "other", typicalAltitude: 1300, density: "soft" },
  { id: "yemen", name: "Yemen", regions: "Sana'a / Ibb", typicalProcess: "natural", typicalAltitude: 2000, density: "hard" },
];

export const PROCESSES: { id: ProcessId; name: string }[] = [
  { id: "washed", name: "Washed" },
  { id: "natural", name: "Natural" },
  { id: "honey", name: "Honey" },
  { id: "anaerobic", name: "Anaerobic" },
  { id: "other", name: "Other / wet-hulled" },
];

export const BREWS: { id: BrewId; name: string }[] = [
  { id: "filter", name: "Filter" },
  { id: "espresso", name: "Espresso" },
  { id: "omni", name: "Omni" },
  { id: "cupping", name: "Cupping" },
];

export const STYLES: { id: RoastStyleId; name: string; level: number }[] = [
  { id: "light", name: "Light", level: 2.2 },
  { id: "medium", name: "Medium", level: 3.2 },
  { id: "dark", name: "Dark", level: 4.6 },
];

export const FLAVORS: FlavorInfo[] = [
  {
    id: "fruity",
    name: "Fruity",
    icon: "🍓",
    strategy: ["High energy early", "Fast drying", "No extended Maillard", "Short development", "Lighter roast"],
    why: "Longer development drifts toward nutty, roasty and bitter notes; short development preserves fruity, sweet and acidic characters.",
    expected: ["Fruity", "Acidity", "Floral"],
    tradeoffs: ["Body", "Caramel / roasty"],
    warning: "Too short a development risks grassy or raw notes.",
    suggestedStyle: "light",
  },
  {
    id: "lightSweet",
    name: "Light Sweet",
    icon: "🍯",
    strategy: ["Moderate dry", "Keep Maillard compact", "Clean finish"],
    why: "A slightly longer Maillard than a fruit bomb, without pushing into caramelized darkness.",
    expected: ["Sweet", "Clean"],
    tradeoffs: ["Heavy body"],
    warning: "Overstretching mid-roast mutes sparkle.",
    suggestedStyle: "light",
  },
  {
    id: "deepSweet",
    name: "Deep Sweet",
    icon: "🍬",
    strategy: ["Longer Maillard", "Later first crack", "More development"],
    why: "Sugars need time in the browning phase to become caramel and cocoa.",
    expected: ["Caramel", "Cocoa", "Body"],
    tradeoffs: ["Bright fruit"],
    warning: "Too much development turns sweet into baked.",
    suggestedStyle: "medium",
  },
  {
    id: "bright",
    name: "Bright Acidity",
    icon: "🍋",
    strategy: ["High energy front end", "Quick through drying", "Short development"],
    why: "Organic acids survive a fast, light roast; they collapse if you linger after crack.",
    expected: ["Citrus", "Sparkle"],
    tradeoffs: ["Body"],
    warning: "Soft beans can tip if the front is too aggressive.",
    suggestedStyle: "light",
  },
  {
    id: "juicy",
    name: "Juicy Acidity",
    icon: "🍑",
    strategy: ["Moderate dry", "Preserve acids", "Balanced mid"],
    why: "Juiciness wants acidity plus a little sweetness — not a race to drop.",
    expected: ["Stone fruit", "Acidity"],
    tradeoffs: ["Roasty"],
    warning: "Underdevelopment tastes thin rather than juicy.",
    suggestedStyle: "light",
  },
  {
    id: "winey",
    name: "Wine-like",
    icon: "🍇",
    strategy: ["Slower start", "Natural-process energy", "Keep some ferment character"],
    why: "Winey notes sit in natural and anaerobic coffees; a rushed dry flattens them.",
    expected: ["Winey", "Berry"],
    tradeoffs: ["Clean"],
    warning: "Easy to overdo into vinegar if development is too short on fermenty lots.",
    suggestedStyle: "light",
  },
  {
    id: "floral",
    name: "Floral",
    icon: "🌸",
    strategy: ["Gentle mid", "Early crack", "Very short development"],
    why: "Florals are volatile. Heat them late and they disappear.",
    expected: ["Floral", "Tea"],
    tradeoffs: ["Body"],
    warning: "Needs dense, high-grown washed or light naturals.",
    suggestedStyle: "light",
  },
  {
    id: "body",
    name: "Body",
    icon: "🫘",
    strategy: ["Longer Maillard", "Slightly lower late fan", "More development"],
    why: "Body builds as soluble browning compounds accumulate.",
    expected: ["Body", "Cocoa"],
    tradeoffs: ["Sparkle"],
    warning: "Darker than needed becomes ashy, not fuller.",
    suggestedStyle: "medium",
  },
  {
    id: "clean",
    name: "Clean",
    icon: "✨",
    strategy: ["Washed-style pacing", "Even energy", "No late stall"],
    why: "Clean cups come from even heat and avoiding fermenty linger.",
    expected: ["Clean", "Sweet"],
    tradeoffs: ["Winey"],
    warning: "Overly fast roasts can taste hollow instead of clean.",
    suggestedStyle: "light",
  },
  {
    id: "balance",
    name: "Balance",
    icon: "⚖️",
    strategy: ["Small deltas", "Classic 8–10 min", "Moderate DTR"],
    why: "Balance is the absence of a single loud phase.",
    expected: ["Sweet", "Acidity", "Body"],
    tradeoffs: ["Extreme fruit or dark roast"],
    warning: "Trying to please every slider at 100% cancels the idea.",
    suggestedStyle: "medium",
  },
];

export function flavorById(id: FlavorId): FlavorInfo {
  return FLAVORS.find((f) => f.id === id) ?? FLAVORS[0];
}

export function originById(id: string): OriginInfo {
  return ORIGINS.find((o) => o.id === id) ?? ORIGINS[0];
}

export function recommendFlavor(
  flavor: FlavorId,
  process: ProcessId,
  style: RoastStyleId,
  origin: OriginInfo,
): Rec {
  if (style === "dark" && ["fruity", "floral", "bright", "juicy"].includes(flavor)) return "avoid";
  if (style === "dark" && ["deepSweet", "body"].includes(flavor)) return "recommended";
  if (process === "natural" && ["fruity", "winey", "juicy"].includes(flavor)) return "recommended";
  if (process === "washed" && ["clean", "bright", "floral", "balance"].includes(flavor)) return "recommended";
  if (process === "anaerobic" && ["winey", "fruity"].includes(flavor)) return "recommended";
  if (origin.density === "soft" && flavor === "bright") return "avoid";
  if (style === "light" && ["fruity", "bright", "floral", "juicy"].includes(flavor)) return "recommended";
  return "neutral";
}
