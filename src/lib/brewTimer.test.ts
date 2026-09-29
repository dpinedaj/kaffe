import { describe, expect, it } from "vitest";
import { recommendBrew, BREW_METHODS } from "./brew";
import { buildTimeline, formatTimer, stepIndexAt, stepSeconds } from "./brewTimer";
import { tasteTips } from "./taste";

describe("brew timer", () => {
  it("reads step clocks the cards print", () => {
    expect(stepSeconds("0:45")).toBe(45);
    expect(stepSeconds("~1:00")).toBe(60);
    expect(stepSeconds("8:00–10:00")).toBe(480);
    expect(stepSeconds("45 s")).toBe(45);
    expect(stepSeconds("Prep")).toBeNull();
  });

  it("splits prep, timed and after steps and walks them in order", () => {
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 4 });
    const tl = buildTimeline(card.steps, card.timeS);
    expect(tl.prep.length).toBe(1);
    expect(tl.timed[0].s).toBe(0);
    expect(stepIndexAt(tl, 0)).toBe(0);
    expect(stepIndexAt(tl, 50)).toBe(1);
    expect(tl.totalS).toBeGreaterThanOrEqual(card.timeS);
  });

  it("gives every method a timeline that starts at 0:00", () => {
    for (const m of BREW_METHODS) {
      const card = recommendBrew({ method: m.id, roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 16 });
      const tl = buildTimeline(card.steps, card.timeS);
      expect(tl.timed.length, m.id).toBeGreaterThan(0);
      expect(tl.timed[0].s, m.id).toBe(0);
    }
  });

  it("formats minutes and hours", () => {
    expect(formatTimer(75)).toBe("1:15");
    expect(formatTimer(16 * 3600)).toBe("16:00:00");
  });
});

describe("taste compass", () => {
  it("maps sour to finer, bitter to coarser, weak and strong to ratio", () => {
    const r = { grind: "medium" as const, ratioN: 16, method: "v60" as const };
    expect(tasteTips("sour", "right", r)[0]).toEqual({ key: "taste.tip.finer", vars: { grind: "medium-fine" } });
    expect(tasteTips("bitter", "right", r)[0].key).toBe("taste.tip.coarser");
    expect(tasteTips("balanced", "weak", r)[0].key).toBe("taste.tip.stronger");
    expect(tasteTips("balanced", "strong", r)[0].vars?.ratio).toBe("1:17.1");
    expect(tasteTips("balanced", "right", r)[0].key).toBe("taste.tip.keep");
  });
});
