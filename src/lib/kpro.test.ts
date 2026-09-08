import { describe, expect, it } from "vitest";
import { buildCurve, encodeKpro, parseKpro } from "./kpro";
import { deleteAnchor, expandCurve, insertAnchor, levelToTemp, sampleAtTime, smoothAnchors, valueAtTime } from "./curve";
import {
  generateProfile,
  defaultIntent,
  inferFlavorsFromAdjustment,
  densityFromAltitude,
  FLAVOR_DELTA,
  FAN_HOLD_RPM,
  offZone,
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

  it("infers fruity/bright from a short-development residual", () => {
    const picks = inferFlavorsFromAdjustment(FLAVOR_DELTA.fruity);
    expect(picks[0]?.id).toBe("fruity");
    expect(picks[0]?.weight).toBeGreaterThan(0.5);
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

  it("lengthens drying and raises preheat when moisture is above 11%", () => {
    const dry = generateProfile({ ...defaultIntent(), moisture: 9, flavors: [] });
    const wet = generateProfile({ ...defaultIntent(), moisture: 13, flavors: [] });
    expect(wet.breakdown.moisture.dryingS).toBeGreaterThan(dry.breakdown.moisture.dryingS);
    expect(wet.breakdown.moisture.preheatW).toBeGreaterThan(dry.breakdown.moisture.preheatW);
    expect(wet.preheatPower).toBeGreaterThan(dry.preheatPower);
    expect(wet.breakdown.total.dryingS).toBeGreaterThan(dry.breakdown.total.dryingS);
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
    expect(Math.abs(smoothed[1].v - 200)).toBeGreaterThan(5);
    expect(smoothed[1].t).toBeGreaterThan(smoothed[0].t);
    expect(smoothed[2].t).toBeLessThan(smoothed[3].t);
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
