import { describe, expect, it } from "vitest";
import { en } from "./en";
import { es } from "./es";
import { recipeText } from "./recipeCopy";
import { interpolate, translate } from "./translate";

describe("i18n", () => {
  it("keeps the same keys in English and Spanish", () => {
    expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  });

  it("translates recipe descriptions and steps", () => {
    expect(recipeText("es", "tech.v60.hoffmann.flavor")).toMatch(/Balanceado|diario/);
    expect(recipeText("es", "step.v60.hoffmann.prep.title")).toBe("Enjuagar");
    expect(recipeText("es", "step.v60.hoffmann.bloom.title")).toBe("Bloom");
    expect(recipeText("en", "step.v60.hoffmann.prep.title")).toBe("Rinse");
  });

  it("interpolates and leaves technical words in Spanish copy", () => {
    expect(interpolate("Day {days} · RTD window", { days: 2 })).toBe("Day 2 · RTD window");
    expect(translate("es", "rest.bloomingGood", { days: 8 })).toMatch(/blooming/);
    expect(translate("es", "studio.maillard")).toBe("Maillard");
    expect(translate("es", "nav.brew")).toBe("Brew");
    expect(translate("es", "process.honey")).toBe("Honey");
    expect(translate("es", "flavor.fruity")).toBe("Afrutado");
    expect(translate("es", "originNote.colombia-huila")).toMatch(/Huila|volcánicos|Honey/);
    expect(translate("es", "methodBlurb.v60")).toMatch(/Hoffmann|bloom/);
    expect(translate("es", "restWhy.bloomingGood")).toMatch(/bloom/);
    expect(translate("es", "variety.pink-bourbon")).toBe("Borbon Rosado");
    expect(translate("es", "variety.yellow-bourbon")).toBe("Borbon Amarillo");
    expect(translate("es", "curve.addPoint")).toBe("Añadir punto");
    expect(translate("es", "size.medium")).toBe("medio");
    expect(translate("es", "common.notALock")).toBe("No es definitivo");
  });
});
