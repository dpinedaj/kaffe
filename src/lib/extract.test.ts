import { describe, expect, it } from "vitest";
import {
  BRIX_TO_TDS,
  brixToTds,
  clipRatioLine,
  defaultYieldG,
  extractWindow,
  extractionYield,
  nextCupPoint,
  nextGrind,
  readExtract,
  formatBrewRatio,
  shiftBrew,
  snapEyToRatio,
  tdsFromInput,
  tdsFromPe,
} from "./extract";

const v60 = {
  method: "v60" as const,
  coffeeG: 15,
  waterG: 240,
  grind: "medium" as const,
  timeS: 165,
  kettleC: 96,
  boilC: 100,
  cappedByBoil: false,
};

describe("extract", () => {
  it("converts coffee Brix to TDS with the 0.85 factor", () => {
    expect(brixToTds(1.55)).toBeCloseTo(1.3175);
    expect(tdsFromInput("tds", 1.3)).toBe(1.3);
    expect(tdsFromInput("brix", 1.55)).toBeCloseTo(1.55 * BRIX_TO_TDS);
  });

  it("subtracts bed retention on filter and uses shot weight on espresso", () => {
    expect(defaultYieldG("v60", 15, 240)).toBe(210);
    expect(defaultYieldG("espresso", 18, 36)).toBe(36);
  });

  it("computes percent extraction from TDS and cup weight", () => {
    expect(extractionYield(1.3, 15, 210)).toBeCloseTo(18.2);
  });

  it("calls a mid-band V60 well extracted", () => {
    const out = readExtract("tds", 1.3, 210, v60);
    expect(out?.verdict).toBe("ok");
    expect(out?.eyBand).toBe("ok");
    expect(out?.tdsBand).toBe("ok");
    expect(out?.ey).toBeCloseTo(18.2);
  });

  it("flags sour-side extraction with grind, time, and a smaller-cup option", () => {
    const out = readExtract("tds", 1.05, 210, v60);
    expect(out?.verdict).toBe("under");
    expect(out?.tips[0]?.id).toBe("extract.tip.underKeep");
    expect(out?.tips[0]?.vars?.grind).toBe("medium-fine");
    expect(out?.tips[0]?.vars?.time).toBe("3:05");
    expect(out?.tips[0]?.vars?.cup).toBe(210);
    expect(out?.tips[0]?.vars?.ratio).toBe("1:16");
    expect(out?.tips.some((tip) => tip.id === "extract.tip.tighterCup")).toBe(true);
  });

  it("flags bitter-side extraction with grind, time, and a larger-cup option", () => {
    const out = readExtract("tds", 1.55, 220, v60);
    expect(out?.verdict).toBe("over");
    expect(out?.tips[0]?.id).toBe("extract.tip.overKeep");
    expect(out?.tips[0]?.vars?.grind).toBe("medium-coarse");
    expect(out?.tips.some((tip) => tip.id === "extract.tip.looserCup")).toBe(true);
  });

  it("steps grind one click and stops at the ends", () => {
    expect(nextGrind("medium", 1)).toBe("medium-fine");
    expect(nextGrind("fine", 1)).toBeUndefined();
    expect(nextGrind("coarse", -1)).toBeUndefined();
  });

  it("draws Lockhart ratio as TDS = PE / ratio", () => {
    expect(tdsFromPe(20, 16)).toBeCloseTo(1.25);
    const line = clipRatioLine(16, extractWindow("filter"));
    expect(line).toBeDefined();
    expect(line!.tds1).toBeCloseTo(line!.pe1 / 16);
    expect(line!.pe2).toBeGreaterThan(line!.pe1);
  });

  it("snaps a drag onto the ratio diagonal inside the window", () => {
    const window = extractWindow("filter");
    const on = snapEyToRatio(20, 16, window);
    expect(on.tds).toBeCloseTo(1.25);
    const high = snapEyToRatio(40, 16, window);
    expect(high.ey).toBeLessThanOrEqual(window.eyHi);
    expect(high.tds).toBeCloseTo(high.ey / 16);
  });

  it("places the next-cup ghost along the ratio when under-extracted", () => {
    const out = readExtract("tds", 1.05, 210, v60);
    expect(out).toBeDefined();
    const ratio = out!.ey / out!.tds;
    const ghost = nextCupPoint(out!, ratio);
    expect(ghost).toBeDefined();
    expect(ghost!.ey).toBeGreaterThan(out!.ey);
    expect(ghost!.tds / ghost!.ey).toBeCloseTo(out!.tds / out!.ey, 5);
  });

  it("formats brew ratio and a smaller next cup", () => {
    expect(formatBrewRatio(16)).toBe("1:16");
    expect(formatBrewRatio(15.5)).toBe("1:15.5");
    const next = shiftBrew(v60, -1);
    expect(next.ratio).toBe("1:15");
    expect(next.cup).toBe(195);
  });

  it("gives no next-cup advice when TDS or PE is off the chart", () => {
    const absurd = readExtract("tds", 100, 210, v60);
    expect(absurd?.verdict).toBe("out");
    expect(absurd?.inRange).toBe(false);
    expect(absurd?.tips).toEqual([]);
    const thin = readExtract("tds", 0.2, 210, v60);
    expect(thin?.verdict).toBe("out");
    expect(thin?.tips).toEqual([]);
    expect(nextCupPoint(absurd!, absurd!.ey / absurd!.tds)).toBeUndefined();
  });

  it("uses espresso TDS windows", () => {
    const shot = readExtract("tds", 9.5, 36, {
      method: "espresso",
      coffeeG: 18,
      waterG: 36,
      grind: "fine",
      timeS: 28,
      kettleC: 93,
    });
    expect(shot?.scale).toBe("espresso");
    expect(shot?.verdict).toBe("ok");
    expect(shot?.ey).toBeCloseTo(19);
  });
});
