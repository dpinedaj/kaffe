import { describe, expect, it } from "vitest";
import { shareFlavorBudget } from "./generate";

describe("shareFlavorBudget", () => {
  it("leaves a single pick on its own 0–1 weight", () => {
    expect(shareFlavorBudget([{ id: "juicy", weight: 0.8 }])).toEqual([{ id: "juicy", weight: 0.8 }]);
    expect(shareFlavorBudget([{ id: "juicy", weight: 1 }])).toEqual([{ id: "juicy", weight: 1 }]);
  });

  it("splits two 100% picks to 50/50", () => {
    expect(shareFlavorBudget([
      { id: "lightSweet", weight: 1 },
      { id: "juicy", weight: 1 },
    ])).toEqual([
      { id: "lightSweet", weight: 0.5 },
      { id: "juicy", weight: 0.5 },
    ]);
  });

  it("keeps a 70/30 split", () => {
    const out = shareFlavorBudget([
      { id: "floral", weight: 0.7 },
      { id: "body", weight: 0.3 },
    ]);
    expect(out[0].weight).toBeCloseTo(0.7);
    expect(out[1].weight).toBeCloseTo(0.3);
  });
});
