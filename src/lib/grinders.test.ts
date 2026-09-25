import { describe, expect, it } from "vitest";
import { BREW_METHODS, recommendBrew, type BrewMethod } from "./brew";
import type { FlavorId, ProcessId } from "./knowledge";
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

  it("places a medium V60 on the C3S Pro around 15 clicks from zero", () => {
    const out = resolveGrindSetting("timemore-c3s-pro", "v60", "medium");
    expect(out?.lo).toBe(11);
    expect(out?.hi).toBe(18);
    expect(out?.at).toBeCloseTo(11 + 0.58 * 7, 5);
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

  it("keeps a Light V60 in the middle of the C3S V60 window, not the fine edge", () => {
    const plain = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
    });
    expect(plain.grind).toBe("medium");
    const plainClicks = resolveGrindSetting("timemore-c3s-pro", "v60", plain.grind, {
      coffeeG: plain.coffeeG,
      cardDoseG: plain.cardDoseG,
    });
    expect(plainClicks?.at).toBeGreaterThanOrEqual(14.5);
    expect(plainClicks?.at).toBeLessThanOrEqual(16);

    const juicy = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
    });
    expect(juicy.grind).toBe("medium-fine");
    const juicyClicks = resolveGrindSetting("timemore-c3s-pro", "v60", juicy.grind, {
      coffeeG: juicy.coffeeG,
      cardDoseG: juicy.cardDoseG,
    });
    expect(juicyClicks?.at).toBeGreaterThanOrEqual(13.5);
    expect(juicyClicks?.at).toBeLessThan(plainClicks?.at ?? 0);
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

const ALL_FLAVORS: FlavorId[] = [
  "fruity",
  "lightSweet",
  "deepSweet",
  "bright",
  "juicy",
  "winey",
  "floral",
  "body",
  "clean",
  "balance",
];

function allFlavorCombos(): FlavorId[][] {
  const out: FlavorId[][] = [[]];
  for (const a of ALL_FLAVORS) out.push([a]);
  for (let i = 0; i < ALL_FLAVORS.length; i++) {
    for (let j = i + 1; j < ALL_FLAVORS.length; j++) out.push([ALL_FLAVORS[i], ALL_FLAVORS[j]]);
  }
  return out;
}

function bandPos(at: number, lo: number, hi: number): number {
  return hi === lo ? 0.5 : (at - lo) / (hi - lo);
}

const FILTER: BrewMethod[] = [
  "v60",
  "kalita",
  "origami",
  "chemex",
  "switch",
  "clever",
  "aeropress",
  "frenchpress",
  "orea",
  "coldbrew",
  "cupping",
];

describe("grind size across every method and flavor bag", () => {
  const combos = allFlavorCombos();
  const mills = ["timemore-c3s-pro", "baratza-encore-esp", "1zpresso-j-max"] as const;

  it("never suggests a fine filter grind, and keeps C3S / Encore / J-Max off the fine edge of the HCG band", () => {
    for (const method of BREW_METHODS.map((m) => m.id)) {
      for (const process of ["washed", "natural"] as ProcessId[]) {
        for (const days of [4, 14]) {
          for (const flavors of combos) {
            const rec = recommendBrew({
              method,
              roastStyle: "light",
              drinkPlan: "rest",
              daysSinceRoast: days,
              kitchenAltitudeM: 2000,
              process,
              flavors,
              densityClass: "hard",
            });
            const label = `${method} d${days} ${process} ${flavors.join("+") || "none"} ${rec.grind}`;
            if (FILTER.includes(method)) {
              expect(rec.grind, label).not.toBe("fine");
            }
            const setting = resolveGrindSetting("timemore-c3s-pro", method, rec.grind, {
              coffeeG: rec.coffeeG,
              cardDoseG: rec.cardDoseG,
            });
            if (!setting) continue;
            const t = bandPos(setting.at, setting.lo, setting.hi);
            if (method === "espresso" || method === "moka") {
              expect(t, label).toBeGreaterThanOrEqual(0.18);
            } else {
              expect(t, label).toBeGreaterThanOrEqual(0.28);
            }
            expect(t, label).toBeLessThanOrEqual(0.94);
          }
        }
      }
    }
  });

  it("puts medium in the middle of the HCG window on the mills people actually test", () => {
    for (const id of mills) {
      for (const method of ["v60", "switch", "espresso"] as const) {
        const out = resolveGrindSetting(id, method, "medium");
        if (!out) continue;
        const t = bandPos(out.at, out.lo, out.hi);
        expect(t, `${id} ${method}`).toBeGreaterThanOrEqual(0.5);
        expect(t, `${id} ${method}`).toBeLessThanOrEqual(0.7);
      }
    }
  });

  it("coarsens a blooming bag vs the same degassed bag, never the reverse", () => {
    for (const method of FILTER) {
      for (const flavors of combos) {
        const gassy = recommendBrew({
          method,
          roastStyle: "light",
          drinkPlan: "rest",
          daysSinceRoast: 4,
          process: "washed",
          flavors,
        });
        const rested = recommendBrew({
          method,
          roastStyle: "light",
          drinkPlan: "rest",
          daysSinceRoast: 14,
          process: "washed",
          flavors,
        });
        const order = ["coarse", "medium-coarse", "medium", "medium-fine", "fine"];
        expect(order.indexOf(gassy.grind), `${method} ${flavors.join("+") || "none"}`).toBeLessThanOrEqual(
          order.indexOf(rested.grind),
        );
      }
    }
  });
});
