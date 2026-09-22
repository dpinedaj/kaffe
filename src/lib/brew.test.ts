import { describe, expect, it } from "vitest";
import {
  boilingPointC,
  defaultDays,
  defaultMethod,
  formatBrewTime,
  recommendBrew,
  snapshotFromIntent,
  snapshotFromKpro,
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
    expect(day10.steps.some((s) => /45–60|3×/.test(s.detail))).toBe(true);
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

  it("formats filter time as m:ss", () => {
    expect(formatBrewTime(165)).toBe("2:45");
    expect(formatBrewTime(28)).toBe("0:28");
  });
});
