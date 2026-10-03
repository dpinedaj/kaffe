import { describe, expect, it } from "vitest";
import { parseKlog } from "./klog";
import { parseKpro } from "./kpro";
import { defaultLevel, summarizeOverlayTrack, visibleDiffGroups } from "./overlay";
import { BASELINE_KPRO } from "./template";

const BASELINE_WITH_ZONE2 = BASELINE_KPRO.replace(
  /zone2_time_start:0\.0\nzone2_time_end:0\.0\nzone2_multiplier_Kp:1\.0\nzone2_multiplier_Kd:1\.0\nzone2_boost:0\.0/,
  "zone2_time_start:300.0\nzone2_time_end:315.0\nzone2_multiplier_Kp:1.0\nzone2_multiplier_Kd:1.0\nzone2_boost:3.0",
);

const SYNTH_KLOG = `profile_short_name:Test
profile_designer:Kaffe
recommended_level:3.0
roast_date:11/09/2026 03:01:35 UTC
model:KN1007B
firmware_version:7.21.6
boost_load_size:60.0000
roast_levels:205,208,210,212,214,216,218
roast_profile:0.0,20.0,0,0.0,10,50,40,90,25,70,80,140,120,160,100,150,200,190,240,200,220,196,300,210,340,214,320,212,0,0.0
fan_profile:0.0,14700.0,0,0.0,18,14700,60,14700,42,14700,0,0.0
roasting_level:3.0
!first_crack:240
!roast_end:300
!roast_end_reason:0
!development_percent:20
offsets
time	#spot_temp	#=temp	=mean_temp	=profile	profile_ROR	=actual_ROR	#=desired_ROR	power_kW	#volts-9	#Kp	#Ki	#Kd	#^actual_fan_RPM
0	20	20	20	20	0	0	0	1	0	0	0	0	14700
60	90	90	88	85	30	32	30	1	0	0	0	0	14700
150	155	155	152	150	20	18	20	1	0	0	0	0	14000
240	205	205	204	203	10	9	10	1	0	0	0	0	13500
300	213	213	212	212	4	3	4	1	0	0	0	0	13200
360	80	80	90	212	0	-40	0	0	0	0	0	0	17000
`;

describe("overlay track summary", () => {
  it("reads identity, drop, and active zones from a design profile", () => {
    const profile = parseKpro(BASELINE_WITH_ZONE2, "base.kpro");
    const summary = summarizeOverlayTrack({
      id: "a",
      kind: "profile",
      color: "#0A84FF",
      name: profile.name,
      profile,
      level: defaultLevel(profile),
    });
    expect(summary.designer).toBe("Kaffe");
    expect(summary.headline.find((r) => r.label === "Preheat")?.value).toMatch(/250/);
    expect(summary.sections.find((s) => s.id === "curve")?.rows.find((r) => r.label === "Drop")?.value).toMatch(/212/);
    expect(summary.sections.find((s) => s.id === "zones")?.rows[0]).toMatchObject({
      label: "Z2",
    });
    expect(summary.sections.find((s) => s.id === "zones")?.rows[0]?.value).toMatch(/boost \+3/);
  });

  it("reads measured crack, DTR, and session fields from a log", () => {
    const log = parseKlog(SYNTH_KLOG, "log0007.klog");
    const summary = summarizeOverlayTrack({
      id: "log",
      kind: "log",
      color: "#FF9F0A",
      name: log.name,
      profile: log.design,
      log,
      level: defaultLevel(log.design, log),
    });
    expect(summary.headline.find((r) => r.label === "DTR")?.value).toBe("20.0%");
    expect(summary.headline.find((r) => r.label === "First crack")?.value).toMatch(/4:00/);
    expect(summary.sections.find((s) => s.id === "session")?.rows.find((r) => r.label === "Load")?.value).toBe("60 g");
    expect(summary.sections.find((s) => s.id === "session")?.rows.find((r) => r.label === "Machine")?.value).toMatch(
      /KN1007B/,
    );
  });

  it("hides unused zone groups in the compare table", () => {
    const profile = parseKpro(BASELINE_WITH_ZONE2, "base.kpro");
    const track = {
      id: "a",
      kind: "profile" as const,
      color: "#0A84FF",
      name: profile.name,
      profile,
      level: 3,
    };
    const groups = visibleDiffGroups([track]).map(([group]) => group);
    expect(groups).toContain("Identity");
    expect(groups).toContain("Zone 2");
    expect(groups).not.toContain("Zone 1");
    expect(groups).not.toContain("Zone 3");
    expect(groups).not.toContain("Corner 1");
  });
});
