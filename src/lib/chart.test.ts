import { describe, expect, it } from "vitest";
import { clockTick, niceTimeStep, timeTickAnchor, timeTicks } from "./chart";
import { formatClock, formatClockFine } from "./curve";

describe("clock labels", () => {
  it("does not emit 0:60 when seconds round up", () => {
    expect(clockTick(59.6)).toBe("1:00");
    expect(clockTick(419.6)).toBe("7:00");
    expect(formatClock(59.6)).toBe("1:00");
    expect(formatClockFine(59.95)).toBe("1:00.0");
  });

  it("pads seconds", () => {
    expect(clockTick(0)).toBe("0:00");
    expect(clockTick(65)).toBe("1:05");
    expect(formatClock(372)).toBe("6:12");
  });
});

describe("timeTicks", () => {
  it("keeps labels on nice minutes and inside the roast", () => {
    for (const maxT of [330, 396, 419, 540, 660, 780, 1200]) {
      const ticks = timeTicks(maxT);
      expect(ticks[0]).toBe(0);
      expect(ticks[ticks.length - 1]).toBeLessThanOrEqual(maxT + 1e-6);
      const gaps = ticks.slice(1).map((t, i) => t - ticks[i]);
      const step = gaps[0];
      expect(step).toBeGreaterThanOrEqual(30);
      for (const g of gaps) expect(g).toBeCloseTo(step, 6);
      expect(ticks.length).toBeGreaterThanOrEqual(4);
      expect(ticks.length).toBeLessThanOrEqual(12);
    }
  });

  it("uses a coarser step when the plot is narrow", () => {
    expect(niceTimeStep(780, 6)).toBeGreaterThanOrEqual(120);
    const wide = timeTicks(780, 620);
    const narrow = timeTicks(780, 280);
    expect(narrow.length).toBeLessThanOrEqual(wide.length);
    const gaps = narrow.slice(1).map((t, i) => t - narrow[i]);
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(60);
  });

  it("anchors edge ticks so 0:00 and the last minute stay in the plot", () => {
    expect(timeTickAnchor(0, 540)).toBe("start");
    expect(timeTickAnchor(540, 540)).toBe("end");
    expect(timeTickAnchor(240, 540)).toBe("middle");
  });
});
