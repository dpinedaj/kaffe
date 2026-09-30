import { describe, expect, it } from "vitest";
import { recommendBrew } from "./brew";
import { cloneFromCard } from "./brewRecipes";
import { asReceived, decodeRecipe, encodeRecipe, recipeLink, recipeSummary, sharedCodeFromHash } from "./shareRecipe";

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
