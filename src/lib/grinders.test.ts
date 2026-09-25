import { describe, expect, it } from "vitest";
import { recommendBrew } from "./brew";
import {
  GRINDERS,
  bandForMethod,
  doseGrindT,
  formatDotted,
  formatSetting,
  grindFollowsDose,
  grindNoteWithSetting,
  resolveGrindSetting,
  searchGrinders,
  settingAt,
} from "./grinders";

describe("grinders", () => {
  it("maps brew methods onto Honest Coffee Guide bands", () => {
    expect(bandForMethod("espresso")).toBe("espresso");
    expect(bandForMethod("v60")).toBe("v60");
    expect(bandForMethod("kalita")).toBe("v60");
    expect(bandForMethod("chemex")).toBe("pourOver");
    expect(bandForMethod("switch")).toBe("steep");
    expect(bandForMethod("frenchpress")).toBe("frenchPress");
  });

  it("places a medium V60 on the C3S Pro around 14 clicks from zero", () => {
    const out = resolveGrindSetting("timemore-c3s-pro", "v60", "medium");
    expect(out?.lo).toBe(11);
    expect(out?.hi).toBe(18);
    expect(out?.at).toBeCloseTo(11 + 0.52 * 7, 5);
    expect(out?.label).toMatch(/clicks/);
    expect(out?.label).toMatch(/11–18/);
  });

  it("keeps C3S Pro off the kissing-burr clicks", () => {
    const out = resolveGrindSetting("timemore-c3s-pro", "espresso", "fine");
    expect(out?.at).toBeGreaterThanOrEqual(6);
  });

  it("reads Niche as the printed ring, not rotations", () => {
    const out = resolveGrindSetting("niche-zero", "espresso", "fine");
    expect(out?.lo).toBe(15);
    expect(out?.hi).toBe(30);
    expect(formatSetting(22, "niche")).toBe("22");
  });

  it("does not invent clicks for Cera+ CGE01", () => {
    expect(resolveGrindSetting("cera-cge01", "v60", "medium")).toBeUndefined();
  });

  it("leaves the qualitative grind when no grinder is picked", () => {
    expect(resolveGrindSetting(undefined, "v60", "medium")).toBeUndefined();
    expect(grindNoteWithSetting("medium", undefined)).toBe("medium");
    const setting = resolveGrindSetting("wacaco-exagrind", "espresso", "fine");
    expect(grindNoteWithSetting("fine", setting)).toMatch(/fine · /);
  });

  it("lists the six kitchen grinders first in the catalog", () => {
    expect(GRINDERS.slice(0, 6).map((g) => g.id)).toEqual([
      "flair-royal",
      "niche-zero",
      "baratza-encore-esp",
      "timemore-c3s-pro",
      "wacaco-exagrind",
      "cera-cge01",
    ]);
  });

  it("sits a finer grind lower in the band", () => {
    expect(settingAt(10, 20, "fine")).toBeLessThan(settingAt(10, 20, "medium"));
    expect(settingAt(10, 20, "medium")).toBeLessThan(settingAt(10, 20, "coarse"));
  });

  it("finds a mill by brand, nickname, or model scrap", () => {
    expect(searchGrinders("c3s pro")[0]?.id).toBe("timemore-c3s-pro");
    expect(searchGrinders("chestnut c2").some((g) => g.id === "timemore-c2")).toBe(true);
    expect(searchGrinders("1z k-ultra")[0]?.id).toBe("1zpresso-k-ultra");
    expect(searchGrinders("sage smart")).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: "breville-sage-the-smart-grinder-pro" })]),
    );
    expect(searchGrinders("zzzz-nope")).toEqual([]);
    expect(searchGrinders("").length).toBe(GRINDERS.length);
    expect(GRINDERS.length).toBeGreaterThan(150);
  });

  it("coarsens percolation clicks when the bed is bigger than the card", () => {
    expect(grindFollowsDose("v60")).toBe(true);
    expect(grindFollowsDose("espresso")).toBe(true);
    expect(grindFollowsDose("switch")).toBe(true);
    expect(grindFollowsDose("clever")).toBe(true);
    expect(grindFollowsDose("frenchpress")).toBe(false);
    expect(grindFollowsDose("aeropress")).toBe(false);
    expect(doseGrindT("v60", 15, 15)).toBe(0);
    expect(doseGrindT("v60", 20, 15)).toBeGreaterThan(0);
    expect(doseGrindT("v60", 12, 15)).toBeLessThan(0);
    expect(doseGrindT("frenchpress", 45, 30)).toBe(0);

    const card = resolveGrindSetting("timemore-c3s-pro", "v60", "medium", { coffeeG: 15, cardDoseG: 15 });
    const bigger = resolveGrindSetting("timemore-c3s-pro", "v60", "medium", { coffeeG: 20, cardDoseG: 15 });
    const smaller = resolveGrindSetting("timemore-c3s-pro", "v60", "medium", { coffeeG: 12, cardDoseG: 15 });
    expect(bigger?.at).toBeGreaterThan(card?.at ?? 0);
    expect(smaller?.at).toBeLessThan(card?.at ?? 0);

    const switchCard = resolveGrindSetting("timemore-c3s-pro", "switch", "medium", {
      coffeeG: 15,
      cardDoseG: 15,
    });
    const switch20 = resolveGrindSetting("timemore-c3s-pro", "switch", "medium", {
      coffeeG: 20,
      cardDoseG: 15,
    });
    const switch30 = resolveGrindSetting("timemore-c3s-pro", "switch", "medium", {
      coffeeG: 30,
      cardDoseG: 15,
    });
    expect(switch20?.at).toBeGreaterThan(switchCard?.at ?? 0);
    expect(switch30?.at).toBeGreaterThan(switch20?.at ?? 0);
  });

  it("lands a day-7 Colombia natural Switch near 18 clicks on the C3S Pro, not 14", () => {
    const rec = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 7,
      kitchenAltitudeM: 2000,
      process: "natural",
      flavors: ["juicy", "lightSweet"],
      densityClass: "hard",
    });
    const setting = resolveGrindSetting("timemore-c3s-pro", "switch", rec.grind, {
      coffeeG: rec.coffeeG,
      cardDoseG: rec.cardDoseG,
    });
    expect(setting?.at).toBeGreaterThanOrEqual(17);
    expect(setting?.at).toBeLessThanOrEqual(21);
  });

  it("prints 1Zpresso as rotation.number.tick", () => {
    expect(formatDotted(162)).toBe("1.6.2");
    const out = resolveGrindSetting("1zpresso-j-max", "v60", "medium");
    expect(out?.label).toMatch(/\d\.\d\.\d/);
    expect(formatSetting(69, "dotted")).toBe("0.6.9");
  });
});
