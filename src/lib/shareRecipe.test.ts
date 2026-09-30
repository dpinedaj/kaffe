import { describe, expect, it } from "vitest";
import { BREW_METHODS, recommendBrew, techniquesFor } from "./brew";
import { cloneFromCard } from "./brewRecipes";
import { asReceived, cardLink, decodeRecipe, encodeRecipe, recipeLink, recipeSummary, sharedCodeFromHash } from "./shareRecipe";

const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, technique: "kasuya-acid" });
const recipe = { ...cloneFromCard(card, "Kasuya 4:6"), flavor: "Bright · sweet", mechanic: "40 / 60 split" };

describe("share a recipe as a link", () => {
  it("round-trips a recipe through the link, minus id and timestamps", async () => {
    const link = await recipeLink(recipe, "https://example.github.io/kaffe/index.html#old");
    expect(link.startsWith("https://example.github.io/kaffe/index.html#r=z.")).toBe(true);
    const back = await decodeRecipe(sharedCodeFromHash(new URL(link).hash)!);
    expect(back).not.toBeNull();
    const { id: _a, createdAt: _b, updatedAt: _c, ...sent } = recipe;
    const { id: _d, createdAt: _e, updatedAt: _f, ...got } = back!;
    expect(got).toEqual(sent);
  });

  it("keeps a full recipe short enough to paste into a chat", async () => {
    const code = await encodeRecipe(recipe);
    expect(code.length).toBeLessThan(2000);
    expect(code).toMatch(/^z\.[A-Za-z0-9_-]+$/);
  });

  it("rejects broken or foreign links instead of importing junk", async () => {
    expect(sharedCodeFromHash("")).toBeUndefined();
    expect(sharedCodeFromHash("#section")).toBeUndefined();
    expect(await decodeRecipe("z.not-a-recipe")).toBeNull();
    expect(await decodeRecipe("x.abc")).toBeNull();
    const code = await encodeRecipe(recipe);
    expect(await decodeRecipe(code.slice(0, code.length / 2))).toBeNull();
  });

  it("reads the uncompressed form too", async () => {
    const json = btoa(JSON.stringify({ ...recipe, id: undefined })).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect((await decodeRecipe(`j.${json}`))?.name).toBe("Kasuya 4:6");
  });

  it("summarises the recipe for the message and marks received copies as shared", () => {
    expect(recipeSummary(recipe)).toBe(`Kasuya 4:6 · V60 · ${recipe.coffeeG} g · ${card.ratio} · ${Math.round(recipe.wantedC)} °C`);
    expect(asReceived(recipe, new Date(2026, 8, 30)).origin).toBe("Shared · 2026-09-30");
    expect(asReceived({ ...recipe, origin: "Tetsu Kasuya" }).origin).toBe("Tetsu Kasuya");
  });
});

describe("share a built-in card as a short link", () => {
  const PAGE = "https://dpinedaj.github.io/kaffe/";

  it("rebuilds the exact same steps for every method and recipe, in either language", async () => {
    for (const { id: method } of BREW_METHODS) {
      const techs = techniquesFor(method).map((t) => t.id);
      for (const technique of techs.length ? techs : [undefined]) {
        for (const days of [2, 14]) {
          const query = { method, roastStyle: "light", drinkPlan: "rest", daysSinceRoast: days, process: "natural", technique } as const;
          const card = recommendBrew(query);
          const link = cardLink(card, PAGE);
          const label = `${method}/${technique}/${days}`;
          expect(link.length, label).toBeLessThan(110);
          const code = sharedCodeFromHash(new URL(link).hash)!;
          const en = await decodeRecipe(code, "en");
          expect(en?.steps, label).toEqual(card.steps);
          expect([en?.coffeeG, en?.ratioN, en?.timeS, en?.grind, en?.bypassG], label).toEqual([
            card.coffeeG,
            card.ratioN,
            card.timeS,
            card.grind,
            card.bypassG || undefined,
          ]);
          expect(en?.forkedFrom, label).toBe(card.origin);
          const es = await decodeRecipe(code, "es");
          expect(es?.steps, label).toEqual(recommendBrew({ ...query, locale: "es" }).steps);
        }
      }
    }
  });

  it("rejects a card for an unknown method or recipe", async () => {
    expect(await decodeRecipe("c.teapot~x~15~16~240~~93~180~2~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~nope~15~16~240~~93~180~2~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~hoffmann~15~16~240~~93~180~9~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~hoffmann~abc~16~240~~93~180~2~~l~")).toBeNull();
  });
});
