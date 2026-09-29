import { useState } from "react";
import { useI18n } from "../i18n/LocaleContext";
import type { MessageKey } from "../i18n/en";
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
  const { t } = useI18n();
  const auto = intent.autoZones !== false;
  const zones = generated.zones;
  const [adding, setAdding] = useState<ZoneId | null>(null);
  const roleLabel = (role: ZoneRole) => t(`boost.role.${role}` as MessageKey);
  const reasonOf = (z: ZoneIntent) =>
    z.reasonKey ? t(z.reasonKey as MessageKey, z.reasonVars) : z.reason;

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
    setAdding(null);
    commit({
      ...zones,
      [id]: { ...seeded, reason: ZONE_ROLE_META[role].hint, reasonKey: `boost.hint.${role}`, reasonVars: undefined },
    });
  }

  function removeZone(id: ZoneId) {
    commit({ ...zones, [id]: offZone(ZONE_SLOT_META[id].defaultRole) });
  }

  return (
    <section>
      <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("boost.title")}</h2>
      <Card>
        <Row label={t("boost.recommend")} last>
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
        {t("boost.help")}
      </p>
      <div className="mt-3 space-y-2">
        {ZONE_IDS.map((id) => {
          const z = zones[id];
          const on = z.enabled && z.endS > z.startS;
          return (
            <Card key={id} className="p-3">
              <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-white">{t(`boost.${id}` as MessageKey)}</div>
                    <div className="text-[11px] text-muted">{on ? formatZoneSummary(z, roleLabel) : t("common.off")}</div>
                  </div>
                  {on && (
                    <button type="button" className="text-[12px] font-medium text-orange sm:hidden" onClick={() => removeZone(id)}>
                      {t("common.remove")}
                    </button>
                  )}
                </div>
                {on ? (
                  <button type="button" className="hidden text-[12px] font-medium text-orange sm:inline" onClick={() => removeZone(id)}>
                    {t("common.remove")}
                  </button>
                ) : adding === id ? (
                  <div className="grid grid-cols-2 gap-1 sm:flex sm:flex-wrap sm:justify-end">
                    {ROLES.map((role) => (
                      <button
                        key={role}
                        type="button"
                        className="rounded-lg bg-card2 px-2 py-2 text-[11px] font-medium text-blue sm:py-1"
                        onClick={() => addZone(id, role)}
                      >
                        {roleLabel(role)}
                      </button>
                    ))}
                  </div>
                ) : (
                  <button
                    type="button"
                    className="self-start rounded-lg bg-card2 px-3 py-1.5 text-[12px] font-medium text-blue sm:self-auto"
                    onClick={() => setAdding(id)}
                  >
                    {t("boost.add")}
                  </button>
                )}
              </div>
              {on && (
                <div className="space-y-3">
                  {reasonOf(z) && <p className="text-[12px] leading-relaxed text-label">{reasonOf(z)}</p>}
                  <label className="block">
                    <div className="mb-1 flex justify-between text-[12px] text-muted">
                      <span>{t("common.start")}</span>
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
                      <span>{t("common.end")}</span>
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
                      <span>{t("common.boost")}</span>
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
