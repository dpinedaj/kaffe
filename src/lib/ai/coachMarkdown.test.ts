import { describe, expect, it } from "vitest";
import { parseCoachInline, parseCoachMarkdown } from "./coachMarkdown";

describe("coach markdown", () => {
  it("splits paragraphs and bullets", () => {
    const blocks = parseCoachMarkdown(
      "**Higher initial increase** on the blue curve.\n\n- **More upfront:** fruit\n- Less plush mid-palate\n\nPractical read for your comparison.",
    );
    expect(blocks).toEqual([
      { type: "p", text: "**Higher initial increase** on the blue curve." },
      { type: "ul", items: ["**More upfront:** fruit", "Less plush mid-palate"] },
      { type: "p", text: "Practical read for your comparison." },
    ]);
  });

  it("parses bold and code spans", () => {
    expect(parseCoachInline("A **steeper** early ramp and `npm run dev`.")).toEqual([
      { type: "text", text: "A " },
      { type: "strong", text: "steeper" },
      { type: "text", text: " early ramp and " },
      { type: "code", text: "npm run dev" },
      { type: "text", text: "." },
    ]);
  });
});
