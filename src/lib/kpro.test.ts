import { describe, expect, it } from "vitest";
import { buildCurve, encodeKpro, parseKpro } from "./kpro";
import { deleteAnchor, expandCurve, insertAnchor, levelToTemp, mergePhasePins, rebuildFromAnchors, rorSeries, sampleAtTime, smoothAnchors, timeAtValue, valueAtTime } from "./curve";
import {
  generateProfile,
  defaultIntent,
  inferFlavorsFromAdjustment,
  inferStyleFromCurve,
  densityFromAltitude,
  FLAVOR_DELTA,
  FAN_HOLD_RPM,
  offZone,
  YELLOW_TEMP,
  curveName,
  kproShortName,
} from "./generate";
import { originById, varietyById } from "./knowledge";
import { BASELINE_KPRO } from "./template";
import { parseKlog } from "./klog";
import { computeDeviationSummary, computePhases } from "./overlay";

describe("kpro parse", () => {
  it("reads the Nordic baseline anchors and zones", () => {
    const p = parseKpro(BASELINE_KPRO, "base.kpro");
    expect(p.name).toBe("Kaffe");
    expect(p.roast.anchors.length).toBeGreaterThanOrEqual(6);
    expect(p.roast.anchors[0].t).toBeCloseTo(7.09, 1);
    expect(p.roastLevels).toEqual([205, 208, 210, 212, 214, 216, 218]);
    expect(p.raw.zone2_boost).toBe("3.0");
  });

  it("round-trips encode → parse with a usable curve", () => {
    const original = parseKpro(BASELINE_KPRO, "base.kpro");
    const text = encodeKpro(original);
    const again = parseKpro(text, "round.kpro");
    expect(again.roast.anchors.length).toBeGreaterThan(3);
    const a = expandCurve(original.roast);
    const b = expandCurve(again.roast);
    const midA = valueAtTime(a, 200);
    const midB = valueAtTime(b, 200);
    expect(midA).not.toBeNull();
    expect(midB).not.toBeNull();
    expect(Math.abs((midA ?? 0) - (midB ?? 0))).toBeLessThan(4);
  });
});

describe("curve math", () => {
  it("interpolates roast levels", () => {
    expect(levelToTemp([205, 208, 210, 212, 214, 216, 218], 3)).toBe(212);
    expect(levelToTemp([205, 208, 210, 212, 214, 216, 218], 2.5)).toBe(211);
  });

  it("builds cubic segments from 3-pair groups", () => {
    const curve = buildCurve("0,0,10,50,40,80,25,60,70,100,90,110,80,105");
    expect(curve.anchors.length).toBeGreaterThanOrEqual(2);
    expect(curve.segments.length).toBeGreaterThanOrEqual(1);
  });

  it("pins phase temperatures so first-crossing times survive a rebuild", () => {
    const warped = [
      { t: 7, v: 50 },
      { t: 80, v: 120 },
      { t: 200, v: 170 },
      { t: 310, v: 201 },
      { t: 340, v: 214 },
      { t: 400, v: 223 },
    ];
    const pinned = mergePhasePins(warped, [
      { t: 130, v: 150 },
      { t: 280, v: 204 },
      { t: 360, v: 210.4 },
    ]);
    const poly = expandCurve(rebuildFromAnchors(pinned));
    expect(timeAtValue(poly, 150)).toBeCloseTo(130, 0);
    expect(timeAtValue(poly, 204)).toBeCloseTo(280, 0);
    expect(timeAtValue(poly, 210.4)).toBeCloseTo(360, 0);
    expect(pinned[pinned.length - 1].v).toBeGreaterThan(210.4);
    expect(pinned[pinned.length - 1].t).toBeGreaterThan(360);
  });

  it("rebuilds a monotone cubic so a mid pin does not flick RoR", () => {
    const pts = [
      { t: 7, v: 50 },
      { t: 130, v: 150 },
      { t: 280, v: 204 },
      { t: 360, v: 210.4 },
      { t: 408, v: 211.9 },
    ];
    const poly = expandCurve(rebuildFromAnchors(pts));
    const ror = rorSeries(poly);
    const atDrop = sampleAtTime(ror, 368) ?? 99;
    const before = sampleAtTime(ror, 340) ?? 0;
    expect(atDrop).toBeLessThan(8);
    expect(atDrop).toBeLessThan(before + 1);
    expect(timeAtValue(poly, 210.4)).toBeCloseTo(360, 0);
  });

  it("keeps the last yellow CP away from the end blue point", () => {
    const out = generateProfile(defaultIntent());
    const parsed = parseKpro(out.kproText, "gap.kpro");
    const last = parsed.roast.anchors[parsed.roast.anchors.length - 1];
    const prev = parsed.roast.anchors[parsed.roast.anchors.length - 2];
    const seg = parsed.roast.segments[parsed.roast.segments.length - 1];
    expect(last.t).toBeGreaterThan(out.totalTime + 20);
    expect((last.v - prev.v) / ((last.t - prev.t) / 60)).toBeGreaterThan(0.9);
    expect(Math.abs(seg.cp1.t - last.t)).toBeGreaterThan(10);
    expect(Math.abs(seg.cp2.t - last.t)).toBeGreaterThan(10);
    expect(Math.abs(seg.cp1.t - prev.t)).toBeGreaterThan(8);
  });
});

describe("generator", () => {
  it("emits a downloadable kpro from a form intent", () => {
    const out = generateProfile({
      ...defaultIntent(),
      flavors: [
        { id: "fruity", weight: 1 },
        { id: "bright", weight: 0.8 },
      ],
    });
    expect(out.kproText).toContain("profile_short_name:");
    expect(out.kproText).toContain("roast_profile:");
    expect(out.totalTime).toBeGreaterThan(300);
    expect(out.dtr).toBeGreaterThan(0.05);
    expect(out.dtr).toBeLessThan(0.35);
    expect(out.breakdown.total.developmentS).toBeLessThan(0);
    const parsed = parseKpro(out.kproText, "gen.kpro");
    expect(parsed.roast.anchors.length).toBeGreaterThan(3);
  });

  it("sets roast min desired RoR from the curve instead of the Nordic −0.7 default", () => {
    const out = generateProfile({
      ...defaultIntent(),
      flavors: [{ id: "fruity", weight: 1 }, { id: "bright", weight: 1 }],
    });
    expect(out.profile.raw.roast_min_desired_rate_of_rise).toBe("-0.2");
    expect(out.kproText).toMatch(/roast_min_desired_rate_of_rise:-0.2/);
  });

  it("names the curve with brew, level, lot, altitude, rest, and extras", () => {
    const out = generateProfile({
      ...defaultIntent(),
      flavors: [{ id: "floral", weight: 1 }],
      moisture: 12.5,
      expectFc: 206,
    });
    expect(out.curveName).toBe("F-WSH L1.6 ANT-CAS 1550m Rest floral 12.5H FC206");
    expect(out.profile.name).toBe("F-WSH-L16-ANT-CAS");
    expect(out.profile.name.length).toBeLessThanOrEqual(17);
    expect(out.profile.fileName).toContain("1550m");
    expect(out.profile.fileName).toContain("floral");
    expect(out.kproText).toMatch(/profile_short_name:F-WSH-L16-ANT-CAS/);

    const rtd = kproShortName({ ...defaultIntent(), drinkPlan: "rtd", roastStyle: "medium" });
    expect(rtd).toBe("F-WSH-M32-ANT-RTD");
    expect(rtd.length).toBeLessThanOrEqual(17);

    const espresso = curveName({
      ...defaultIntent(),
      brew: "espresso",
      roastStyle: "dark",
      originId: "ethiopia",
      varietyId: "heirloom",
      process: "natural",
      altitudeM: 2200,
      drinkPlan: "rtd",
      flavors: [{ id: "body", weight: 1 }],
      autoDensity: false,
      densityGL: 720,
    });
    expect(espresso).toContain("E-NAT");
    expect(espresso).toContain("D4.6");
    expect(espresso).toContain("ETH-HEI");
    expect(espresso).toContain("2200m");
    expect(espresso).toContain("RTD");
    expect(espresso).toContain("body");
    expect(espresso).toContain("720gL");
  });

  it("maps light below KL level 2 and keeps medium/dark in the official bands", () => {
    const light = generateProfile({ ...defaultIntent(), roastStyle: "light", flavors: [] });
    const medium = generateProfile({ ...defaultIntent(), roastStyle: "medium", flavors: [] });
    const dark = generateProfile({ ...defaultIntent(), roastStyle: "dark", flavors: [] });
    expect(Number(light.profile.raw.recommended_level)).toBe(1.6);
    expect(Number(medium.profile.raw.recommended_level)).toBe(3.2);
    expect(Number(dark.profile.raw.recommended_level)).toBe(4.6);
    expect(levelToTemp(light.profile.roastLevels, 1.6)).toBeCloseTo(209.2, 1);
    expect(levelToTemp(medium.profile.roastLevels, 3.2)).toBeCloseTo(212.4, 1);
    expect(levelToTemp(dark.profile.roastLevels, 4.6)).toBeCloseTo(215.2, 1);
    expect(light.totalTime).toBeLessThan(medium.totalTime);
  });

  it("paces Nordic light ~6–7 min, classic ~9 min, and slow dark espresso ~11 min", () => {
    const nordic = generateProfile({
      ...defaultIntent(),
      originId: "ethiopia",
      varietyId: "heirloom",
      process: "natural",
      altitudeM: 2200,
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "floral", weight: 1 }],
    });
    const classic = generateProfile({ ...defaultIntent(), roastStyle: "medium", flavors: [] });
    const slow = generateProfile({
      ...defaultIntent(),
      roastStyle: "dark",
      brew: "espresso",
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(nordic.family).toBe("nordic");
    expect(nordic.totalTime).toBeGreaterThan(330);
    expect(nordic.totalTime).toBeLessThan(480);
    expect(classic.family).toBe("classic");
    expect(classic.totalTime).toBeGreaterThan(480);
    expect(classic.totalTime).toBeLessThan(630);
    expect(slow.family).toBe("slow");
    expect(slow.totalTime).toBeGreaterThan(classic.totalTime);
    expect(slow.totalTime).toBeGreaterThan(600);
    expect(nordic.firstCrackTime).toBeLessThan(nordic.totalTime);
    expect(classic.firstCrackTime).toBeGreaterThan(nordic.firstCrackTime);
  });

  it("infers fruity/bright from a short-development residual", () => {
    const picks = inferFlavorsFromAdjustment(FLAVOR_DELTA.fruity);
    expect(picks[0]?.id).toBe("fruity");
    expect(picks[0]?.weight).toBeGreaterThan(0.5);
  });

  it("keeps caramel, deep sweet, and cocoa as distinct sweetness residuals", () => {
    expect(inferFlavorsFromAdjustment(FLAVOR_DELTA.caramel)[0]?.id).toBe("caramel");
    expect(inferFlavorsFromAdjustment(FLAVOR_DELTA.deepSweet)[0]?.id).toBe("deepSweet");
    expect(inferFlavorsFromAdjustment(FLAVOR_DELTA.cocoa)[0]?.id).toBe("cocoa");
    const caramel = generateProfile({ ...defaultIntent(), roastStyle: "medium", flavors: [{ id: "caramel", weight: 1 }] });
    const deep = generateProfile({ ...defaultIntent(), roastStyle: "medium", flavors: [{ id: "deepSweet", weight: 1 }] });
    expect(deep.devTime).toBeGreaterThan(caramel.devTime);
  });

  it("rebuilds from dragged anchors and updates inferred flavors", () => {
    const base = generateProfile(defaultIntent());
    const stretched = base.profile.roast.anchors.map((p, i, arr) =>
      i === arr.length - 1 ? { t: p.t + 40, v: p.v + 3 } : p,
    );
    const out = generateProfile({ ...defaultIntent(), manualAnchors: stretched });
    expect(out.manual).toBe(true);
    expect(out.breakdown.flavor.developmentS).not.toBe(0);
  });

  it("shortens Gesha development versus an unknown mix on the same origin", () => {
    const mix = generateProfile({ ...defaultIntent(), originId: "colombia", varietyId: "unknown", flavors: [] });
    const gesha = generateProfile({ ...defaultIntent(), originId: "colombia", varietyId: "gesha", flavors: [] });
    expect(gesha.breakdown.variety.developmentS).toBeLessThan(mix.breakdown.variety.developmentS);
    expect(gesha.breakdown.total.developmentS).toBeLessThan(mix.breakdown.total.developmentS);
    expect(gesha.breakdown.variety.preheatW).toBeGreaterThan(mix.breakdown.variety.preheatW);
  });

  it("gives Pacamara more drying time than Caturra", () => {
    const caturra = generateProfile({ ...defaultIntent(), originId: "colombia-huila", varietyId: "caturra", flavors: [] });
    const pacamara = generateProfile({ ...defaultIntent(), originId: "colombia-huila", varietyId: "pacamara", flavors: [] });
    expect(pacamara.breakdown.variety.dryingS).toBeGreaterThan(caturra.breakdown.variety.dryingS);
    expect(pacamara.breakdown.variety.preheatW).toBeGreaterThan(caturra.breakdown.variety.preheatW);
  });

  it("holds official ~14700 RPM then drops toward development, aligned to roast time", () => {
    const out = generateProfile({ ...defaultIntent(), originId: "colombia", varietyId: "unknown", flavors: [] });
    const early = sampleAtTime(out.fanPoly, 40);
    const late = sampleAtTime(out.fanPoly, out.totalTime);
    expect(early).toBeGreaterThan(FAN_HOLD_RPM - 400);
    expect(late).not.toBeNull();
    expect(late!).toBeLessThan((early ?? 0) - 800);
    expect(out.profile.fan.anchors[out.profile.fan.anchors.length - 1].t).toBeGreaterThan(out.totalTime - 5);
  });

  it("uses the official four-anchor fan (hold to ~50%, ease to ~13.2k, cover the whole Bézier)", () => {
    const light = generateProfile({
      ...defaultIntent(),
      originId: "colombia-antioquia",
      varietyId: "castillo",
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "winey", weight: 1 }, { id: "lightSweet", weight: 1 }],
    });
    const fanEnd = light.profile.fan.anchors[light.profile.fan.anchors.length - 1];
    const roastEnd = light.profile.roast.anchors[light.profile.roast.anchors.length - 1];
    expect(light.profile.fan.anchors).toHaveLength(4);
    expect(fanEnd.t).toBeGreaterThan(roastEnd.t - 2);
    expect(fanEnd.t).toBeGreaterThan(light.firstCrackTime + 80);

    const hold = sampleAtTime(light.fanPoly, light.fanPoly[0].t) ?? 0;
    const tHold = light.profile.fan.anchors[1].t;
    const stillHolding = sampleAtTime(light.fanPoly, Math.max(light.fanPoly[0].t, tHold - 8)) ?? 0;
    const afterDrop = sampleAtTime(light.fanPoly, tHold + 45) ?? 0;
    const at93 = sampleAtTime(light.fanPoly, fanEnd.t * 0.93) ?? 0;
    const atFc = sampleAtTime(light.fanPoly, light.firstCrackTime) ?? 0;
    const beforeFc = sampleAtTime(light.fanPoly, light.firstCrackTime - 30) ?? 0;
    expect(stillHolding).toBeGreaterThan(hold - 80);
    expect(afterDrop).toBeLessThan(hold - 200);
    expect(at93).toBeLessThan(hold - 800);
    expect(atFc).toBeLessThan(beforeFc);
    expect(tHold).toBeLessThan(light.firstCrackTime);
    expect(tHold / fanEnd.t).toBeGreaterThan(0.35);
    expect(tHold / fanEnd.t).toBeLessThan(0.65);

    const parsed = parseKpro(light.kproText, "fan.kpro");
    expect(parsed.fan.anchors).toHaveLength(4);
    const midOfficial = sampleAtTime(expandCurve(parsed.fan), tHold + 45);
    expect(midOfficial).not.toBeNull();
    expect(Math.abs((midOfficial ?? 0) - afterDrop)).toBeLessThan(80);
  });

  it("lengthens drying and raises preheat when moisture is above 11%", () => {
    const dry = generateProfile({ ...defaultIntent(), moisture: 9, flavors: [] });
    const wet = generateProfile({ ...defaultIntent(), moisture: 13, flavors: [] });
    expect(wet.breakdown.moisture.dryingS).toBeGreaterThan(dry.breakdown.moisture.dryingS);
    expect(wet.breakdown.moisture.preheatW).toBeGreaterThan(dry.breakdown.moisture.preheatW);
    expect(wet.preheatPower).toBeGreaterThan(dry.preheatPower);
    expect(wet.breakdown.total.dryingS).toBeGreaterThan(dry.breakdown.total.dryingS);
    expect(wet.dryTime).toBeGreaterThan(dry.dryTime);
    expect(wet.drySlope).toBeLessThan(dry.drySlope);
  });

  it("slows dehydration and raises first-crack temp as density increases", () => {
    const soft = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      autoDensity: false,
      densityGL: 620,
      flavors: [],
    });
    const hard = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      autoDensity: false,
      densityGL: 760,
      flavors: [],
    });
    expect(hard.dryTime).toBeGreaterThan(soft.dryTime);
    expect(hard.drySlope).toBeLessThan(soft.drySlope);
    expect(hard.autoFirstCrackTemp).toBeGreaterThan(soft.autoFirstCrackTemp);
    expect(hard.firstCrackTime).toBeGreaterThan(soft.firstCrackTime);
  });

  it("steepens dry and Maillard slopes for floral acidity versus body", () => {
    const floral = generateProfile({
      ...defaultIntent(),
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "floral", weight: 1 }],
    });
    const body = generateProfile({
      ...defaultIntent(),
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(floral.drySlope).toBeGreaterThan(body.drySlope);
    expect(floral.mailSlope).toBeGreaterThan(body.mailSlope);
    expect(floral.mailTime).toBeLessThan(body.mailTime);
    expect(floral.totalTime).toBeLessThan(body.totalTime);
  });

  it("gives dark espresso more development ratio than light filter", () => {
    const light = generateProfile({
      ...defaultIntent(),
      roastStyle: "light",
      brew: "filter",
      flavors: [{ id: "floral", weight: 1 }],
    });
    const dark = generateProfile({
      ...defaultIntent(),
      roastStyle: "dark",
      brew: "espresso",
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(dark.dtr).toBeGreaterThan(light.dtr);
    expect(dark.devTime).toBeGreaterThan(light.devTime);
  });

  it("realises brew × style DTR on the Bézier and matches the HUD clocks", () => {
    const styles = ["light", "medium", "dark"] as const;
    const brews = ["filter", "espresso"] as const;
    const rows = styles.flatMap((roastStyle) =>
      brews.map((brew) => {
        const out = generateProfile({ ...defaultIntent(), roastStyle, brew, flavors: [] });
        const formula =
          0.2 +
          (roastStyle === "dark" ? 0.035 : 0) +
          (roastStyle === "light" ? -0.015 : 0) +
          (brew === "espresso" ? 0.02 : 0) +
          (brew === "filter" && roastStyle === "light" ? -0.015 : 0);
        return { roastStyle, brew, out, formula };
      }),
    );
    for (const { roastStyle, out, formula } of rows) {
      const fromClocks = (out.totalTime - out.firstCrackTime) / out.totalTime;
      expect(out.dtr).toBeCloseTo(fromClocks, 3);
      expect(out.devTime).toBeCloseTo(out.totalTime - out.firstCrackTime, 0);
      expect(out.dtr).toBeGreaterThan(formula - 0.02);
      expect(out.dtr).toBeLessThan(formula + 0.025);
      expect(timeAtValue(out.roastPoly, YELLOW_TEMP)).toBeCloseTo(out.roastPoly[0].t + out.dryTime, 0);
      expect(timeAtValue(out.roastPoly, out.firstCrackTemp)).toBeCloseTo(out.firstCrackTime, 0);
      const drop = levelToTemp(out.profile.roastLevels, Number(out.profile.raw.recommended_level));
      expect(drop).not.toBeNull();
      expect(timeAtValue(out.roastPoly, drop ?? 0)).toBeCloseTo(out.totalTime, 0);
      const last = out.profile.roast.anchors[out.profile.roast.anchors.length - 1];
      expect(last.t).toBeGreaterThan(out.totalTime + 8);
      expect(last.v).toBeGreaterThan(drop ?? 0);
      expect(last.v).toBeLessThan((drop ?? 0) + 4);
      const rorBefore = sampleAtTime(out.rorPoly, Math.max(out.firstCrackTime + 8, out.totalTime - 20)) ?? 99;
      const rorAfter = sampleAtTime(out.rorPoly, Math.min(last.t - 4, out.totalTime + 16)) ?? 99;
      expect(rorAfter).toBeLessThan(8);
      expect(rorAfter).toBeLessThanOrEqual(rorBefore + 0.5);
      expect(inferStyleFromCurve(out.dtr, drop ?? 212)).toBe(roastStyle);
    }
    const at = (style: (typeof rows)[number]["roastStyle"], brew: (typeof rows)[number]["brew"]) =>
      rows.find((r) => r.roastStyle === style && r.brew === brew)!.out;
    expect(at("light", "espresso").dtr).toBeGreaterThan(at("light", "filter").dtr + 0.012);
    expect(at("medium", "espresso").dtr).toBeGreaterThan(at("medium", "filter").dtr + 0.012);
    expect(at("dark", "espresso").dtr).toBeGreaterThan(at("dark", "filter").dtr + 0.012);
    expect(at("medium", "filter").dtr).toBeGreaterThan(at("light", "filter").dtr + 0.015);
    expect(at("dark", "filter").dtr).toBeGreaterThan(at("medium", "filter").dtr + 0.015);
  });

  it("writes a manual expect_fc and times first crack to that temperature", () => {
    const auto = generateProfile(defaultIntent());
    const out = generateProfile({ ...defaultIntent(), expectFc: 210 });
    expect(out.profile.raw.expect_fc).toBe("210.0");
    expect(out.firstCrackTemp).toBe(210);
    expect(out.autoFirstCrackTemp).toBeCloseTo(auto.firstCrackTemp, 1);
    expect(out.firstCrackTime).toBeGreaterThan(auto.firstCrackTime);
  });

  it("raises estimated density and preheat as altitude increases", () => {
    const low = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      flavors: [],
    });
    const high = generateProfile({
      ...defaultIntent(),
      originId: "ethiopia",
      varietyId: "unknown",
      altitudeM: 2200,
      flavors: [],
    });
    expect(densityFromAltitude(2200)).toBeGreaterThan(densityFromAltitude(1100));
    expect(high.resolvedDensityGL).toBeGreaterThan(low.resolvedDensityGL);
    expect(high.densitySource).toBe("altitude");
    expect(high.preheatPower).toBeGreaterThan(low.preheatPower);
    expect(low.resolvedDensityGL).toBe(
      densityFromAltitude(1100, originById("brazil"), varietyById("unknown")),
    );
  });

  it("uses a measured density instead of the altitude estimate", () => {
    const inferred = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      flavors: [],
    });
    const measured = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      autoDensity: false,
      densityGL: 740,
      flavors: [],
    });
    expect(measured.densitySource).toBe("measured");
    expect(measured.densityClass).toBe("hard");
    expect(measured.resolvedDensityGL).toBe(740);
    expect(measured.breakdown.density.preheatW).toBeGreaterThan(inferred.breakdown.density.preheatW);
    expect(measured.preheatPower).toBeGreaterThan(inferred.preheatPower);
  });

  it("recommends an into-crack boost for a light dense highland lot", () => {
    const out = generateProfile({
      ...defaultIntent(),
      originId: "ethiopia",
      varietyId: "heirloom",
      process: "natural",
      altitudeM: 2200,
      roastStyle: "light",
      flavors: [],
    });
    expect(out.zones.zone2.enabled).toBe(true);
    expect(out.zones.zone2.role).toBe("into-fc");
    expect(out.zones.zone2.endS).toBeGreaterThan(out.zones.zone2.startS);
    expect(out.zones.zone2.startS).toBeGreaterThan(out.firstCrackTime - 40);
    expect(out.zones.zone2.endS).toBeLessThan(out.firstCrackTime + 30);
    expect(Number(out.profile.raw.zone2_boost)).toBeGreaterThan(0);
  });

  it("does not force first-crack or after-crack boosts on a medium low-grown lot", () => {
    const out = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      roastStyle: "medium",
      brew: "omni",
      flavors: [],
    });
    expect(out.zones.zone2.enabled).toBe(false);
    expect(out.zones.zone3.enabled).toBe(false);
    expect(out.profile.raw.zone2_time_end).toBe("0.0");
  });

  it("recommends a drying boost when moisture is high", () => {
    const out = generateProfile({ ...defaultIntent(), moisture: 13.5, flavors: [] });
    expect(out.zones.zone1.enabled).toBe(true);
    expect(out.zones.zone1.role).toBe("drying");
    expect(out.zones.zone1.boost).toBeGreaterThan(0);
  });

  it("recommends a negative after-crack boost for dark espresso with body", () => {
    const out = generateProfile({
      ...defaultIntent(),
      roastStyle: "dark",
      brew: "espresso",
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(out.zones.zone3.enabled).toBe(true);
    expect(out.zones.zone3.boost).toBeLessThan(0);
    expect(out.zones.zone3.startS).toBeGreaterThan(out.firstCrackTime);
  });

  it("RTD adds a Maillard RoR step and through-crack boost, never a negative after-crack brake", () => {
    const rest = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      roastStyle: "medium",
      drinkPlan: "rest",
      flavors: [],
    });
    const rtd = generateProfile({
      ...defaultIntent(),
      originId: "brazil",
      varietyId: "unknown",
      altitudeM: 1100,
      roastStyle: "medium",
      drinkPlan: "rtd",
      flavors: [],
    });
    expect(rest.zones.zone2.enabled).toBe(false);
    expect(rtd.zones.zone1.enabled).toBe(true);
    expect(rtd.zones.zone1.role).toBe("maillard");
    expect(rtd.zones.zone1.boost).toBeGreaterThan(0);
    expect(rtd.zones.zone2.enabled).toBe(true);
    expect(rtd.zones.zone2.role).toBe("into-fc");
    expect(rtd.zones.zone2.boost).toBeGreaterThan(0);
    expect(rtd.zones.zone2.endS).toBeGreaterThan(rtd.firstCrackTime);
    expect(rtd.zones.zone3.enabled).toBe(false);
    expect(rtd.curveName).toContain("RTD");
    expect(rtd.kproText).toMatch(/Cup: RTD/);
    expect(rtd.mailSlope).toBeGreaterThan(rest.mailSlope);
  });

  it("RTD dark espresso still skips a negative after-crack boost", () => {
    const out = generateProfile({
      ...defaultIntent(),
      roastStyle: "dark",
      brew: "espresso",
      drinkPlan: "rtd",
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(out.zones.zone3.boost).toBeGreaterThanOrEqual(0);
    expect(out.kproText).toMatch(/Cup: RTD/);
  });

  it("writes disabled boost zones as 0–0", () => {
    const off = offZone();
    const out = generateProfile({
      ...defaultIntent(),
      autoZones: false,
      zones: { zone1: off, zone2: off, zone3: off },
    });
    expect(out.profile.raw.zone2_time_start).toBe("0.0");
    expect(out.profile.raw.zone2_time_end).toBe("0.0");
    expect(out.profile.raw.zone2_boost).toBe("0.0");
  });

  it("raises early fan RPM for Pacamara versus Caturra", () => {
    const caturra = generateProfile({ ...defaultIntent(), originId: "colombia-huila", varietyId: "caturra", flavors: [] });
    const pacamara = generateProfile({ ...defaultIntent(), originId: "colombia-huila", varietyId: "pacamara", flavors: [] });
    expect(sampleAtTime(pacamara.fanPoly, 40) ?? 0).toBeGreaterThan(sampleAtTime(caturra.fanPoly, 40) ?? 0);
  });

  it("holds fan longer for a wet dense dark roast than a dry light one, and drops more for RTD / espresso", () => {
    const lightDry = generateProfile({
      ...defaultIntent(),
      roastStyle: "light",
      brew: "filter",
      drinkPlan: "rest",
      moisture: 10,
      densityGL: 640,
      autoDensity: false,
      flavors: [{ id: "floral", weight: 1 }],
    });
    const darkWet = generateProfile({
      ...defaultIntent(),
      roastStyle: "dark",
      brew: "espresso",
      drinkPlan: "rest",
      moisture: 13,
      densityGL: 740,
      autoDensity: false,
      flavors: [{ id: "body", weight: 1 }],
    });
    expect(darkWet.profile.fan.anchors[1].t / darkWet.firstCrackTime).toBeGreaterThan(
      lightDry.profile.fan.anchors[1].t / lightDry.firstCrackTime,
    );
    const rest = generateProfile({ ...defaultIntent(), drinkPlan: "rest", roastStyle: "medium", flavors: [] });
    const rtd = generateProfile({ ...defaultIntent(), drinkPlan: "rtd", roastStyle: "medium", flavors: [] });
    const restEnd = rest.profile.fan.anchors[rest.profile.fan.anchors.length - 1].v;
    const rtdEnd = rtd.profile.fan.anchors[rtd.profile.fan.anchors.length - 1].v;
    expect(rtdEnd).toBeLessThan(restEnd);
    const filter = generateProfile({ ...defaultIntent(), brew: "filter", roastStyle: "medium", flavors: [] });
    const espresso = generateProfile({ ...defaultIntent(), brew: "espresso", roastStyle: "medium", flavors: [] });
    expect(espresso.profile.fan.anchors[espresso.profile.fan.anchors.length - 1].v).toBeLessThan(
      filter.profile.fan.anchors[filter.profile.fan.anchors.length - 1].v,
    );
  });
});

describe("arabica varieties", () => {
  it("lists cultivars with size, density, and cup notes", () => {
    expect(varietyById("gesha").flavorLean).toContain("floral");
    expect(varietyById("gesha").beanSize).toBe("medium");
    expect(varietyById("pacamara").beanSize).toBe("large");
    expect(varietyById("sl28").density).toBe("hard");
    expect(originById("kenya").suggestedVarietyId).toBe("sl28");
    expect(originById("ethiopia").suggestedVarietyId).toBe("heirloom");
    expect(defaultIntent().originId).toBe("colombia-antioquia");
    expect(defaultIntent().varietyId).toBe("castillo");
  });
});

describe("curve edit", () => {
  it("inserts, deletes, and smooths anchors", () => {
    const pts = [
      { t: 10, v: 40 },
      { t: 100, v: 120 },
      { t: 200, v: 180 },
      { t: 300, v: 210 },
    ];
    const added = insertAnchor(pts, { t: 150, v: 150 });
    expect(added).toHaveLength(5);
    expect(added[2].t).toBeCloseTo(150);
    expect(insertAnchor(added, { t: 152, v: 151 })).toHaveLength(5);

    const removed = deleteAnchor(added, 2);
    expect(removed).toHaveLength(4);
    expect(deleteAnchor(added, 0)).toHaveLength(5);
    expect(deleteAnchor(added, added.length - 1)).toHaveLength(5);
    expect(deleteAnchor(pts.slice(0, 3), 1)).toHaveLength(3);
    expect(insertAnchor(pts, { t: 5, v: 30 })).toHaveLength(4);

    const jagged = [
      { t: 10, v: 40 },
      { t: 80, v: 200 },
      { t: 160, v: 80 },
      { t: 240, v: 210 },
    ];
    const smoothed = smoothAnchors(jagged);
    expect(smoothed[0]).toEqual(jagged[0]);
    expect(smoothed[3]).toEqual(jagged[3]);
    expect(smoothed[1].t).toBe(jagged[1].t);
    expect(smoothed[1].v).toBeLessThan(200);
    expect(smoothed[2].v).toBeGreaterThan(80);

    const gentle = [
      { t: 7, v: 50 },
      { t: 120, v: 118 },
      { t: 250, v: 175 },
      { t: 400, v: 212 },
    ];
    const kept = smoothAnchors(gentle);
    for (let i = 0; i < gentle.length; i++) {
      expect(kept[i].t).toBe(gentle[i].t);
      expect(Math.abs(kept[i].v - gentle[i].v)).toBeLessThan(2);
    }
  });
});

describe("colombia origins", () => {
  it("has department-level lots with altitudes and cup notes", () => {
    const narino = originById("colombia-narino");
    expect(narino.typicalAltitude).toBeGreaterThan(1900);
    expect(narino.density).toBe("hard");
    expect(narino.cup).toMatch(/acid/i);
    expect(originById("colombia-sierra").density).toBe("soft");
    expect(originById("colombia-huila").shortCode).toBe("HUI");
  });
});

const SYNTH_KLOG = `profile_short_name:Test
profile_designer:Kaffe
recommended_level:3.0
roast_levels:205,208,210,212,214,216,218
roast_profile:0.0,20.0,0,0.0,10,50,40,90,25,70,80,140,120,160,100,150,200,190,240,200,220,196,300,210,340,214,320,212,0,0.0
fan_profile:0.0,14700.0,0,0.0,18,14700,60,14700,42,14700,0,0.0
roasting_level:3.0
!first_crack:240
!roast_end:300
!roast_end_reason:0
!development_percent:20
offsets
time	#spot_temp	#=temp	=mean_temp	=profile	profile_ROR	=actual_ROR	#=desired_ROR	power_kW	#volts-9	#Kp	#Ki	#Kd	#^actual_fan_RPM
0	20	20	20	20	0	0	0	1	0	0	0	0	14700
60	90	90	88	85	30	32	30	1	0	0	0	0	14700
150	155	155	152	150	20	18	20	1	0	0	0	0	14000
240	205	205	204	203	10	9	10	1	0	0	0	0	13500
300	213	213	212	212	4	3	4	1	0	0	0	0	13200
360	80	80	90	212	0	-40	0	0	0	0	0	0	17000
`;

describe("klog + overlay", () => {
  it("parses events and ignores cooling after roast_end", () => {
    const log = parseKlog(SYNTH_KLOG, "log0007.klog");
    expect(log.firstCrack).toBe(240);
    expect(log.roastEnd).toBe(300);
    expect(log.aborted).toBe(false);
    expect(log.design.name).toContain("log0007");
  });

  it("computes phases and deviation", () => {
    const log = parseKlog(SYNTH_KLOG, "log0007.klog");
    const phases = computePhases(log, 150);
    expect(phases.dryEnd).not.toBeNull();
    expect(phases.development).toBeCloseTo(60);
    expect(phases.dtr).toBeCloseTo(0.2);
    const dev = computeDeviationSummary(log);
    expect(dev.atEnd).not.toBeNull();
    expect(Math.abs(dev.atEnd ?? 99)).toBeLessThan(2);
  });
});
