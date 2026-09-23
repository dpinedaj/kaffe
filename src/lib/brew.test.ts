import { describe, expect, it } from "vitest";
import {
  boilingPointC,
  defaultDays,
  defaultMethod,
  densityFromFarmM,
  formatBrewTime,
  recommendBrew,
  snapshotFromIntent,
  snapshotFromKpro,
  suggestedSwitchMode,
  suggestedTechniqueId,
} from "./brew";
import { defaultIntent, generateProfile } from "./generate";
import { parseKpro } from "./kpro";

const GRIND_ORDER = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"] as const;

describe("boiling point", () => {
  it("is 100 °C at sea level and falls about 1 °C per 285 m", () => {
    expect(boilingPointC(0)).toBeCloseTo(100, 2);
    expect(boilingPointC(1500)).toBeCloseTo(94.74, 1);
    expect(boilingPointC(1800)).toBeCloseTo(93.68, 1);
    expect(boilingPointC(2600)).toBeCloseTo(90.88, 1);
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
  it("caps a Light V60 at local boil, compensates grind/time, and still has steps", () => {
    const sea = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
    });
    expect(sea.kettleC).toBe(96);
    expect(sea.cappedByBoil).toBe(false);
    expect(sea.ratio).toBe("1:16");
    expect(sea.technique).toBe("hedrick");
    expect(sea.steps.length).toBeGreaterThanOrEqual(4);

    const high = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 1800,
    });
    expect(high.boilC).toBeCloseTo(93.7, 1);
    expect(high.kettleC).toBeCloseTo(92.7, 1);
    expect(high.cappedByBoil).toBe(true);
    expect(high.timeS).toBeGreaterThan(sea.timeS);
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
    expect(["fine", "medium-fine"]).toContain(fruit.grind);
    expect(["medium", "medium-coarse", "coarse"]).toContain(body.grind);
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
  });

  it("uses the suggested mode on Light + juicy and rewrites steps when overridden", () => {
    const auto = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
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
      daysSinceRoast: 4,
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

  it("maps Light + juicy V60 to 4:6 acidity and floral to Peng split-temp", () => {
    const acid = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
      kitchenAltitudeM: 0,
      flavors: ["juicy"],
    });
    expect(acid.technique).toBe("kasuya-acid");
    expect(acid.steps.some((s) => /acid/i.test(s.title))).toBe(true);
    expect(acid.wantedC).toBeGreaterThan(96);

    const floral = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
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
    });
    expect(rao.technique).toBe("rao");
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

    const du = recommendBrew({
      method: "origami",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
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
      daysSinceRoast: 4,
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

    const light = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
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
      daysSinceRoast: 4,
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
});
