import { afterEach, describe, expect, it } from "vitest";
import { loadMode, loadRoaster, saveMode, saveRoaster } from "./appMode";
import { ROASTERS, roasterById, roasterName } from "./roasters";

function fakeStorage(seed: Record<string, string> = {}) {
  const store = new Map(Object.entries(seed));
  (globalThis as { localStorage?: unknown }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  };
}

afterEach(() => {
  delete (globalThis as { localStorage?: unknown }).localStorage;
});

describe("app mode", () => {
  it("asks new people what they do (no mode yet)", () => {
    fakeStorage();
    expect(loadMode()).toBeNull();
  });

  it("keeps people who already have roast profiles in Roast, without the welcome", () => {
    fakeStorage({ "kaffe.library.v1": JSON.stringify([{ id: "a" }]) });
    expect(loadMode()).toBe("roast");
  });

  it("remembers the choice and the roaster", () => {
    fakeStorage();
    saveMode("brew");
    expect(loadMode()).toBe("brew");
    saveRoaster("kaffelogic-nano7");
    expect(loadRoaster()).toBe("kaffelogic-nano7");
  });
});

describe("roasters", () => {
  it("ships Kaffelogic Nano 7 as the one supported roaster, with its file formats", () => {
    expect(ROASTERS).toHaveLength(1);
    expect(roasterName(ROASTERS[0])).toBe("Kaffelogic Nano 7");
    expect(roasterById("unknown").profileExt).toBe(".kpro");
    expect(roasterById(undefined).logExt).toBe(".klog");
  });
});
