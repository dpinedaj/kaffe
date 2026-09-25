import { afterEach, describe, expect, it } from "vitest";
import { recommendBrew } from "./brew";
import {
  USER_RECIPE_KIND,
  USER_RECIPE_PACK,
  blankRecipe,
  cloneFromCard,
  importRecipes,
  loadMine,
  parseRecipeFile,
  removeMine,
  saveMine,
  serializePack,
  serializeRecipe,
  upsertMine,
  viewUserRecipe,
  youOrigin,
} from "./brewRecipes";

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => {
      map.set(k, v);
    },
    removeItem: (k: string) => {
      map.delete(k);
    },
  };
}

afterEach(() => {
  saveMine([]);
});

describe("youOrigin", () => {
  it("prints You · ISO date", () => {
    expect(youOrigin(new Date(2026, 8, 23))).toBe("You · 2026-09-23");
  });
});

describe("blank recipe", () => {
  it("starts empty for the current method", () => {
    const rec = blankRecipe("v60");
    expect(rec.method).toBe("v60");
    expect(rec.forkedFrom).toBeUndefined();
    expect(rec.steps).toEqual([{ at: "", title: "", detail: "" }]);
    expect(rec.name).toBe("");
    expect(rec.origin).toMatch(/^You · /);
  });
});

describe("clone and view", () => {
  it("forks a championship card without mutating it", () => {
    const card = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      flavors: ["juicy"],
    });
    const mine = cloneFromCard(card, "House V60");
    expect(mine.name).toBe("House V60");
    expect(mine.method).toBe("v60");
    expect(mine.forkedFrom).toMatch(/WBrC 2016/);
    expect(mine.origin).toMatch(/^You · /);
    expect(mine.steps.length).toBe(card.steps.length);
    expect(mine.coffeeG).toBe(card.coffeeG);
    expect(card.origin).toMatch(/WBrC 2016/);
  });

  it("caps a saved kettle target at kitchen boil", () => {
    const card = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    const mine = cloneFromCard(card);
    mine.wantedC = 96;
    const view = viewUserRecipe(mine, 1800);
    expect(view.cappedByBoil).toBe(true);
    expect(view.kettleC).toBeLessThan(94);
    expect(view.origin).toMatch(/^You · /);
    expect(view.why.some((line) => /Championship cards were not edited/.test(line))).toBe(true);
  });

  it("keeps Gaggiuino only on espresso cards", () => {
    const espresso = recommendBrew({
      method: "espresso",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    expect(cloneFromCard(espresso).gaggiuino).toBeTruthy();
    expect(viewUserRecipe(cloneFromCard(espresso)).gaggiuino).toBeTruthy();

    const v60 = cloneFromCard(
      recommendBrew({
        method: "v60",
        roastStyle: "light",
        drinkPlan: "rest",
        daysSinceRoast: 4,
      }),
    );
    v60.gaggiuino = "Adaptive for Light Roast";
    expect(viewUserRecipe(v60).gaggiuino).toBeUndefined();
  });
});

describe("recipe files", () => {
  it("round-trips a single recipe and a pack", () => {
    const card = recommendBrew({
      method: "switch",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    const mine = cloneFromCard(card, "Switch house");
    const one = parseRecipeFile(serializeRecipe(mine));
    expect(one).toHaveLength(1);
    expect(one[0].name).toBe("Switch house");
    expect(one[0].method).toBe("switch");
    expect(one[0].steps.length).toBeGreaterThan(0);

    const pack = parseRecipeFile(serializePack([mine, cloneFromCard(card, "Two")]));
    expect(pack).toHaveLength(2);
    expect(JSON.parse(serializeRecipe(mine)).kind).toBe(USER_RECIPE_KIND);
    expect(JSON.parse(serializePack([mine])).kind).toBe(USER_RECIPE_PACK);
  });

  it("rejects garbage and unknown methods", () => {
    expect(() => parseRecipeFile("not json")).toThrow(/not JSON/);
    expect(() => parseRecipeFile("{}")).toThrow(/not a Kaffe brew recipe/);
    expect(() => parseRecipeFile(JSON.stringify({ kind: USER_RECIPE_KIND, recipe: { method: "teapot" } }))).toThrow(
      /not a Kaffe brew recipe/,
    );
  });

  it("accepts a bare recipe object", () => {
    const [rec] = parseRecipeFile(
      JSON.stringify({
        name: "Bare",
        method: "chemex",
        coffeeG: 30,
        ratioN: 16.7,
        wantedC: 94,
        timeS: 250,
        grind: "medium-coarse",
        steps: [{ at: "0:00", title: "Bloom", detail: "60 g" }],
      }),
    );
    expect(rec.name).toBe("Bare");
    expect(rec.method).toBe("chemex");
    expect(rec.steps[0].title).toBe("Bloom");
  });
});

describe("device storage", () => {
  it("upserts, lists, imports as a new id, and deletes", () => {
    Object.defineProperty(globalThis, "localStorage", { value: memoryStorage(), configurable: true });
    const card = recommendBrew({
      method: "aeropress",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 4,
    });
    const mine = cloneFromCard(card, "AP house");
    upsertMine(mine);
    expect(loadMine().map((r) => r.id)).toEqual([mine.id]);

    const file = serializeRecipe(mine);
    const imported = importRecipes(file);
    expect(imported[0].id).not.toBe(mine.id);
    expect(loadMine()).toHaveLength(2);

    removeMine(mine.id);
    expect(loadMine().some((r) => r.id === mine.id)).toBe(false);
    expect(loadMine()).toHaveLength(1);
  });
});
