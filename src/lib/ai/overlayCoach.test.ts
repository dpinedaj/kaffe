import { describe, expect, it } from "vitest";
import { applyIntentPatch, parseCoachReply } from "./overlayCoach";
import { defaultIntent } from "../generate";

describe("overlay coach parse and patch", () => {
  it("reads JSON from a fenced block", () => {
    const parsed = parseCoachReply(`Here you go
\`\`\`json
{"feedback":"Crash into crack. Add a short into-FC boost.","intentPatch":{"flavors":[{"id":"fruity","weight":1}],"drinkPlan":"rest"}}
\`\`\`
`);
    expect(parsed.feedback).toMatch(/Crash into crack/);
    expect(parsed.intentPatch?.drinkPlan).toBe("rest");
    expect(parsed.intentPatch?.flavors?.[0]?.id).toBe("fruity");
  });

  it("treats non-JSON as feedback only", () => {
    const parsed = parseCoachReply("The DTR is short.");
    expect(parsed.feedback).toBe("The DTR is short.");
    expect(parsed.intentPatch).toBeNull();
  });

  it("drops unknown flavor ids and extra flavors", () => {
    const next = applyIntentPatch(defaultIntent(), {
      flavors: [
        { id: "fruity", weight: 1 },
        { id: "bright", weight: 0.8 },
        { id: "body", weight: 1 },
      ],
    });
    expect(next.flavors.map((f) => f.id)).toEqual(["fruity", "bright"]);
  });

  it("ignores invalid origin and roast style", () => {
    const base = defaultIntent();
    const next = applyIntentPatch(base, {
      originId: "not-a-place",
      roastStyle: "vienna" as never,
      altitudeM: 2100,
    });
    expect(next.originId).toBe(base.originId);
    expect(next.roastStyle).toBe(base.roastStyle);
    expect(next.altitudeM).toBe(2100);
  });
});
