import { describe, expect, it } from "vitest";
import { buildCurve, encodeKpro, parseKpro } from "./kpro";
import { expandCurve, levelToTemp, valueAtTime } from "./curve";
import { generateProfile, defaultIntent } from "./generate";
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
