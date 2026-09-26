import { describe, expect, it } from "vitest";
import {
  boilingPointC,
  bagBrewFields,
  defaultDays,
  defaultMethod,
  densityFromBag,
  densityFromFarmM,
  formatBrewTime,
  recommendBrew,
  snapshotFromIntent,
  snapshotFromKpro,
  suggestedSwitchMode,
  suggestedTechniqueId,
  techniquesFor,
  BREW_METHODS,
  doseForCup,
  drinkG,
  type BrewMethod,
} from "./brew";
import { VARIETIES, type FlavorId, type ProcessId, type RoastStyleId } from "./knowledge";
import { defaultIntent, generateProfile } from "./generate";
import { parseKpro } from "./kpro";

const GRIND_ORDER = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"] as const;

describe("boiling point", () => {
  it("matches ISA pressure + Antoine: about 1 °C per 300 m", () => {
    expect(boilingPointC(0)).toBeCloseTo(100, 2);
    expect(boilingPointC(1500)).toBeCloseTo(95.02, 1);
    expect(boilingPointC(1800)).toBeCloseTo(94.03, 1);
    expect(boilingPointC(2600)).toBeCloseTo(91.36, 1);
  });
});

describe("defaults from the roast", () => {
  it("maps roast brew to a drink method and Rest/RTD to a day", () => {
    expect(defaultMethod("filter")).toBe("v60");
    expect(defaultMethod("espresso")).toBe("espresso");
    expect(defaultMethod("cupping")).toBe("cupping");
    expect(defaultMethod("omni")).toBe("v60");
    expect(defaultDays("rest")).toBe(4);
    expect(defaultDays("rtd")).toBe(2);
  });

  it("reads lot density from farm metres, not the kettle", () => {
    expect(densityFromFarmM(undefined)).toBeUndefined();
    expect(densityFromFarmM(1100)).toBe("soft");
    expect(densityFromFarmM(1500)).toBe("medium");
    expect(densityFromFarmM(1800)).toBe("hard");
  });

  it("origin and variety move density, seed size, and flavor lean — not a new recipe table", () => {
    expect(densityFromBag("ethiopia", "heirloom", 2000)).toBe("hard");
    expect(densityFromBag("brazil", "catuai", 1100)).toBe("soft");
    expect(densityFromBag("colombia-antioquia", "gesha", 1550)).toBe("hard");
    expect(densityFromBag("colombia-narino", "caturra", 2050)).toBe("hard");

    const gesha = bagBrewFields({
      roastStyle: "light",
      process: "washed",
      flavors: [],
      originId: "colombia",
      varietyId: "gesha",
      farmAltitudeM: 1800,
    });
    expect(gesha.flavors).toEqual(["floral", "bright"]);
    expect(gesha.densityClass).toBe("hard");
    expect(gesha.varietyName).toMatch(/Gesha/);

    const chiroso = bagBrewFields({
      roastStyle: "light",
      process: "washed",
      flavors: [],
      originId: "colombia-antioquia",
      varietyId: "chiroso",
      farmAltitudeM: 1900,
    });
    expect(chiroso.flavors).toEqual(["floral", "juicy"]);
    expect(chiroso.densityClass).toBe("hard");
    expect(chiroso.varietyName).toMatch(/Chiroso/);

    const picked = bagBrewFields({
      roastStyle: "light",
      process: "washed",
      flavors: ["body"],
      originId: "kenya",
      varietyId: "sl28",
      farmAltitudeM: 1750,
    });
    expect(picked.flavors).toEqual(["body"]);
    expect(picked.beanSize).toBe("medium");

    const kenyaFresh = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      ...bagBrewFields({
        roastStyle: "light",
        process: "washed",
        flavors: [],
        originId: "kenya",
        varietyId: "sl28",
        farmAltitudeM: 1750,
      }),
    });
    expect(kenyaFresh.suggestedTechnique).toBe("hedrick");
    expect(kenyaFresh.why.join(" ")).toMatch(/SL28|Kenya/);
    const kenya = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      ...bagBrewFields({
        roastStyle: "light",
        process: "washed",
        flavors: [],
        originId: "kenya",
        varietyId: "sl28",
        farmAltitudeM: 1750,
      }),
    });
    expect(kenya.suggestedTechnique).toBe("kasuya-acid");
    const plain = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
    });
    expect(GRIND_ORDER.indexOf(kenya.grind)).toBeGreaterThan(GRIND_ORDER.indexOf(plain.grind));

    const brazilBag = bagBrewFields({
      roastStyle: "medium",
      process: "natural",
      flavors: [],
      originId: "brazil",
      varietyId: "catuai",
      farmAltitudeM: 1100,
    });
    expect(brazilBag.densityClass).toBe("soft");
    const brazil = recommendBrew({
      method: "v60",
      roastStyle: "medium",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      ...brazilBag,
    });
    expect(brazil.why.join(" ")).toMatch(/Brazil|Catuai/);
    expect(GRIND_ORDER.indexOf(brazil.grind)).toBeLessThan(GRIND_ORDER.indexOf(kenya.grind));
  });

  it("does not treat farm altitude as kitchen altitude", () => {
    const snap = snapshotFromIntent({ ...defaultIntent(), altitudeM: 1800 }, "lot");
    expect(snap.farmAltitudeM).toBe(1800);
    const sea = recommendBrew({
      method: "v60",
      roastStyle: snap.roastStyle,
      drinkPlan: snap.drinkPlan,
      daysSinceRoast: 4,
    });
    expect(sea.boilC).toBeUndefined();
    expect(sea.cappedByBoil).toBe(false);
    expect(sea.kettleC).toBe(96);
  });
});

describe("snapshotFromKpro", () => {
  it("reads style, brew, Rest, flavors and altitude from a Kaffe file", () => {
    const gen = generateProfile({
      ...defaultIntent(),
      altitudeM: 1800,
      drinkPlan: "rest",
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "lightSweet", weight: 1 }, { id: "juicy", weight: 1 }],
    });
    const snap = snapshotFromKpro(parseKpro(gen.kproText, gen.profile.fileName));
    expect(snap.roastStyle).toBe("light");
    expect(snap.brew).toBe("filter");
    expect(snap.drinkPlan).toBe("rest");
    expect(snap.process).toBe("washed");
    expect(snap.farmAltitudeM).toBe(1800);
    expect(snap.flavors).toEqual(expect.arrayContaining(["lightSweet", "juicy"]));
    expect(snap.level).toBeCloseTo(1.6, 1);
  });

  it("flags RTD from the description", () => {
    const gen = generateProfile({ ...defaultIntent(), drinkPlan: "rtd" });
    const snap = snapshotFromKpro(parseKpro(gen.kproText, gen.profile.fileName));
    expect(snap.drinkPlan).toBe("rtd");
  });
});

describe("recommendBrew", () => {
  it("caps a Light V60 at local boil without grinding finer while the kettle is still in the SCA band", () => {
    const sea = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      kitchenAltitudeM: 0,
    });
    expect(sea.kettleC).toBe(96);
    expect(sea.cappedByBoil).toBe(false);
    expect(sea.ratio).toBe("1:16");
    expect(sea.technique).toBe("hoffmann");
    expect(sea.steps.length).toBeGreaterThanOrEqual(4);

    const at2000 = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      kitchenAltitudeM: 2000,
    });
    expect(at2000.boilC).toBeCloseTo(93.3, 1);
    expect(at2000.kettleC).toBeCloseTo(92.3, 1);
    expect(at2000.cappedByBoil).toBe(true);
    expect(at2000.grind).toBe(sea.grind);
    expect(at2000.timeS).toBe(sea.timeS);

    const bogota = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      kitchenAltitudeM: 2600,
    });
    expect(bogota.kettleC).toBeLessThan(92);
    expect(GRIND_ORDER.indexOf(bogota.grind)).toBeGreaterThanOrEqual(GRIND_ORDER.indexOf(sea.grind));
    expect(bogota.grindNudgeT ?? 0).toBeLessThan(0);
    expect(bogota.timeS).toBeGreaterThan(sea.timeS);
  });

  it("does not cap espresso at kettle boil", () => {
    const rec = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 2600,
    });
    expect(rec.kettleC).toBe(93);
    expect(rec.cappedByBoil).toBe(false);
    expect(rec.kettleNote).toMatch(/pressurized/i);
  });

  it("warns when Bogotá-height boil sits under the SCA floor", () => {
    const rec = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 2600,
    });
    expect(rec.boilC).toBeLessThan(92);
    expect(rec.warnings.some((w) => /SCA 92/.test(w))).toBe(true);
    expect(rec.kettleC).toBeLessThan(rec.wantedC);
  });

  it("runs a fruity Light V60 finer/hotter than a body-focused one", () => {
    const fruit = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      flavors: ["fruity", "juicy"],
    });
    const body = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      flavors: ["body", "deepSweet"],
    });
    expect(fruit.wantedC).toBeGreaterThan(body.wantedC);
    expect(fruit.technique).toBe("hedrick");
    expect(GRIND_ORDER.indexOf(fruit.grind)).toBeGreaterThanOrEqual(GRIND_ORDER.indexOf(body.grind));
  });

  it("builds AeroPress Light as concentrate plus bypass", () => {
    const rec = recommendBrew({
      method: "aeropress",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(rec.bypassG).toBeGreaterThan(0);
    expect(rec.steps.some((s) => /bypass|Dilute/i.test(`${s.title} ${s.detail}`))).toBe(true);
  });

  it("flags Dark as having no competition corpus", () => {
    const rec = recommendBrew({
      method: "v60",
      roastStyle: "dark",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(rec.warnings.some((w) => /Dark/.test(w))).toBe(true);
  });

  it("treats day 10 Light Rest as still good, not a stale bag", () => {
    const day10 = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 10,
      kitchenAltitudeM: 0,
    });
    expect(day10.restLabel).toMatch(/blooming|good/i);
    expect(day10.warnings.some((w) => /fresher bag|Stale/i.test(w))).toBe(false);
    expect(day10.technique).toBe("hedrick");
    expect(day10.steps.some((s) => /Bloom 2|CO₂|45–60|3×/.test(`${s.title} ${s.detail}`))).toBe(true);
    const week5 = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 36,
      kitchenAltitudeM: 0,
    });
    expect(week5.restLabel).toMatch(/fading/i);
  });

  it("labels Rest good window vs RTD fade", () => {
    const peak = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(peak.restLabel).toMatch(/good|blooming/i);
    const fade = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rtd",
      daysSinceRoast: 6,
      kitchenAltitudeM: 0,
    });
    expect(fade.restLabel).toMatch(/past peak/i);
  });

  it("scales water with dose and ratio, and coarsens grind on a double V60 bed", () => {
    const base = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    const double = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      coffeeG: 30,
      ratio: 16,
    });
    expect(double.coffeeG).toBe(30);
    expect(double.waterG).toBe(480);
    expect(double.timeS).toBeGreaterThan(base.timeS);
    expect(GRIND_ORDER.indexOf(double.grind)).toBeLessThan(GRIND_ORDER.indexOf(base.grind));

    const tight = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      coffeeG: 15,
      ratio: 14,
    });
    expect(tight.waterG).toBe(210);
    expect(GRIND_ORDER.indexOf(tight.grind)).toBeGreaterThan(GRIND_ORDER.indexOf(base.grind));
  });

  it("coarsens a Hario Switch when the bed is doubled", () => {
    const card = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      process: "honey",
      flavors: ["juicy", "lightSweet"],
    });
    const double = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      process: "honey",
      flavors: ["juicy", "lightSweet"],
      coffeeG: 30,
    });
    expect(card.cardDoseG).toBe(15);
    expect(GRIND_ORDER.indexOf(double.grind)).toBeLessThan(GRIND_ORDER.indexOf(card.grind));
  });

  it("does not cap cold brew at kettle boil and uses hours", () => {
    const rec = recommendBrew({
      method: "coldbrew",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 2600,
    });
    expect(rec.cappedByBoil).toBe(false);
    expect(rec.timeLabel).toMatch(/h fridge/);
    expect(rec.kettleNote).toMatch(/Fridge/i);
  });

  it("keeps an OREA Light card on the Wölfl cluster", () => {
    const rec = recommendBrew({
      method: "orea",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(rec.coffeeG).toBe(17);
    expect(rec.wantedC).toBe(93);
    expect(rec.steps.length).toBeGreaterThanOrEqual(4);
  });

  it("formats filter time as m:ss", () => {
    expect(formatBrewTime(165)).toBe("2:45");
    expect(formatBrewTime(28)).toBe("0:28");
  });
});

describe("Hario Switch valve modes", () => {
  it("suggests Fukahori for Light + juicy, Super Hybrid for Light, hold for Medium, Bull for acid natural, steep for Dark", () => {
    expect(suggestedSwitchMode("light", ["juicy"])).toBe("fukahori");
    expect(suggestedSwitchMode("light", ["lightSweet"])).toBe("hybrid");
    expect(suggestedSwitchMode("medium", ["lightSweet"])).toBe("hold");
    expect(suggestedSwitchMode("dark", [])).toBe("steep");
    expect(suggestedSwitchMode("light", ["juicy"], "natural")).toBe("bull");
    expect(suggestedSwitchMode("light", [], "natural")).toBe("steep");
    expect(suggestedSwitchMode("medium", ["body"])).toBe("steep");
    expect(suggestedSwitchMode("light", ["juicy"], "natural", true)).toBe("hybrid");
  });

  it("keeps a gassy Light natural Switch off Bull and off a fine grind at altitude", () => {
    const rec = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 7,
      kitchenAltitudeM: 2000,
      process: "natural",
      flavors: ["juicy", "lightSweet"],
      densityClass: "hard",
    });
    expect(rec.switchMode).toBe("hybrid");
    expect(rec.suggestedSwitchMode).toBe("hybrid");
    expect(["medium", "medium-coarse", "coarse"]).toContain(rec.grind);
    expect(rec.steps.some((s) => /bloom/i.test(s.title))).toBe(true);
    expect(rec.steps.some((s) => /0:00/.test(s.at) && /bloom/i.test(s.title))).toBe(true);
    expect(rec.why.join(" ")).toMatch(/blooming|Super Hybrid|gas/i);
  });

  it("uses the suggested mode on Light + juicy and rewrites steps when overridden", () => {
    const gassy = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      flavors: ["juicy"],
    });
    expect(gassy.suggestedSwitchMode).toBe("hybrid");
    expect(gassy.switchMode).toBe("hybrid");

    const auto = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
    });
    expect(auto.suggestedSwitchMode).toBe("fukahori");
    expect(auto.switchMode).toBe("fukahori");
    expect(auto.steps.some((s) => /open/i.test(s.title) && /pour/i.test(s.title))).toBe(true);
    expect(auto.why.join(" ")).toMatch(/Fukahori|Suggested/);

    const hold = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
      switchMode: "hold",
    });
    expect(hold.switchMode).toBe("hold");
    expect(hold.suggestedSwitchMode).toBe("fukahori");
    expect(hold.steps.some((s) => /First pour/i.test(s.title) && /closed/i.test(s.title))).toBe(true);
    expect(hold.why.join(" ")).toMatch(/overrode/);

    const v60 = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    expect(v60.switchMode).toBeUndefined();
  });
});

describe("flavor-mapped competition recipes", () => {
  it("suggests temperate AeroPress for Medium / Dark and hot inverted for Light fruit", () => {
    expect(suggestedTechniqueId("aeropress", "medium", [])).toBe("pop");
    expect(suggestedTechniqueId("aeropress", "dark", ["body"])).toBe("pop");
    expect(suggestedTechniqueId("aeropress", "light", ["juicy"])).toBe("stanica");
    expect(suggestedTechniqueId("aeropress", "light", ["floral"])).toBe("merikanto");
  });

  it("builds Pop's 84 °C brew + 50 °C bypass when tempered is selected", () => {
    const rec = recommendBrew({
      method: "aeropress",
      roastStyle: "medium",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(rec.technique).toBe("pop");
    expect(rec.wantedC).toBe(84);
    expect(rec.bypassG).toBeGreaterThan(0);
    expect(rec.steps.some((s) => /50|temper/i.test(`${s.title} ${s.detail}`))).toBe(true);
    expect(rec.kettleNote).toMatch(/50/);
  });

  it("builds Merikanto's 80 °C inverted cup with no bypass", () => {
    const rec = recommendBrew({
      method: "aeropress",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      flavors: ["floral"],
    });
    expect(rec.technique).toBe("merikanto");
    expect(rec.wantedC).toBe(80);
    expect(rec.bypassG).toBeUndefined();
    expect(rec.steps.some((s) => /80|Merikanto|temperate/i.test(`${s.title} ${s.detail}`))).toBe(true);
  });

  it("maps Light + juicy V60 to 4:6 acidity and floral to Peng split-temp once degassed", () => {
    const acid = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      kitchenAltitudeM: 0,
      flavors: ["juicy"],
    });
    expect(acid.technique).toBe("kasuya-acid");
    expect(acid.steps.some((s) => /acid/i.test(s.title))).toBe(true);
    expect(acid.wantedC).toBe(92);
    expect(acid.kettleC).toBe(92);

    const floral = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      kitchenAltitudeM: 0,
      flavors: ["floral"],
    });
    expect(floral.technique).toBe("peng");
    expect(floral.steps.some((s) => /80|cool/i.test(`${s.title} ${s.detail}`))).toBe(true);
  });

  it("adds Rao, Hedrick, Japanese iced, and Tay as distinct drinks", () => {
    const rao = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 12,
      kitchenAltitudeM: 0,
      flavors: ["clean"],
      technique: "rao",
    });
    expect(rao.technique).toBe("rao");
    expect(rao.suggestedTechnique).toBe("winton");
    expect(rao.steps.some((s) => /spin/i.test(`${s.title} ${s.detail}`))).toBe(true);

    const fresh = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(fresh.technique).toBe("hedrick");
    expect(fresh.steps.some((s) => /Bloom 2/i.test(s.title))).toBe(true);

    const rested = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 12,
      kitchenAltitudeM: 0,
    });
    expect(rested.technique).toBe("hoffmann");

    const winey = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      flavors: ["winey"],
    });
    expect(winey.technique).toBe("hedrick");

    const iced = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      technique: "iced",
    });
    expect(iced.bypassG).toBeGreaterThan(0);
    expect(iced.steps.some((s) => /ice/i.test(`${s.title} ${s.detail}`))).toBe(true);

    const tay = recommendBrew({
      method: "aeropress",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      technique: "tay",
    });
    expect(tay.origin).toMatch(/Wipvasutt|2023/);
    expect(tay.steps.some((s) => /Charge|2 g|remaining/i.test(`${s.title} ${s.detail}`))).toBe(true);
  });

  it("exposes older world wins that are a different drink: Chad, Hsu, Du, Fukahori GINA, Bull", () => {
    const chad = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      technique: "chad",
    });
    expect(chad.steps.some((s) => /centre|center/i.test(`${s.title} ${s.detail}`))).toBe(true);

    const hsu = recommendBrew({
      method: "orea",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      process: "natural",
    });
    expect(hsu.technique).toBe("hsu");
    expect(hsu.steps.some((s) => /70/.test(`${s.title} ${s.detail}`))).toBe(true);

    const duFresh = recommendBrew({
      method: "origami",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      flavors: ["juicy"],
    });
    expect(duFresh.technique).toBe("medina");

    const du = recommendBrew({
      method: "origami",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
    });
    expect(du.technique).toBe("du");
    expect(du.steps.some((s) => /no separate bloom|Pour 1/i.test(`${s.title} ${s.detail}`))).toBe(true);

    const gina = recommendBrew({
      method: "clever",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      flavors: ["floral"],
    });
    expect(gina.technique).toBe("gina");
    expect(gina.steps.some((s) => /80/.test(`${s.title} ${s.detail}`))).toBe(true);

    expect(suggestedTechniqueId("kalita", "light")).toBe("mccarthy");
  });

  it("suggests Gaggiuino espresso scripts from roast and flavor, and prints the SproFiler name", () => {
    expect(suggestedTechniqueId("espresso", "light", [])).toBe("adaptive-light");
    expect(suggestedTechniqueId("espresso", "light", ["juicy"])).toBe("extractamundo");
    expect(suggestedTechniqueId("espresso", "light", ["floral"])).toBe("blooming");
    expect(suggestedTechniqueId("espresso", "medium", [])).toBe("londinium");
    expect(suggestedTechniqueId("espresso", "dark", ["body"])).toBe("adaptive-dark");

    const turbo = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 16,
      flavors: ["juicy"],
    });
    expect(turbo.gaggiuino).toBe("Extractamundo Dos!");
    expect(turbo.gaggiuino).not.toMatch(/\bv\d/i);
    expect(turbo.timeS).toBeLessThan(25);
    expect(turbo.steps.some((s) => /4\.5 bar/.test(`${s.title} ${s.detail}`))).toBe(true);
    expect(turbo.steps.some((s) => /6 bar/.test(`${s.title} ${s.detail}`))).toBe(true);
    expect(turbo.steps.some((s) => /paddle|flow control/i.test(`${s.title} ${s.detail}`))).toBe(true);
    expect(turbo.steps.some((s) => s.title === "Gaggiuino" || s.at === "Note")).toBe(false);
    expect(turbo.cappedByBoil).toBe(false);

    const gassyShot = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    expect(gassyShot.gaggiuino).toBe("Blooming espresso");

    const light = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 16,
    });
    expect(light.gaggiuino).toBe("Adaptive for Light Roast");
    expect(light.gaggiuino).not.toMatch(/\bv\d/i);
    expect(turbo.origin).toMatch(/Extractamundo|IUIUIU/);
    expect(light.origin).toMatch(/Adaptive Light/);
  });

  it("credits the competition or document on every card", () => {
    const kasuya = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
    });
    expect(kasuya.origin).toMatch(/WBrC 2016/);
    const chemex = recommendBrew({
      method: "chemex",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    expect(chemex.origin).toMatch(/Hoffmann/);
    const cupping = recommendBrew({
      method: "cupping",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    expect(cupping.origin).toMatch(/SCA/);
  });

  it("shows a single cited card for Moka and cupping", () => {
    expect(techniquesFor("chemex").map((t) => t.id)).toEqual(["hoffmann", "stumptown"]);
    for (const method of ["moka", "cupping"] as const) {
      const list = techniquesFor(method);
      expect(list).toHaveLength(1);
      const rec = recommendBrew({
        method,
        roastStyle: "light",
        drinkPlan: "rest",
        daysSinceRoast: 4,
      });
      expect(rec.technique).toBe(list[0].id);
      expect(rec.suggestedTechnique).toBe(list[0].id);
      expect(rec.origin).toBeTruthy();
    }
  });

  it("writes Spanish recipe descriptions and steps", () => {
    const rec = recommendBrew({
      method: "v60",
      roastStyle: "medium",
      drinkPlan: "rest",
      daysSinceRoast: 12,
      locale: "es",
    });
    expect(rec.steps[0].title).toBe("Enjuagar");
    expect(rec.steps[0].detail).toMatch(/Kasuya|papel|cono/i);
    expect(rec.steps.some((s) => /vertido|drenaje|enjuaga/i.test(`${s.title} ${s.detail}`))).toBe(true);
    const techs = techniquesFor("v60", "es");
    expect(techs.find((x) => x.id === rec.technique)?.flavor).not.toMatch(/Balanced \/ daily/);
    expect(techs.find((x) => x.id === rec.technique)?.blurb).toMatch(/esqueleto|Kasuya|Peng|Hoffmann|Hedrick|Wang|Rao/i);
  });
});

const NO_BLOOM = new Set(["bull", "du", "extractamundo", "short"]);

const GASSY_COLOMBIA = {
  roastStyle: "light" as const,
  drinkPlan: "rest" as const,
  daysSinceRoast: 7,
  kitchenAltitudeM: 2000,
  process: "natural" as const,
  flavors: ["juicy", "lightSweet"] as FlavorId[],
  densityClass: "hard" as const,
};

describe("gassy recipe matrix", () => {
  it("never suggests a no-bloom / turbo default on a day-7 Light natural", () => {
    const expectTech: Record<string, string> = {
      v60: "hedrick",
      kalita: "mccarthy",
      origami: "medina",
      chemex: "hoffmann",
      switch: "hybrid",
      clever: "steep",
      aeropress: "merikanto",
      frenchpress: "hoffmann",
      orea: "hsu",
      coldbrew: "rtd",
      moka: "hoffmann",
      espresso: "blooming",
      cupping: "sca",
    };
    for (const method of Object.keys(expectTech) as BrewMethod[]) {
      const rec = recommendBrew({ method, ...GASSY_COLOMBIA });
      expect(rec.suggestedTechnique, method).toBe(expectTech[method]);
      expect(rec.technique, method).toBe(expectTech[method]);
      expect(NO_BLOOM.has(rec.technique ?? ""), method).toBe(false);
      if (method !== "coldbrew" && method !== "cupping") {
        expect(rec.why.join(" "), method).toMatch(/blooming|gas/i);
      }
      if (["v60", "switch", "origami", "orea", "chemex", "kalita", "clever"].includes(method)) {
        expect(["medium", "medium-coarse", "coarse"]).toContain(rec.grind);
      }
    }
  });

  it("uses a long Hedrick bloom while gassy and restores championship picks once degassed", () => {
    const gassyV60 = recommendBrew({ method: "v60", ...GASSY_COLOMBIA });
    expect(gassyV60.steps.some((s) => s.at === "0:45" && /Bloom 2/i.test(s.title))).toBe(true);
    expect(gassyV60.steps.some((s) => s.at === "1:30")).toBe(true);

    const rested = {
      roastStyle: "light" as const,
      drinkPlan: "rest" as const,
      daysSinceRoast: 14,
      kitchenAltitudeM: 0,
      flavors: ["juicy"] as FlavorId[],
    };
    expect(recommendBrew({ method: "v60", ...rested }).technique).toBe("kasuya-acid");
    expect(recommendBrew({ method: "switch", ...rested }).technique).toBe("fukahori");
    expect(recommendBrew({ method: "origami", ...rested }).technique).toBe("du");
    expect(recommendBrew({ method: "espresso", ...rested, daysSinceRoast: 16 }).technique).toBe("extractamundo");
    expect(recommendBrew({ method: "clever", ...rested }).technique).toBe("short");
  });

  it("warns if a gassy cup is forced onto Bull, Du, turbo, or a short Clever", () => {
    const bull = recommendBrew({ method: "switch", ...GASSY_COLOMBIA, technique: "bull" });
    expect(bull.technique).toBe("bull");
    expect(bull.suggestedTechnique).toBe("hybrid");
    expect(bull.warnings.join(" ")).toMatch(/gas dump|bitter|bloom/i);

    const du = recommendBrew({ method: "origami", ...GASSY_COLOMBIA, technique: "du" });
    expect(du.warnings.join(" ")).toMatch(/gas dump|bitter|bloom/i);

    const turbo = recommendBrew({ method: "espresso", ...GASSY_COLOMBIA, technique: "extractamundo" });
    expect(turbo.warnings.join(" ")).toMatch(/gas dump|bitter|Blooming/i);
  });

  it("treats honey and anaerobic like a natural on a gassy Switch", () => {
    for (const process of ["honey", "anaerobic"] as const) {
      const rec = recommendBrew({
        method: "switch",
        roastStyle: "light",
        drinkPlan: "rest",
        daysSinceRoast: 7,
        process,
        flavors: ["juicy"],
      });
      expect(rec.technique).toBe("hybrid");
      expect(rec.why.join(" ")).toMatch(/Natural \/ honey \/ anaerobic|fines/i);
    }
  });
});

describe("flavor combinations pick the recipe that claims that cup", () => {
  const pick = (
    method: BrewMethod,
    flavors: FlavorId[],
    extra?: { gassy?: boolean; process?: "washed" | "natural"; style?: "light" | "medium" | "dark" },
  ) =>
    suggestedTechniqueId(
      method,
      extra?.style ?? "light",
      flavors,
      extra?.process ?? "washed",
      extra?.gassy ?? false,
    );

  it("maps every single I-want word on a degassed Light washed lot", () => {
    const singles: Array<[FlavorId[], string, string, string, string, string, string]> = [
      // flavors, v60, switch, origami, espresso, aeropress, clever
      [[], "hoffmann", "hybrid", "medina", "adaptive-light", "stanica", "steep"],
      [["juicy"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "short"],
      [["fruity"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "short"],
      [["bright"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "short"],
      [["floral"], "peng", "jaafar", "du", "blooming", "merikanto", "gina"],
      [["winey"], "hedrick", "hybrid", "du", "blooming", "merikanto", "steep"],
      [["lightSweet"], "kasuya-sweet", "hybrid", "medina", "adaptive-light", "merikanto", "gina"],
      [["clean"], "winton", "hybrid", "medina", "adaptive-light", "stanica", "steep"],
      [["balance"], "hoffmann", "hybrid", "medina", "adaptive-light", "stanica", "steep"],
      [["body"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
      [["deepSweet"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
    ];
    for (const [flavors, v60, sw, ori, esp, ap, clever] of singles) {
      const label = flavors.join("+") || "none";
      expect(pick("v60", flavors), `v60 ${label}`).toBe(v60);
      expect(pick("switch", flavors), `switch ${label}`).toBe(sw);
      expect(pick("origami", flavors), `origami ${label}`).toBe(ori);
      expect(pick("espresso", flavors), `espresso ${label}`).toBe(esp);
      expect(pick("aeropress", flavors), `aeropress ${label}`).toBe(ap);
      expect(pick("clever", flavors), `clever ${label}`).toBe(clever);
    }
  });

  it("lets the louder word win on two-icon bags, and keeps fruit over a quiet sweet", () => {
    const pairs: Array<[FlavorId[], string, string, string, string, string, string]> = [
      [["juicy", "lightSweet"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "gina"],
      [["fruity", "lightSweet"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "gina"],
      [["bright", "lightSweet"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "gina"],
      [["floral", "juicy"], "peng", "jaafar", "du", "blooming", "merikanto", "gina"],
      [["floral", "lightSweet"], "peng", "jaafar", "du", "blooming", "merikanto", "gina"],
      [["floral", "winey"], "hedrick", "hybrid", "du", "blooming", "merikanto", "gina"],
      [["winey", "juicy"], "hedrick", "hybrid", "du", "blooming", "merikanto", "steep"],
      [["winey", "lightSweet"], "hedrick", "hybrid", "du", "blooming", "merikanto", "gina"],
      [["clean", "juicy"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "short"],
      [["clean", "lightSweet"], "kasuya-sweet", "hybrid", "medina", "adaptive-light", "merikanto", "gina"],
      [["balance", "juicy"], "kasuya-acid", "fukahori", "du", "extractamundo", "stanica", "short"],
      [["body", "juicy"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
      [["body", "floral"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
      [["deepSweet", "juicy"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
      [["deepSweet", "lightSweet"], "hoffmann", "steep", "medina", "adaptive-dark", "pop", "steep"],
    ];
    for (const [flavors, v60, sw, ori, esp, ap, clever] of pairs) {
      const label = flavors.join("+");
      expect(pick("v60", flavors), `v60 ${label}`).toBe(v60);
      expect(pick("switch", flavors), `switch ${label}`).toBe(sw);
      expect(pick("origami", flavors), `origami ${label}`).toBe(ori);
      expect(pick("espresso", flavors), `espresso ${label}`).toBe(esp);
      expect(pick("aeropress", flavors), `aeropress ${label}`).toBe(ap);
      expect(pick("clever", flavors), `clever ${label}`).toBe(clever);
    }
  });

  it("keeps gas-dump scripts when the same pairs are still blooming", () => {
    const pairs: FlavorId[][] = [
      [],
      ["juicy"],
      ["juicy", "lightSweet"],
      ["floral"],
      ["floral", "juicy"],
      ["winey"],
      ["winey", "floral"],
      ["clean"],
      ["lightSweet"],
    ];
    for (const flavors of pairs) {
      const label = flavors.join("+") || "none";
      expect(pick("v60", flavors, { gassy: true }), `v60 gassy ${label}`).toBe("hedrick");
      expect(pick("switch", flavors, { gassy: true }), `switch gassy ${label}`).toBe("hybrid");
      expect(pick("origami", flavors, { gassy: true }), `origami gassy ${label}`).toBe("medina");
      expect(pick("espresso", flavors, { gassy: true }), `espresso gassy ${label}`).toBe("blooming");
      expect(NO_BLOOM.has(pick("clever", flavors, { gassy: true }) ?? ""), `clever gassy ${label}`).toBe(false);
    }
    expect(pick("aeropress", ["juicy", "lightSweet"], { gassy: true })).toBe("merikanto");
    expect(pick("aeropress", ["juicy"], { gassy: true })).toBe("merikanto");
    expect(pick("aeropress", ["floral"], { gassy: true })).toBe("merikanto");
    expect(pick("v60", ["body", "juicy"], { gassy: true })).toBe("hoffmann");
    expect(pick("switch", ["body"], { gassy: true })).toBe("steep");
  });

  it("does not let a quiet sweet steal a fruit card, and does not give Du to a body bag", () => {
    expect(pick("aeropress", ["juicy", "lightSweet"])).toBe("stanica");
    expect(pick("v60", ["juicy", "lightSweet"])).toBe("kasuya-acid");
    expect(pick("origami", ["body", "juicy"])).toBe("medina");
    expect(pick("origami", ["juicy"])).toBe("du");
    expect(pick("orea", ["floral"])).toBe("hsu");
    expect(pick("orea", ["winey"])).toBe("hsu");
    expect(pick("orea", ["juicy"])).toBe("wolfl");
    expect(pick("orea", ["juicy"], { process: "natural" })).toBe("hsu");
    expect(pick("switch", ["winey"], { process: "natural" })).toBe("hybrid");
    expect(pick("switch", ["juicy"], { process: "natural" })).toBe("bull");
  });
});

const ALL_FLAVORS: FlavorId[] = [
  "fruity",
  "lightSweet",
  "deepSweet",
  "bright",
  "juicy",
  "winey",
  "floral",
  "body",
  "clean",
  "balance",
];

function allFlavorCombos(): FlavorId[][] {
  const out: FlavorId[][] = [[]];
  for (const a of ALL_FLAVORS) out.push([a]);
  for (let i = 0; i < ALL_FLAVORS.length; i++) {
    for (let j = i + 1; j < ALL_FLAVORS.length; j++) out.push([ALL_FLAVORS[i], ALL_FLAVORS[j]]);
  }
  return out;
}

describe("every method × every 0–2 flavor combo", () => {
  const combos = allFlavorCombos();
  const styles: RoastStyleId[] = ["light", "medium", "dark"];
  const processes: ProcessId[] = ["washed", "natural", "honey", "anaerobic", "other"];
  const methods = BREW_METHODS.map((m) => m.id);

  it("lists all 56 bags the UI can actually build (none, one, or two icons)", () => {
    expect(combos).toHaveLength(1 + ALL_FLAVORS.length + (ALL_FLAVORS.length * (ALL_FLAVORS.length - 1)) / 2);
  });

  it("always returns a cited card for that method, and never a no-bloom default while gassy unless body/dark asked for steep", () => {
    for (const method of methods) {
      const allowed = new Set(techniquesFor(method).map((t) => t.id));
      for (const style of styles) {
        for (const process of processes) {
          for (const gassy of [false, true]) {
            for (const flavors of combos) {
              const id = suggestedTechniqueId(method, style, flavors, process, gassy);
              const label = `${method} ${style} ${process} ${gassy ? "gassy" : "rested"} ${flavors.join("+") || "none"}`;
              expect(id, label).toBeTruthy();
              expect(allowed.has(id ?? ""), label).toBe(true);
              const heavy = flavors.some((f) => f === "body" || f === "deepSweet");
              if (gassy && !heavy && style !== "dark") {
                expect(NO_BLOOM.has(id ?? ""), label).toBe(false);
              }
            }
          }
        }
      }
    }
  });

  it("builds a card from This bag for every cultivar × every method", () => {
    for (const v of VARIETIES) {
      for (const process of ["washed", "natural"] as const) {
        const bag = bagBrewFields({
          roastStyle: v.suggestedStyle,
          process,
          flavors: [],
          originId: "colombia-huila",
          varietyId: v.id,
          farmAltitudeM: 1800,
        });
        if (v.id !== "unknown") expect(bag.flavors, v.id).toEqual(v.flavorLean.slice(0, 2));
        for (const method of methods) {
          const card = recommendBrew({
            method,
            roastStyle: v.suggestedStyle,
            drinkPlan: "rest",
            daysSinceRoast: 14,
            ...bag,
          });
          const label = `${v.id} ${process} ${method}`;
          expect(card.method, label).toBe(method);
          expect(card.steps.length, label).toBeGreaterThan(0);
          expect(card.kettleC, label).toBeGreaterThan(0);
          expect(card.kettleC, label).toBeLessThanOrEqual(100);
          if (v.id !== "unknown") expect(card.why.join(" "), label).toContain(v.name);
        }
      }
    }
  });

  it("keeps Moka and cupping on their single cited skeleton for every bag", () => {
    for (const method of ["moka", "cupping"] as const) {
      const only = techniquesFor(method)[0].id;
      for (const flavors of combos) {
        expect(suggestedTechniqueId(method, "light", flavors, "natural", true)).toBe(only);
        expect(suggestedTechniqueId(method, "dark", flavors, "washed", false)).toBe(only);
      }
    }
  });

  it("wires the same pick through recommendBrew on Light washed, gassy and degassed", () => {
    const branching: BrewMethod[] = [
      "v60",
      "kalita",
      "origami",
      "switch",
      "clever",
      "aeropress",
      "frenchpress",
      "orea",
      "coldbrew",
      "espresso",
    ];
    for (const method of branching) {
      for (const flavors of combos) {
        const gassy = recommendBrew({
          method,
          roastStyle: "light",
          drinkPlan: "rest",
          daysSinceRoast: 4,
          process: "washed",
          flavors,
        });
        const rested = recommendBrew({
          method,
          roastStyle: "light",
          drinkPlan: "rest",
          daysSinceRoast: method === "espresso" ? 16 : 14,
          process: "washed",
          flavors,
        });
        expect(gassy.suggestedTechnique, `${method} gassy ${flavors.join("+") || "none"}`).toBe(
          suggestedTechniqueId(method, "light", flavors, "washed", true),
        );
        expect(rested.suggestedTechnique, `${method} rested ${flavors.join("+") || "none"}`).toBe(
          suggestedTechniqueId(method, "light", flavors, "washed", false),
        );
        expect(gassy.technique).toBe(gassy.suggestedTechnique);
        expect(rested.technique).toBe(rested.suggestedTechnique);
      }
    }
  });
});


describe("science fixes", () => {
  it("keeps cupping on the SCA protocol whatever the flavor, gas or altitude", () => {
    for (const flavors of [[], ["juicy"], ["body"]] as FlavorId[][]) {
      const cup = recommendBrew({
        method: "cupping",
        roastStyle: "light",
        drinkPlan: "rest",
        daysSinceRoast: 3,
        kitchenAltitudeM: 2600,
        densityClass: "hard",
        flavors,
      });
      expect(cup.wantedC).toBe(93);
      expect(cup.timeS).toBe(240);
      expect(cup.grind).toBe("medium-coarse");
    }
  });

  it("grows the altitude correction with the kettle deficit instead of jumping at 92 °C", () => {
    const at = (m: number) =>
      recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, kitchenAltitudeM: m });
    const justUnder = at(2400);
    expect(justUnder.kettleC).toBeLessThan(92);
    expect(justUnder.grind).toBe(at(0).grind);
    expect(justUnder.grindNudgeT ?? 0).toBeLessThan(0);
    const high = at(3100);
    expect(high.timeS).toBeGreaterThan(justUnder.timeS);
  });

  it("only coarsens gassy lots on beds that dome", () => {
    const base = { roastStyle: "light" as const, drinkPlan: "rest" as const, process: "washed" as const };
    const pressGassy = recommendBrew({ method: "frenchpress", ...base, daysSinceRoast: 3 });
    const pressRested = recommendBrew({ method: "frenchpress", ...base, daysSinceRoast: 16 });
    expect(pressGassy.grind).toBe(pressRested.grind);
  });

  it("rests espresso longer than filter", () => {
    const shot = recommendBrew({ method: "espresso", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 12 });
    const filter = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 12 });
    expect(shot.technique).toBe("blooming");
    expect(filter.technique).not.toBe("hedrick");
  });

  it("describes the chosen script in the first Why line", () => {
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 4 });
    expect(card.technique).toBe("hedrick");
    expect(card.why[0]).toMatch(/Double bloom/);
    expect(card.why[0]).toMatch(/2:30/);
  });

  it("warns when a Light filter roast goes into the espresso machine, and on hard water for acid cups", () => {
    const shot = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 20,
      roastBrew: "filter",
    });
    expect(shot.warnings.some((w) => /filter/i.test(w))).toBe(true);
    const hard = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, water: "hard" });
    expect(hard.warnings.some((w) => /alkalin/i.test(w))).toBe(true);
  });

  it("uses the same density class as Generate for a Generate roast", () => {
    const intent = { ...defaultIntent(), originId: "colombia-antioquia", varietyId: "chiroso", altitudeM: 1550 };
    const out = generateProfile(intent);
    expect(snapshotFromIntent(intent, "x").densityClass).toBe(out.densityClass);
  });
});


describe("new champion and community recipes", () => {
  const light = { roastStyle: "light" as const, drinkPlan: "rest" as const, daysSinceRoast: 16, kitchenAltitudeM: 0 };

  it("prints Jaafar WBrC 2026 on a degassed floral Light Switch, never while gassy", () => {
    const card = recommendBrew({ method: "switch", ...light, flavors: ["floral"] });
    expect(card.technique).toBe("jaafar");
    expect(card.ratioN).toBeCloseTo(13.3, 1);
    expect(card.kettleC).toBe(92);
    expect(card.origin).toMatch(/2026/);
    const gassy = recommendBrew({ method: "switch", ...light, daysSinceRoast: 4, flavors: ["floral"] });
    expect(gassy.technique).not.toBe("jaafar");
  });

  it("builds every new recipe with steps and a credit", () => {
    const picks: [BrewMethod, string][] = [
      ["v60", "winton"],
      ["v60", "hoffmann1"],
      ["aeropress", "little"],
      ["kalita", "april"],
      ["kalita", "wendelboe"],
      ["chemex", "stumptown"],
      ["frenchpress", "wendelboe"],
      ["coldbrew", "kyoto"],
      ["espresso", "allonge"],
      ["siphon", "sprudge"],
      ["siphon", "bluebottle"],
      ["batch", "sca"],
      ["batch", "rao"],
      ["batch", "wendelboe"],
    ];
    for (const [method, technique] of picks) {
      for (const locale of ["en", "es"] as const) {
        const card = recommendBrew({ method, ...light, technique, locale });
        expect(card.technique, `${method} ${technique}`).toBe(technique);
        expect(card.steps.length, `${method} ${technique}`).toBeGreaterThanOrEqual(3);
        for (const step of card.steps) {
          expect(step.title, `${method} ${technique} ${locale}`).not.toMatch(/^step\./);
          expect(step.detail, `${method} ${technique} ${locale}`).not.toMatch(/\{[a-zA-Z]+\}/);
        }
        expect(card.origin, `${method} ${technique}`).toBeTruthy();
      }
    }
  });

  it("keeps Winton's cool pours and Little's hot bypass on the card", () => {
    const winton = recommendBrew({ method: "v60", ...light, technique: "winton" });
    expect(winton.kettleNote).toMatch(/88/);
    const little = recommendBrew({ method: "aeropress", ...light, technique: "little" });
    expect(little.bypassG).toBeGreaterThan(little.waterG);
  });

  it("treats siphon as immersion and batch brew as percolation for After brew", () => {
    const siphon = recommendBrew({ method: "siphon", ...light });
    const batch = recommendBrew({ method: "batch", ...light });
    expect(siphon.technique).toBeDefined();
    expect(batch.technique).toBe("wendelboe");
    expect(recommendBrew({ method: "batch", ...light, roastStyle: "medium" }).technique).toBe("sca");
  });
});

describe("cup-first scaling", () => {
  it("finds the dose for a target cup, net of what the grounds keep", () => {
    expect(doseForCup("v60", 350, 16)).toBeCloseTo(25, 1);
    expect(drinkG("v60", 25, 16)).toBeCloseTo(350, 5);
    expect(doseForCup("espresso", 40, 2)).toBe(20);
  });
});
