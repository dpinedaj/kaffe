import { describe, expect, it } from "vitest";
import { SCIENCE, type ScienceTab, type ScienceTopic } from "./content";

const REQUIRED: Record<ScienceTopic, string[]> = {
  brew: ["extraction", "altitude", "competition", "community", "grind", "rest", "after-brew", "taste"],
  roast: ["phases", "moisture", "first-crack", "development", "density", "boosts", "rtd", "flavor", "fan"],
};
const TOPICS: ScienceTopic[] = ["brew", "roast"];
const refsOf = (tab: ScienceTab) => tab.groups.flatMap((g) => g.refs);

describe("science content", () => {
  for (const topic of TOPICS) {
    it(`${topic}: has every required section`, () => {
      for (const locale of ["en", "es"] as const) {
        const ids = SCIENCE[locale][topic].sections.map((s) => s.id);
        for (const id of REQUIRED[topic]) expect(ids, `${locale} ${id}`).toContain(id);
        expect(new Set(ids).size).toBe(ids.length);
      }
    });

    it(`${topic}: en and es share section ids, ref ids and urls`, () => {
      const en = SCIENCE.en[topic];
      const es = SCIENCE.es[topic];
      expect(es.sections.map((s) => s.id)).toEqual(en.sections.map((s) => s.id));
      expect(es.sections.map((s) => s.refs)).toEqual(en.sections.map((s) => s.refs));
      expect(refsOf(es).map((r) => [r.id, r.url])).toEqual(refsOf(en).map((r) => [r.id, r.url]));
      expect(es.groups.length).toBe(en.groups.length);
      expect(es.limits.length).toBe(en.limits.length);
    });

    it(`${topic}: every section ref resolves and ref ids are unique`, () => {
      for (const locale of ["en", "es"] as const) {
        const tab = SCIENCE[locale][topic];
        const ids = refsOf(tab).map((r) => r.id);
        expect(new Set(ids).size, `${locale} duplicate ref id`).toBe(ids.length);
        for (const s of tab.sections) {
          for (const id of s.refs) expect(ids, `${locale} ${s.id} → ${id}`).toContain(id);
          expect(s.body.length).toBeGreaterThanOrEqual(1);
          expect(s.body.length).toBeLessThanOrEqual(3);
        }
        expect(tab.limits.length).toBeGreaterThanOrEqual(3);
        expect(tab.limits.length).toBeLessThanOrEqual(6);
      }
    });
  }
});
