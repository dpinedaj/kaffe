import { describe, expect, it } from "vitest";
import type { Locale } from "../i18n/translate";
import { BREW_METHODS, recommendBrew, techniquesFor, type BrewMethod } from "./brew";
import { blankRecipe, cloneFromCard, type UserBrewRecipe } from "./brewRecipes";
import { withGrindSetting } from "./brewSteps";
import {
  asReceived,
  cardLink,
  decodeRecipe,
  encodeRecipe,
  recipeLink,
  recipeSummary,
  sharedCodeFromHash,
} from "./shareRecipe";

const PAGE = "https://dpinedaj.github.io/kaffe/";

type Query = Parameters<typeof recommendBrew>[0];

function everyCard(): { label: string; query: Query }[] {
  const out: { label: string; query: Query }[] = [];
  for (const { id: method } of BREW_METHODS) {
    const techs = techniquesFor(method).map((t) => t.id);
    for (const technique of techs.length ? techs : [undefined]) {
      for (const [days, process, roastStyle, kitchenAltitudeM] of [
        [2, "natural", "light", undefined],
        [14, "washed", "medium", 2600],
        [21, "honey", "dark", undefined],
      ] as const) {
        out.push({
          label: `${method}/${technique}/${days}d/${process}/${roastStyle}${kitchenAltitudeM ? "/2600m" : ""}`,
          query: { method, roastStyle, drinkPlan: "rest", daysSinceRoast: days, process, technique, kitchenAltitudeM },
        });
      }
    }
  }
  return out;
}

/** Share `recipe` from one phone and open it on another, the way the app does. */
async function roundTrip(recipe: UserBrewRecipe, locale: Locale = "en") {
  const link = await recipeLink(recipe, PAGE);
  const got = await decodeRecipe(sharedCodeFromHash(new URL(link).hash)!, locale);
  return { link, got };
}

function strip(r: UserBrewRecipe | null) {
  if (!r) return r;
  const { id: _i, createdAt: _c, updatedAt: _u, base: _b, ...rest } = r;
  return rest;
}

describe("share a built-in card as a short link", () => {
  it("rebuilds the exact same steps for every method, recipe and bag, in either language", async () => {
    for (const { label, query } of everyCard()) {
      const card = recommendBrew(query);
      const link = cardLink(card, PAGE);
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
      const es = await decodeRecipe(code, "es");
      expect(es?.steps, label).toEqual(recommendBrew({ ...query, locale: "es" }).steps);
    }
  });

  it("never carries your grinder: the other phone fills in its own clicks", async () => {
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14 });
    const shown = withGrindSetting(card.steps, "en", card.grind, { value: "22", clicks: true });
    expect(shown[0].detail).toContain("22 clicks");
    const link = cardLink(card, PAGE);
    expect(link).not.toContain("22%20clicks");
    const got = await decodeRecipe(sharedCodeFromHash(new URL(link).hash)!, "en");
    expect(got?.steps[0].detail).not.toContain("clicks");
  });

  it("rejects a card for an unknown method, recipe, grind or number", async () => {
    expect(await decodeRecipe("c.teapot~x~15~16~240~~93~180~2~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~nope~15~16~240~~93~180~2~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~hoffmann~15~16~240~~93~180~9~~l~")).toBeNull();
    expect(await decodeRecipe("c.v60~hoffmann~abc~16~240~~93~180~2~~l~")).toBeNull();
  });
});

describe("share one of My recipes", () => {
  it("sends an untouched copy of any card as the card plus its name", async () => {
    for (const { label, query } of everyCard()) {
      const mine = cloneFromCard(recommendBrew(query), "My brew · 1:16 (weekday)");
      const { link, got } = await roundTrip(mine);
      expect(link.length, label).toBeLessThan(140);
      expect(strip(got), label).toEqual(strip(mine));
    }
  });

  it("stays short after the usual edits, and brings every edit across", async () => {
    const card = recommendBrew({
      method: "v60",
      roastStyle: "light",
      drinkPlan: "rest",
      daysSinceRoast: 14,
      technique: "kasuya-acid",
    });
    const base = cloneFromCard(card, "My Kasuya");
    const edits: [string, UserBrewRecipe, number][] = [
      ["renamed + flavor note", { ...base, name: "Sunday 4:6", flavor: "Lime, panela", mechanic: "Bigger first pour" }, 200],
      ["dose, ratio, temperature and grind", { ...base, coffeeG: 18, ratioN: 15, wantedC: 90, grind: "medium-fine", timeS: 200 }, 170],
      ["steps reordered", { ...base, steps: [base.steps[0], base.steps[2], base.steps[1], ...base.steps.slice(3)] }, 170],
      ["a step removed", { ...base, steps: base.steps.filter((_, i) => i !== 5) }, 170],
      [
        "one step rewritten",
        { ...base, steps: base.steps.map((s, i) => (i === 2 ? { ...s, detail: "Slow spiral to 96 g, then wait." } : s)) },
        230,
      ],
      ["a step added", { ...base, steps: [...base.steps, { at: "4:00", title: "Swirl", detail: "One gentle swirl." }] }, 220],
      [
        "everything at once",
        {
          ...base,
          name: "Kasuya, my way",
          coffeeG: 16,
          grind: "medium-coarse",
          steps: [...base.steps.slice(0, 3).reverse(), { at: "2:00", title: "Wait", detail: "Let it drain." }, ...base.steps.slice(3)],
        },
        260,
      ],
    ];
    for (const [label, recipe, limit] of edits) {
      const { link, got } = await roundTrip(recipe);
      expect(link.length, label).toBeLessThan(limit);
      expect(strip(got), label).toEqual(strip(recipe));
    }
  });

  it("still carries a recipe written from scratch, more compactly than before", async () => {
    const mine: UserBrewRecipe = {
      ...blankRecipe("aeropress", "Office AeroPress"),
      flavor: "Chocolate, low acid",
      steps: [
        { at: "Prep", title: "Rinse", detail: "Rinse the paper, invert the press, add 15 g." },
        { at: "0:00", title: "Pour", detail: "Pour 200 g at 85 °C and stir 5 times." },
        { at: "1:30", title: "Press", detail: "Flip and press slowly for 30 s." },
      ],
    };
    const { link, got } = await roundTrip(mine);
    expect(link.length).toBeLessThan(420);
    expect(strip(got)).toEqual(strip({ ...mine, base: undefined }));
  });

  it("finds the card behind recipes saved before they remembered it", async () => {
    for (const { label, query } of everyCard()) {
      const card = recommendBrew(query);
      const legacy = { ...cloneFromCard(card, "Old save"), base: undefined };
      const { link, got } = await roundTrip(legacy);
      expect(link.length, label).toBeLessThan(260);
      expect(got?.steps, label).toEqual(legacy.steps);
    }
  });

  it("sends a Spanish recipe's unchanged steps as references, so an English phone reads them in English", async () => {
    const query: Query = { method: "origami", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, technique: "medina" };
    const es = cloneFromCard(recommendBrew({ ...query, locale: "es" }), "Mi Medina");
    const edited = { ...es, steps: es.steps.map((s, i) => (i === 1 ? { ...s, detail: "Vierte 50 g despacio." } : s)) };
    const { link, got } = await roundTrip(edited, "en");
    expect(link.length).toBeLessThan(200);
    const english = recommendBrew(query).steps;
    expect(got?.steps[0]).toEqual(english[0]);
    expect(got?.steps[1].detail).toBe("Vierte 50 g despacio.");
    expect(got?.steps.slice(2)).toEqual(english.slice(2));
  });

  it("stays short when a received recipe is shared again", async () => {
    const card = recommendBrew({ method: "switch", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, technique: "hybrid" });
    const first = await roundTrip({ ...cloneFromCard(card, "Hybrid"), coffeeG: 16 });
    const second = await roundTrip(asReceived(first.got!));
    expect(second.link.length).toBeLessThan(first.link.length + 40);
    expect(second.got?.steps).toEqual(card.steps);
    expect(second.got?.coffeeG).toBe(16);
  });

  it("rejects broken or foreign links instead of importing junk", async () => {
    expect(sharedCodeFromHash("")).toBeUndefined();
    expect(sharedCodeFromHash("#section")).toBeUndefined();
    expect(await decodeRecipe("m.not-a-recipe")).toBeNull();
    expect(await decodeRecipe("x.abc")).toBeNull();
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14 });
    const code = await encodeRecipe({ ...cloneFromCard(card, "Mine"), coffeeG: 17 });
    expect(await decodeRecipe(code.slice(0, code.length / 2))).toBeNull();
    const badRef = btoa(JSON.stringify({ n: "x", b: "v60~hoffmann~15~16~240~~96~180~2~~l~", s: [99] }))
      .replace(/\+/g, "-")
      .replace(/\//g, "_")
      .replace(/=+$/, "");
    expect(await decodeRecipe(`n.${badRef}`)).toBeNull();
  });

  it("still reads links sent before this change", async () => {
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14 });
    const mine = { ...cloneFromCard(card, "Kasuya 4:6"), base: undefined };
    const json = JSON.stringify(mine);
    const b64 = (bytes: Uint8Array) =>
      btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    expect((await decodeRecipe(`j.${b64(new TextEncoder().encode(json))}`))?.name).toBe("Kasuya 4:6");
    const packed = new Uint8Array(
      await new Response(new Blob([json]).stream().pipeThrough(new CompressionStream("deflate-raw"))).arrayBuffer(),
    );
    expect((await decodeRecipe(`z.${b64(packed)}`))?.steps).toEqual(card.steps);
  });

  it("summarises the recipe for the message and marks received copies as shared", () => {
    const card = recommendBrew({ method: "v60", roastStyle: "light", drinkPlan: "rest", daysSinceRoast: 14, technique: "kasuya-acid" });
    const recipe = cloneFromCard(card, "Kasuya 4:6");
    expect(recipeSummary(recipe)).toBe(`Kasuya 4:6 · V60 · ${recipe.coffeeG} g · ${card.ratio} · ${Math.round(recipe.wantedC)} °C`);
    expect(asReceived(recipe, new Date(2026, 8, 30)).origin).toBe("Shared · 2026-09-30");
    expect(asReceived({ ...recipe, origin: "Tetsu Kasuya" }).origin).toBe("Tetsu Kasuya");
  });

  it("handles every method's blank recipe", async () => {
    for (const { id } of BREW_METHODS) {
      const blank = blankRecipe(id as BrewMethod, `Blank ${id}`);
      const { got } = await roundTrip(blank);
      expect(got?.method, id).toBe(id);
      expect(got?.name, id).toBe(`Blank ${id}`);
    }
  });
});
