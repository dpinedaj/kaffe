import { Card, Row, Toggle } from "./ui";
import { formatClock } from "../lib/curve";
import {
  formatZoneSummary,
  offZone,
  zoneTemplate,
  ZONE_IDS,
  ZONE_ROLE_META,
  ZONE_SLOT_META,
  type GeneratedRoast,
  type RoastIntent,
  type ZoneId,
  type ZoneIntent,
  type ZoneRole,
  type ZoneSet,
} from "../lib/generate";

const ROLES: ZoneRole[] = ["drying", "maillard", "into-fc", "after-fc"];

export function BoostZones({
  intent,
  generated,
  onChange,
}: {
  intent: RoastIntent;
  generated: GeneratedRoast;
  onChange: (partial: Pick<RoastIntent, "autoZones" | "zones">) => void;
}) {
  const auto = intent.autoZones !== false;
  const zones = generated.zones;

  function commit(next: ZoneSet) {
    onChange({ autoZones: false, zones: next });
  }

  function patchZone(id: ZoneId, partial: Partial<ZoneIntent>) {
    const current = zones[id];
    const merged = { ...current, ...partial };
    if (merged.enabled && merged.endS <= merged.startS) {
      merged.endS = merged.startS + 12;
    }
    commit({ ...zones, [id]: merged });
  }

  function addZone(id: ZoneId, role: ZoneRole) {
    const seeded = zoneTemplate(role, generated.firstCrackTime, generated.totalTime);
    commit({ ...zones, [id]: { ...seeded, reason: ZONE_ROLE_META[role].hint } });
  }

  function removeZone(id: ZoneId) {
    commit({ ...zones, [id]: offZone(ZONE_SLOT_META[id].defaultRole) });
  }

  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Boost zones</h2>
      <Card>
        <Row label="Recommend from bean / flavor / RoR" last>
          <Toggle
            on={auto}
            onChange={(on) =>
              onChange({
                autoZones: on,
                zones: on ? undefined : generated.zones,
              })
            }
          />
        </Row>
      </Card>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
        A boost is °C/min added to the Nano’s RoR-error — extra energy through an endothermic dip,
        or a brake after the bean goes exothermic. Rest recommendations use moisture, density, flavor,
        roast style, and design RoR. RTD always adds a Maillard RoR step and a through-crack +boost
        to drive CO₂ out (KL Ready-to-Drink), and skips a negative after-crack brake. You can still
        add, remove, or edit any window.
      </p>
      <div className="mt-3 space-y-2">
        {ZONE_IDS.map((id) => {
          const z = zones[id];
          const on = z.enabled && z.endS > z.startS;
          return (
            <Card key={id} className="p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div>
                  <div className="text-[14px] font-semibold text-white">{ZONE_SLOT_META[id].title}</div>
                  <div className="text-[11px] text-muted">{on ? formatZoneSummary(z) : "off"}</div>
                </div>
                {on ? (
                  <button type="button" className="text-[12px] font-medium text-orange" onClick={() => removeZone(id)}>
                    Remove
                  </button>
                ) : (
                  <div className="flex flex-wrap justify-end gap-1">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className="rounded-lg bg-card2 px-2 py-1 text-[11px] font-medium text-blue"
                        onClick={() => addZone(id, role)}
                      >
                        + {ZONE_ROLE_META[role].label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {on && (
                <div className="space-y-3">
                  {z.reason && <p className="text-[12px] leading-relaxed text-label">{z.reason}</p>}
                  <label className="block">
                    <div className="mb-1 flex justify-between text-[12px] text-muted">
                      <span>Start</span>
                      <span className="text-white">{formatClock(z.startS)}</span>
                    </div>
                    <input
                      type="range"
                      min={30}
                      max={Math.max(40, generated.totalTime)}
                      step={1}
                      value={z.startS}
                      className="w-full"
                      onChange={(e) => patchZone(id, { startS: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex justify-between text-[12px] text-muted">
                      <span>End</span>
                      <span className="text-white">{formatClock(z.endS)}</span>
                    </div>
                    <input
                      type="range"
                      min={40}
                      max={Math.max(50, generated.totalTime + 15)}
                      step={1}
                      value={z.endS}
                      className="w-full"
                      onChange={(e) => patchZone(id, { endS: Number(e.target.value) })}
                    />
                  </label>
                  <label className="block">
                    <div className="mb-1 flex justify-between text-[12px] text-muted">
                      <span>Boost</span>
                      <span className="text-white">
                        {z.boost > 0 ? "+" : ""}
                        {z.boost} °C/min
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-15}
                      max={15}
                      step={0.5}
                      value={z.boost}
                      className="w-full"
                      onChange={(e) => patchZone(id, { boost: Number(e.target.value) })}
                    />
                  </label>
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </section>
  );
}
