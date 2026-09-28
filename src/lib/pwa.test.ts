import { describe, expect, it } from "vitest";
import { installHelp } from "./pwa";

const IOS = "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko)";

describe("installHelp", () => {
  it("names the Share steps for each iPhone browser", () => {
    expect(installHelp(`${IOS} Version/18.5 Mobile/15E148 Safari/604.1`, true)).toBe("ios");
    expect(installHelp(`${IOS} CriOS/140.0.7339.101 Mobile/15E148 Safari/604.1`, true)).toBe("iosChrome");
    expect(installHelp(`${IOS} EdgiOS/140.0.3485.54 Version/18.0 Mobile/15E148 Safari/604.1`, true)).toBe("iosEdge");
    expect(installHelp(`${IOS} FxiOS/143.0 Mobile/15E148 Safari/605.1.15`, true)).toBe("iosFirefox");
  });

  it("sends in-app browsers to a real browser", () => {
    expect(installHelp(`${IOS} Mobile/15E148 Instagram 400.0.0.0`, true)).toBe("iosInApp");
    expect(installHelp(`${IOS} Mobile/15E148 [FBAN/FBIOS;FBAV/500.0]`, true)).toBe("iosInApp");
  });

  it("keeps desktop and Android guidance", () => {
    expect(installHelp("Mozilla/5.0 (Android 15; Mobile; rv:143.0) Gecko/143.0 Firefox/143.0", false)).toBe("androidFirefox");
    expect(installHelp("Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:143.0) Gecko/20100101 Firefox/143.0", false)).toBe("firefox");
    expect(
      installHelp("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Safari/605.1.15", false),
    ).toBe("macSafari");
  });
});
