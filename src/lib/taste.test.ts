import { describe, expect, it } from "vitest";
import { resolveGrindSetting } from "./grinders";
import { tasteTips } from "./taste";

describe("taste tips", () => {
  const recipe = { grind: "medium" as const, ratioN: 16, method: "v60" as const };
  const setting = resolveGrindSetting("timemore-c3s-pro", "v60", "medium");

  it("names the click to go to on the kitchen grinder", () => {
    expect(tasteTips("sour", "right", { ...recipe, setting })[0]).toEqual({
      key: "taste.tip.finer",
      vars: { grind: "medium-fine", setting: "14", from: "15", clicks: 1 },
    });
    expect(tasteTips("bitter", "right", { ...recipe, setting })[0]?.vars).toMatchObject({ setting: "16", from: "15" });
  });

  it("falls back to the grind word without a grinder", () => {
    expect(tasteTips("sour", "right", recipe)[0]).toEqual({ key: "taste.tip.finer", vars: { grind: "medium-fine" } });
  });
});
