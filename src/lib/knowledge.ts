export type ProcessId = "natural" | "washed" | "honey" | "anaerobic" | "other";
export type BrewId = "filter" | "espresso" | "omni" | "cupping";
export type RoastStyleId = "light" | "medium" | "dark";
export type FlavorId =
  | "fruity"
  | "lightSweet"
  | "caramel"
  | "deepSweet"
  | "cocoa"
  | "bright"
  | "juicy"
  | "winey"
  | "floral"
  | "body"
  | "clean"
  | "balance";

export type Rec = "recommended" | "neutral" | "avoid";

export type BeanSize = "small" | "medium" | "large";
export type DensityClass = "soft" | "medium" | "hard";

export interface OriginInfo {
  id: string;
  name: string;
  regions: string;
  typicalProcess: ProcessId;
  typicalAltitude: number;
  density: DensityClass;
  shortCode?: string;
  notes?: string;
  cup?: string;
  suggestedVarietyId?: string;
}

export interface VarietyRoast {
  fcTemp: number;
  preheatW: number;
  dryingS: number;
  midS: number;
  developmentS: number;
  /** Offset from the official 14700 RPM hold (Kaffelogic Studio transform). */
  fanRpm: number;
}

export interface VarietyInfo {
  id: string;
  name: string;
  shortCode?: string;
  beanSize: BeanSize;
  density: DensityClass;
  flavorLean: FlavorId[];
  suggestedStyle: RoastStyleId;
  roast: VarietyRoast;
  notes?: string;
  cup?: string;
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
  { id: "ethiopia", name: "Ethiopia", regions: "Yirgacheffe / Sidamo / Guji", typicalProcess: "natural", typicalAltitude: 2000, density: "hard", shortCode: "ETH", suggestedVarietyId: "heirloom" },
  { id: "kenya", name: "Kenya", regions: "Nyeri / Kirinyaga", typicalProcess: "washed", typicalAltitude: 1750, density: "hard", shortCode: "KEN", suggestedVarietyId: "sl28" },
  {
    id: "colombia",
    name: "Colombia",
    regions: "Andean departments",
    typicalProcess: "washed",
    typicalAltitude: 1700,
    density: "medium",
    shortCode: "COL",
    suggestedVarietyId: "caturra",
    notes: "Washed Arabica on three cordilleras. Pick a department below when you know the lot.",
    cup: "Clean, sweet, balanced",
  },
  {
    id: "colombia-huila",
    name: "Colombia — Huila",
    regions: "Pitalito / Acevedo / San Adolfo",
    typicalProcess: "washed",
    typicalAltitude: 1700,
    density: "hard",
    shortCode: "HUI",
    suggestedVarietyId: "caturra",
    notes: "Colombia’s main specialty volume. Volcanic valleys, 1,400–2,000 m, tank ferment 12–18 h. Honey lots are common on microlots.",
    cup: "Citrus, caramel, red fruit, winey sparkle",
  },
  {
    id: "colombia-narino",
    name: "Colombia — Nariño",
    regions: "Buesaco / La Unión / La Florida",
    typicalProcess: "washed",
    typicalAltitude: 2050,
    density: "hard",
    shortCode: "NAR",
    suggestedVarietyId: "caturra",
    notes: "Near the equator at 1,800–2,300 m. Hot days / ~10 °C nights slow ripening; very dense seed. Some honey / extended ferment.",
    cup: "Stone fruit, brown sugar, floral, high acidity",
  },
  {
    id: "colombia-cauca",
    name: "Colombia — Cauca",
    regions: "Inzá / Popayán plateau / Timbío",
    typicalProcess: "washed",
    typicalAltitude: 1850,
    density: "hard",
    shortCode: "CAU",
    suggestedVarietyId: "caturra",
    notes: "1,700–2,100 m plateau, cool nights, volcanic ash. Typically fully washed; clean terroir-forward cups.",
    cup: "Lime, cocoa, floral, tea-like body",
  },
  {
    id: "colombia-tolima",
    name: "Colombia — Tolima",
    regions: "Planadas / Herrera / Chaparral",
    typicalProcess: "washed",
    typicalAltitude: 1650,
    density: "medium",
    shortCode: "TOL",
    suggestedVarietyId: "caturra",
    notes: "Steep west-central slopes, 1,200–2,000 m. Emerging specialty; heavier than Huila next door.",
    cup: "Chocolate, green apple, nutty finish, more body",
  },
  {
    id: "colombia-sierra",
    name: "Colombia — Sierra Nevada",
    regions: "Santa Marta / Arhuaco / Kogi lands",
    typicalProcess: "washed",
    typicalAltitude: 1400,
    density: "soft",
    shortCode: "SNV",
    suggestedVarietyId: "typica",
    notes: "Caribbean isolated range, shade-grown 900–1,600 m, often organic. Softer seed than Andean lots — easier to tip if the front is too hot.",
    cup: "Low acidity, full body, chocolate, tropical",
  },
  {
    id: "colombia-antioquia",
    name: "Colombia — Antioquia / Eje Cafetero",
    regions: "Medellín / Quindío / Risaralda / Caldas",
    typicalProcess: "washed",
    typicalAltitude: 1550,
    density: "medium",
    shortCode: "ANT",
    suggestedVarietyId: "castillo",
    notes: "Classic Coffee Triangle, 1,200–1,800 m. The historical Colombian profile: consistent washed, year-round mitaca.",
    cup: "Caramel, citrus, balanced, mild body",
  },
  { id: "rwanda", name: "Rwanda", regions: "Nyamasheke / Huye", typicalProcess: "washed", typicalAltitude: 1800, density: "hard", shortCode: "RWA", suggestedVarietyId: "bourbon" },
  { id: "brazil", name: "Brazil", regions: "Cerrado / Minas", typicalProcess: "natural", typicalAltitude: 1100, density: "soft", shortCode: "BRA", suggestedVarietyId: "catuai" },
  { id: "guatemala", name: "Guatemala", regions: "Huehuetenango / Antigua", typicalProcess: "washed", typicalAltitude: 1600, density: "medium", shortCode: "GTM", suggestedVarietyId: "caturra" },
  { id: "costa-rica", name: "Costa Rica", regions: "Tarrazú / West Valley", typicalProcess: "honey", typicalAltitude: 1600, density: "medium", shortCode: "CRI", suggestedVarietyId: "caturra" },
  { id: "peru", name: "Peru", regions: "Cajamarca / Cusco", typicalProcess: "washed", typicalAltitude: 1800, density: "hard", shortCode: "PER", suggestedVarietyId: "typica" },
  { id: "indonesia", name: "Indonesia", regions: "Sumatra / Java", typicalProcess: "other", typicalAltitude: 1300, density: "soft", shortCode: "IDN", suggestedVarietyId: "typica" },
  { id: "yemen", name: "Yemen", regions: "Sana'a / Ibb", typicalProcess: "natural", typicalAltitude: 2000, density: "hard", shortCode: "YEM", suggestedVarietyId: "typica" },
];

/** Arabica cultivars that change density, seed size, and volatile flavor — so the roast must change too. */
export const VARIETIES: VarietyInfo[] = [
  {
    id: "unknown",
    name: "Unknown / mix",
    shortCode: "MIX",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["balance"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0, preheatW: 0, dryingS: 0, midS: 0, developmentS: 0, fanRpm: 0 },
    notes: "Use when the lot is a blend or the cultivar is not listed. No extra variety heat.",
    cup: "Follow origin and process",
  },
  {
    id: "typica",
    name: "Typica",
    shortCode: "TYP",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["clean", "bright"],
    suggestedStyle: "light",
    roast: { fcTemp: -0.3, preheatW: 2, dryingS: 0, midS: -2, developmentS: -4, fanRpm: 0 },
    notes: "The original cultivated Arabica. Clean, tea-like cups; keep development modest so it does not go nutty.",
    cup: "Clean, sweet, tea-like",
  },
  {
    id: "bourbon",
    name: "Bourbon",
    shortCode: "BRB",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["lightSweet", "deepSweet"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0.3, preheatW: 0, dryingS: 2, midS: 6, developmentS: 6, fanRpm: -50 },
    notes: "Sweeter and rounder than Typica. A slightly longer Maillard builds caramel without needing a dark drop.",
    cup: "Brown sugar, red fruit, more body than Typica",
  },
  {
    id: "yellow-bourbon",
    name: "Yellow Bourbon",
    shortCode: "YBR",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["lightSweet"],
    suggestedStyle: "light",
    roast: { fcTemp: 0.2, preheatW: 0, dryingS: 0, midS: 8, developmentS: 4, fanRpm: -50 },
    notes: "Brazil specialty staple. Extra mid-roast time for citric sweetness; do not stretch development into bake.",
    cup: "Citrus, honey, caramel",
  },
  {
    id: "pink-bourbon",
    name: "Pink Bourbon",
    shortCode: "PBR",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["floral", "juicy"],
    suggestedStyle: "light",
    roast: { fcTemp: -1.5, preheatW: 8, dryingS: 2, midS: -8, developmentS: -12, fanRpm: 80 },
    notes: "Colombia microlot star. Volatile florals and tropical acidity — roast like Gesha: enough front energy, short development, avoid dark.",
    cup: "Jasmine, tropical, phosphoric sparkle",
  },
  {
    id: "caturra",
    name: "Caturra",
    shortCode: "CTR",
    beanSize: "small",
    density: "medium",
    flavorLean: ["bright", "clean"],
    suggestedStyle: "light",
    roast: { fcTemp: -0.5, preheatW: -2, dryingS: -3, midS: -4, developmentS: -4, fanRpm: -40 },
    notes: "Compact Bourbon mutation, common in Colombia and Central America. Slightly smaller seed — a touch faster through drying.",
    cup: "Bright, clean, citrus-sweet",
  },
  {
    id: "catuai",
    name: "Catuai",
    shortCode: "CTU",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["balance"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0, preheatW: 0, dryingS: 0, midS: 2, developmentS: 2, fanRpm: 0 },
    notes: "Mundo Novo × Caturra. Productive Brazil / Central America workhorse; treat as a balanced baseline.",
    cup: "Nutty sweet, mild citrus, even body",
  },
  {
    id: "castillo",
    name: "Castillo",
    shortCode: "CAS",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["body", "balance", "cocoa"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0.5, preheatW: 4, dryingS: 2, midS: 6, developmentS: 6, fanRpm: -80 },
    notes: "Colombia rust-resistant Catimor. More body, less sparkle than Caturra — a longer mid and a bit more development help the cup.",
    cup: "Chocolate, caramel, heavier body",
  },
  {
    id: "colombia-var",
    name: "Colombia (variety)",
    shortCode: "CVD",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["balance", "body", "cocoa"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0.3, preheatW: 4, dryingS: 2, midS: 4, developmentS: 4, fanRpm: -50 },
    notes: "FNC hybrid related to Castillo. Similar heat: a little more mid and development than a Caturra lot.",
    cup: "Sweet, balanced, moderate body",
  },
  {
    id: "gesha",
    name: "Gesha / Geisha",
    shortCode: "GSH",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["floral", "bright"],
    suggestedStyle: "light",
    roast: { fcTemp: -2, preheatW: 10, dryingS: 2, midS: -10, developmentS: -16, fanRpm: 80 },
    notes: "Dense, high-grown, extremely volatile florals. Charge with energy so the seed catches, then get out after first crack. Dark roast erases the variety.",
    cup: "Jasmine, bergamot, tea, peach",
  },
  {
    id: "sl28",
    name: "SL28",
    shortCode: "S28",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["bright", "juicy"],
    suggestedStyle: "light",
    roast: { fcTemp: -0.5, preheatW: 12, dryingS: 4, midS: -4, developmentS: -6, fanRpm: 80 },
    notes: "Kenya Scott Labs selection. Very dense; phosphoric / blackcurrant acids need a hot front and a restrained development.",
    cup: "Blackcurrant, grapefruit, tomato-savory sparkle",
  },
  {
    id: "sl34",
    name: "SL34",
    shortCode: "S34",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["bright", "body"],
    suggestedStyle: "light",
    roast: { fcTemp: 0, preheatW: 10, dryingS: 4, midS: 2, developmentS: -2, fanRpm: 0 },
    notes: "Kenya companion to SL28. Same density, a little more body — keep acids, allow a touch more mid than SL28.",
    cup: "Citrus, brown sugar, fuller than SL28",
  },
  {
    id: "pacamara",
    name: "Pacamara",
    shortCode: "PCM",
    beanSize: "large",
    density: "medium",
    flavorLean: ["floral", "body"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0, preheatW: 16, dryingS: 12, midS: 4, developmentS: 2, fanRpm: 120 },
    notes: "Pacas × Maragogipe. Large seed takes longer to heat through — more preheat and drying, then a normal finish.",
    cup: "Floral, chocolate, wide body",
  },
  {
    id: "maragogipe",
    name: "Maragogipe",
    shortCode: "MRG",
    beanSize: "large",
    density: "soft",
    flavorLean: ["balance"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0, preheatW: 12, dryingS: 14, midS: 2, developmentS: 0, fanRpm: 150 },
    notes: "Elephant bean: huge, often softer than Pacamara. Extra dry time to cook the core; do not scorch the surface with an aggressive charge.",
    cup: "Mild, sweet, tea-like when not baked",
  },
  {
    id: "heirloom",
    name: "Ethiopian landrace",
    shortCode: "HEI",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["floral", "fruity"],
    suggestedStyle: "light",
    roast: { fcTemp: -1, preheatW: 8, dryingS: 2, midS: -6, developmentS: -10, fanRpm: 50 },
    notes: "Mixed Ethiopian landraces. Treat as floral/fruit: dense enough for energy, short enough development to keep jasmine and berry.",
    cup: "Floral, bergamot, blueberry, tea",
  },
  {
    id: "wush-wush",
    name: "Wush Wush",
    shortCode: "WSH",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["floral"],
    suggestedStyle: "light",
    roast: { fcTemp: -1.5, preheatW: 8, dryingS: 2, midS: -8, developmentS: -14, fanRpm: 80 },
    notes: "Ethiopian origin, now also Colombia. Gesha-adjacent florals — short development, light drop.",
    cup: "Rose, tropical, bergamot",
  },
  {
    id: "sidra",
    name: "Sidra",
    shortCode: "SDR",
    beanSize: "medium",
    density: "hard",
    flavorLean: ["floral", "fruity"],
    suggestedStyle: "light",
    roast: { fcTemp: -1.2, preheatW: 6, dryingS: 2, midS: -6, developmentS: -12, fanRpm: 80 },
    notes: "Bourbon-related Ecuador / Colombia specialty. Tropical-floral; keep Maillard compact and development short.",
    cup: "Tropical fruit, jasmine, candy",
  },
  {
    id: "tabi",
    name: "Tabi",
    shortCode: "TAB",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["clean"],
    suggestedStyle: "light",
    roast: { fcTemp: 0, preheatW: 2, dryingS: 0, midS: -2, developmentS: -2, fanRpm: 0 },
    notes: "Colombia rust-resistant Typica × Bourbon × Timor. Cleaner cup than Castillo; small deltas from a Caturra-like roast.",
    cup: "Clean, sweet, mild floral",
  },
  {
    id: "ruiru11",
    name: "Ruiru 11",
    shortCode: "RU11",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["body", "balance"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0.3, preheatW: 4, dryingS: 2, midS: 4, developmentS: 4, fanRpm: -50 },
    notes: "Kenya rust-resistant. Less sparkle than SL28; a little more mid and body development fills the cup.",
    cup: "Brown sugar, citrus, more body than SL28",
  },
  {
    id: "java",
    name: "Java",
    shortCode: "JAV",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["clean", "floral"],
    suggestedStyle: "light",
    roast: { fcTemp: -0.5, preheatW: 2, dryingS: 0, midS: -4, developmentS: -6, fanRpm: 40 },
    notes: "Clean, tea-like Typica lineage (Indonesia / Cameroon / Central America). Do not over-develop.",
    cup: "Tea, clean sweetness, light floral",
  },
  {
    id: "mundo-novo",
    name: "Mundo Novo",
    shortCode: "MNV",
    beanSize: "medium",
    density: "medium",
    flavorLean: ["deepSweet", "body"],
    suggestedStyle: "medium",
    roast: { fcTemp: 0.4, preheatW: 0, dryingS: 2, midS: 6, developmentS: 6, fanRpm: -80 },
    notes: "Brazil Typica × Bourbon. Chocolate and nut — give Maillard time; espresso-friendly.",
    cup: "Chocolate, nut, low sparkle",
  },
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

/**
 * Nano `recommended_level` for each style. The machine scale is 0.1–5.9;
 * official guidance is 1.5–2.0 lighter, 2.5–3.5 medium, 4.0+ darker
 * (KL JP manual). Official Washed/Natural v1.1 ship at 1.4; Classic at 1.2.
 * Level is a stop on *this* curve’s `roast_levels` table, not a universal °C
 * or a DTR. On a fixed .kpro, raising level always raises DTR (Hilder);
 * Kaffe keeps DTR in-band by reshaping the post-crack slope (Alstrup).
 */
export const STYLES: { id: RoastStyleId; name: string; level: number }[] = [
  { id: "light", name: "Light", level: 1.6 },
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
    why: "A slightly longer Maillard than a fruit bomb, without pushing into caramelized darkness. Reads as cane, honey, or simple syrup — not brown sugar.",
    expected: ["Honey", "Cane sugar", "Clean"],
    tradeoffs: ["Heavy body"],
    warning: "Overstretching mid-roast mutes sparkle.",
    suggestedStyle: "light",
  },
  {
    id: "caramel",
    name: "Caramel",
    icon: "🍮",
    strategy: ["Moderate-long Maillard", "Hold through colour change", "Medium-light drop"],
    why: "Furans and diketones that read as caramel sauce peak at a compact-but-not-rushed mid (van Boekel; medium roast RL55 in GC-O work). Shorter than deep sweet; cooler than cocoa.",
    expected: ["Caramel", "Toffee", "Butterscotch"],
    tradeoffs: ["Bright citrus"],
    warning: "Stretching this into a long development turns sauce into molasses or bake.",
    suggestedStyle: "medium",
  },
  {
    id: "deepSweet",
    name: "Deep Sweet",
    icon: "🍬",
    strategy: ["Longer Maillard", "Later first crack", "More development"],
    why: "Slow browning builds melanoidins that taste like panela, molasses, date, or stewed fruit — low and round, not candy. Not caramel sauce and not milk chocolate.",
    expected: ["Panela", "Molasses", "Cooked fruit"],
    tradeoffs: ["Bright fruit"],
    warning: "Too much development turns sweet into baked.",
    suggestedStyle: "medium",
  },
  {
    id: "cocoa",
    name: "Cocoa / nutty",
    icon: "🍫",
    strategy: ["Longer development", "Medium colour", "Keep late RoR calm"],
    why: "At similar drop colour, extra post-crack time shifts the cup to nutty and chocolate (Alstrup et al. 2020). Pyrazines need that late Maillard; milk-chocolate cream still needs the lot to have it.",
    expected: ["Cocoa", "Hazelnut", "Graham"],
    tradeoffs: ["Acidity", "Floral"],
    warning: "A light drop cannot invent chocolate; this only works near medium colour.",
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

export function varietyById(id: string): VarietyInfo {
  return VARIETIES.find((v) => v.id === id) ?? VARIETIES[0];
}

const VOLATILE_VARIETIES = new Set(["gesha", "pink-bourbon", "heirloom", "wush-wush", "sidra"]);
const BODY_VARIETIES = new Set(["castillo", "colombia-var", "ruiru11", "mundo-novo"]);

export function recommendFlavor(
  flavor: FlavorId,
  process: ProcessId,
  style: RoastStyleId,
  origin: OriginInfo,
  variety?: VarietyInfo,
  density?: DensityClass,
): Rec {
  if (style === "dark" && ["fruity", "floral", "bright", "juicy"].includes(flavor)) return "avoid";
  if (style === "dark" && ["deepSweet", "body", "cocoa", "caramel"].includes(flavor)) return "recommended";
  if (variety && VOLATILE_VARIETIES.has(variety.id) && ["floral", "fruity", "bright"].includes(flavor) && style !== "dark") {
    return "recommended";
  }
  if (variety && VOLATILE_VARIETIES.has(variety.id) && ["body", "deepSweet", "cocoa"].includes(flavor) && style === "light") {
    return "avoid";
  }
  if (variety && BODY_VARIETIES.has(variety.id) && ["body", "balance", "deepSweet", "cocoa", "caramel"].includes(flavor)) return "recommended";
  if (variety && BODY_VARIETIES.has(variety.id) && flavor === "floral" && style !== "light") return "avoid";
  if (variety && variety.id !== "unknown" && variety.flavorLean.includes(flavor) && style !== "dark") {
    return "recommended";
  }
  if (process === "natural" && ["fruity", "winey", "juicy"].includes(flavor)) return "recommended";
  if (process === "washed" && ["clean", "bright", "floral", "balance", "caramel"].includes(flavor)) return "recommended";
  if (process === "anaerobic" && ["winey", "fruity"].includes(flavor)) return "recommended";
  if ((density ?? origin.density) === "soft" && flavor === "bright") return "avoid";
  if (origin.id === "colombia-narino" && ["floral", "bright", "clean"].includes(flavor)) return "recommended";
  if (origin.id === "colombia-huila" && ["juicy", "bright", "balance"].includes(flavor)) return "recommended";
  if (origin.id === "colombia-sierra" && ["body", "deepSweet", "cocoa"].includes(flavor)) return "recommended";
  if (origin.id === "colombia-sierra" && ["bright", "floral"].includes(flavor)) return "avoid";
  if (origin.id === "colombia-tolima" && ["deepSweet", "body", "balance"].includes(flavor)) return "recommended";
  if (style === "light" && ["fruity", "bright", "floral", "juicy", "lightSweet"].includes(flavor)) return "recommended";
  return "neutral";
}
