import { useMemo, useRef } from "react";
import { BoostZones } from "../components/BoostZones";
import { InteractiveCurve } from "../components/InteractiveCurve";
import { Card, Field, Pill, Row, Select, Toggle } from "../components/ui";
import { formatClock } from "../lib/curve";
import {
  downloadText,
  generateProfile,
  inferFlavorsFromAdjustment,
  inferStyleFromCurve,
  formatZoneSummary,
  isAutoDensity,
  signed,
  type RoastIntent,
} from "../lib/generate";
import { activeZones } from "../lib/kpro";
import {
  BREWS,
  FLAVORS,
  ORIGINS,
  PROCESSES,
  STYLES,
  VARIETIES,
  flavorById,
  originById,
  recommendFlavor,
  varietyById,
  type FlavorId,
} from "../lib/knowledge";

type StudioTab = "parameters" | "flavor" | "curve";

export default function Studio({
  intent,
  setIntent,
  tab,
  setTab,
  onSave,
}: {
  intent: RoastIntent;
  setIntent: (next: RoastIntent) => void;
  tab: StudioTab;
  setTab: (tab: StudioTab) => void;
  onSave: () => void;
}) {
  const generated = useMemo(() => generateProfile(intent), [intent]);
  const origin = originById(intent.originId);
  const variety = varietyById(intent.varietyId);
  const preManual = useRef<{ flavors: RoastIntent["flavors"]; roastStyle: RoastIntent["roastStyle"] } | null>(null);

  function patch(partial: Partial<RoastIntent>) {
    const next: RoastIntent = { ...intent, ...partial };
    if (!("manualAnchors" in partial)) {
      next.manualAnchors = undefined;
      preManual.current = null;
    }
    setIntent(next);
  }

  function toggleFlavor(id: FlavorId) {
    const existing = intent.flavors.find((f) => f.id === id);
    if (existing) {
      patch({ flavors: intent.flavors.filter((f) => f.id !== id) });
      return;
    }
    if (intent.flavors.length >= 2) {
      patch({ flavors: [...intent.flavors.slice(1), { id, weight: 1 }] });
      return;
    }
    patch({ flavors: [...intent.flavors, { id, weight: 1 }] });
  }

  return (
    <div className="mx-auto grid min-h-0 w-full max-w-[1400px] flex-1 grid-cols-1 gap-4 p-4 lg:grid-cols-[420px_minmax(0,1fr)]">
      <div className="min-h-0 space-y-4">
        <div className="flex rounded-xl bg-card p-1">
          {(["parameters", "flavor"] as const).map((id) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`flex-1 rounded-lg py-2 text-[13px] font-semibold capitalize ${
                tab === id || (tab === "curve" && id === "flavor") ? "bg-card2 text-white" : "text-muted"
              }`}
            >
              {id === "parameters" ? "Parameters" : "Flavor"}
            </button>
          ))}
        </div>

        {tab === "parameters" ? (
          <div className="space-y-4">
            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Bean info</h2>
              <Card>
                <Row label="Origin">
                  <Select value={intent.originId} onChange={(id) => {
                    const o = originById(id);
                    patch({
                      originId: id,
                      process: o.typicalProcess,
                      altitudeM: o.typicalAltitude,
                      varietyId: o.suggestedVarietyId ?? "unknown",
                    });
                  }}>
                    {ORIGINS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.regions})
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Variety">
                  <Select value={intent.varietyId || "unknown"} onChange={(id) => patch({ varietyId: id })}>
                    {VARIETIES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.name}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Process">
                  <Select value={intent.process} onChange={(v) => patch({ process: v as RoastIntent["process"] })}>
                    {PROCESSES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Altitude (m)">
                  <input
                    type="number"
                    value={intent.altitudeM}
                    onChange={(e) => patch({ altitudeM: Number(e.target.value) })}
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none"
                  />
                </Row>
                <Row label="Density from altitude">
                  <Toggle
                    on={isAutoDensity(intent)}
                    onChange={(on) =>
                      patch({
                        autoDensity: on,
                        densityGL: on ? undefined : generated.resolvedDensityGL,
                      })
                    }
                  />
                </Row>
                <Row label="Density (g/L)">
                  <input
                    type="number"
                    min={550}
                    max={820}
                    step={1}
                    value={isAutoDensity(intent) ? generated.resolvedDensityGL : (intent.densityGL ?? "")}
                    onChange={(e) => {
                      if (e.target.value === "") {
                        patch({ autoDensity: true, densityGL: undefined });
                        return;
                      }
                      patch({ autoDensity: false, densityGL: Number(e.target.value) });
                    }}
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none"
                  />
                </Row>
                <Row label="Moisture (%, optional)">
                  <input
                    type="number"
                    min={6}
                    max={16}
                    step={0.1}
                    placeholder="11 typ."
                    value={intent.moisture ?? ""}
                    onChange={(e) => patch({ moisture: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
                  />
                </Row>
                <Row label="Brew">
                  <Select value={intent.brew} onChange={(v) => patch({ brew: v as RoastIntent["brew"] })}>
                    {BREWS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Roast style">
                  <Select value={intent.roastStyle} onChange={(v) => patch({ roastStyle: v as RoastIntent["roastStyle"] })}>
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label="Cup timing" last>
                  <div className="flex rounded-lg bg-card2 p-0.5">
                    {([
                      ["rest", "Rest"],
                      ["rtd", "RTD"],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                          (intent.drinkPlan ?? "rest") === id ? "bg-blue text-white" : "text-muted"
                        }`}
                        onClick={() => patch({ drinkPlan: id })}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </Row>
              </Card>
              <div className="mt-2 space-y-2 px-1 text-[12px] leading-relaxed text-muted">
                {origin.notes && (
                  <p>
                    <span className="text-label">{origin.cup ? `${origin.cup}. ` : ""}</span>
                    {origin.notes}
                  </p>
                )}
                {variety.notes && variety.id !== "unknown" && (
                  <p>
                    <span className="text-label">
                      {variety.name}
                      {variety.cup ? ` · ${variety.cup}. ` : ". "}
                    </span>
                    {variety.notes} Seed {variety.beanSize}, {variety.density} density.
                  </p>
                )}
                {isAutoDensity(intent) ? (
                  <p>
                    <span className="text-label">
                      {generated.resolvedDensityGL} g/L · {generated.densityClass} from {intent.altitudeM} m.{" "}
                    </span>
                    Higher elevation cools the tree, cherries ripen slower, and the seed packs tighter.
                    A Nepal 2021 study went from ~620 g/L at 850 m to ~688 g/L at 1450 m. Changing
                    altitude updates this number; type a reading if you measured the lot.
                  </p>
                ) : (
                  <p>
                    <span className="text-label">
                      Measured {generated.resolvedDensityGL} g/L · {generated.densityClass}.{" "}
                    </span>
                    Heat follows this reading. Turn “Density from altitude” back on to let elevation
                    drive it again.
                  </p>
                )}
                {intent.moisture != null && (
                  <p>
                    <span className="text-label">Moisture {intent.moisture}%. </span>
                    {intent.moisture > 11
                      ? "Wetter than typical export green — longer drying, more preheat and fan so the water leaves before Maillard."
                      : intent.moisture < 11
                        ? "Drier than typical — less preheat and a shorter dry so the front does not race (monsoon / old crop / decaf-like)."
                        : "At the 11% reference. No extra moisture adjustment."}
                  </p>
                )}
                {(intent.drinkPlan ?? "rest") === "rtd" ? (
                  <p>
                    <span className="text-label">RTD · drink 1–3 days. </span>
                    Official Kaffelogic Ready-to-Drink profiles are for roasting, grinding, and brewing
                    before the lot has degassed — guests, test roasts, or an empty jar. A fluid-bed bean
                    keeps more CO₂ than a drum roast, so RTD forces that gas out during the roast:
                    a RoR step after drying/Maillard, then a +boost through first crack (“T through crack”).
                    That is the same idea as the stock RTD 1500–2000 boosts, not the BOOST kit hardware.
                    Flavour is front-loaded and fades hard around day 4. Rest is the better pick if you
                    can wait.
                  </p>
                ) : (
                  <p>
                    <span className="text-label">Rest · peak 3–5 days. </span>
                    Official Rest profiles wait for degassing. Boosts only fire when the bean actually
                    needs them (wet drying, crash into crack, runaway dark espresso). Energy through
                    first crack stays gentler, so CO₂ leaves in the bag and acidity/sweetness settle.
                    Use this for the “best cup,” RTD for “drink tonight.”
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Roast level</h2>
              <Card>
                <Row label="Auto level (roast-style default)">
                  <Toggle on={intent.autoLevel} onChange={(on) => patch({ autoLevel: on })} />
                </Row>
                <Row label="Expected first crack (°C)" last>
                  <input
                    type="number"
                    min={185}
                    max={222}
                    step={0.1}
                    placeholder={`${generated.autoFirstCrackTemp.toFixed(1)} auto`}
                    value={intent.expectFc ?? ""}
                    onChange={(e) =>
                      patch({ expectFc: e.target.value === "" ? undefined : Number(e.target.value) })
                    }
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
                  />
                </Row>
              </Card>
              <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
                {intent.expectFc != null ? (
                  <>
                    <span className="text-label">Manual expect_fc {generated.firstCrackTemp.toFixed(1)} °C. </span>
                    The red marker, development time, and fan drop follow this temperature on the curve.
                  </>
                ) : (
                  <>
                    Leave empty to estimate from origin, variety, and flavor (
                    {generated.autoFirstCrackTemp.toFixed(1)} °C). Set it when you already know where this
                    lot cracks on the Nano 7 probe.
                  </>
                )}
              </p>
              {!intent.autoLevel && (
                <Card className="mt-2 px-4 py-3">
                  <div className="mb-2 flex justify-between text-[13px] text-label">
                    <span>Level</span>
                    <span className="text-white">{intent.level.toFixed(1)}</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={6}
                    step={0.1}
                    value={intent.level}
                    onChange={(e) => patch({ level: Number(e.target.value) })}
                    className="w-full"
                  />
                </Card>
              )}
            </section>

            <BoostZones
              intent={intent}
              generated={generated}
              onChange={(partial) => setIntent({ ...intent, ...partial })}
            />
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <div className="mb-1 flex items-center justify-between px-1">
                <h2 className="text-[17px] font-semibold">Flavor goal</h2>
                <span className="rounded-full bg-card2 px-2 py-0.5 text-[11px] text-muted">
                  {intent.flavors.length}/2
                </span>
              </div>
              <p className="mb-3 px-1 text-[13px] text-muted">
                Leave empty for the bean’s default curve; two goals share one adjustment budget.
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FLAVORS.map((f) => {
                  const rec = recommendFlavor(
                    f.id,
                    intent.process,
                    intent.roastStyle,
                    origin,
                    variety,
                    generated.densityClass,
                  );
                  const idx = intent.flavors.findIndex((x) => x.id === f.id);
                  const selected = idx >= 0;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleFlavor(f.id)}
                      className={`relative rounded-2xl bg-card p-3 text-left ${
                        selected ? "ring-2 ring-blue" : ""
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue text-[11px] font-bold">
                          {idx + 1}
                        </span>
                      )}
                      <div className="text-xl">{f.icon}</div>
                      <div className="mt-1 text-[13px] font-semibold">{f.name}</div>
                      <Pill tone={rec === "recommended" ? "green" : rec === "avoid" ? "orange" : "muted"}>
                        {rec === "recommended" ? "Recommended" : rec === "avoid" ? "Not recommended" : "Neutral"}
                      </Pill>
                    </button>
                  );
                })}
              </div>
            </div>

            {intent.flavors.map((pick) => {
              const f = flavorById(pick.id);
              const rec = recommendFlavor(
                f.id,
                intent.process,
                intent.roastStyle,
                origin,
                variety,
                generated.densityClass,
              );
              return (
                <Card key={f.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[16px] font-semibold">{f.name}</div>
                      <Pill tone={rec === "recommended" ? "green" : rec === "avoid" ? "orange" : "muted"}>
                        {rec === "recommended" ? "Recommended" : rec === "avoid" ? "Not recommended" : "Neutral"}
                      </Pill>
                    </div>
                    <button type="button" className="text-muted" onClick={() => toggleFlavor(f.id)}>
                      ✕
                    </button>
                  </div>
                  <div className="mb-1 flex justify-between text-[13px] text-label">
                    <span>Flavor adjustment</span>
                    <span className="text-white">{Math.round(pick.weight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={pick.weight}
                    onChange={(e) =>
                      patch({
                        flavors: intent.flavors.map((x) =>
                          x.id === pick.id ? { ...x, weight: Number(e.target.value) } : x,
                        ),
                      })
                    }
                    className="mb-4 w-full"
                  />
                  <details open className="text-[13px]">
                    <summary className="cursor-pointer font-semibold text-blue">Roast strategy</summary>
                    <div className="mt-3 space-y-3 text-label">
                      <p>
                        Suggested roast level:{" "}
                        <span className="text-green">
                          {f.suggestedStyle} {f.suggestedStyle === intent.roastStyle ? "(already current)" : ""}
                        </span>
                      </p>
                      <ul className="list-disc space-y-1 pl-4">
                        {f.strategy.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <p>
                        <span className="text-white">Why. </span>
                        {f.why}
                      </p>
                      <p>
                        Expected: {f.expected.join(", ")} · Trade-offs: {f.tradeoffs.join(", ")}
                      </p>
                      <p className="text-orange">{f.warning}</p>
                    </div>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <Card className="p-4">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[15px] font-semibold">Curve preview</h2>
            <span className="text-[12px] text-muted">Walk, Add point, Smooth spikes, Reset</span>
          </div>
          <InteractiveCurve
            poly={generated.roastPoly}
            anchors={generated.profile.roast.anchors}
            ror={generated.rorPoly}
            fcTime={generated.firstCrackTime}
            endTime={generated.totalTime}
            zones={activeZones(generated.profile.raw)}
            canReset={generated.manual}
            onReset={() => {
              const snap = preManual.current;
              preManual.current = null;
              setIntent({
                ...intent,
                manualAnchors: undefined,
                flavors: snap?.flavors ?? intent.flavors,
                roastStyle: snap?.roastStyle ?? intent.roastStyle,
              });
            }}
            onAnchorsChange={(anchors) => {
              if (!intent.manualAnchors) {
                preManual.current = { flavors: intent.flavors, roastStyle: intent.roastStyle };
              }
              const next: RoastIntent = { ...intent, manualAnchors: anchors };
              const preview = generateProfile(next);
              next.flavors = inferFlavorsFromAdjustment(preview.breakdown.flavor);
              next.roastStyle = inferStyleFromCurve(preview.dtr, anchors[anchors.length - 1]?.v ?? 212);
              setIntent(next);
            }}
          />
          {generated.manual && (
            <p className="mt-2 text-[12px] text-blue">
              Curve is manual. Flavor goals and the result table follow the shape you drew.
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted">
            <span className="text-blue">Bean · handles</span>
            <span className="text-orange">RoR (reference)</span>
            <span className="text-[#BF5AF2]">Boost zones</span>
            <span className="text-red">First crack</span>
            <span className="text-green">Drop</span>
          </div>
        </Card>

        <Card>
          <h2 className="px-4 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Result</h2>
          <Field
            label="Cup timing"
            value={
              (intent.drinkPlan ?? "rest") === "rtd" ? "RTD · brew 1–3 days" : "Rest · peak 3–5 days"
            }
          />
          <Field label="Curve name" value={generated.curveName} />
          <Field
            label="First crack temp"
            value={`${generated.firstCrackTemp.toFixed(1)} °C${intent.expectFc != null ? " · set" : ""}`}
          />
          <Field label="First crack time" value={formatClock(generated.firstCrackTime)} />
          <Field label="Total time" value={formatClock(generated.totalTime)} />
          <Field
            label="Pace"
            value={
              generated.family === "nordic"
                ? "Nordic · ~6–7 min"
                : generated.family === "slow"
                  ? "Slow · ~11 min"
                  : "Classic · ~9 min"
            }
          />
          <Field label="DTR" value={`${(generated.dtr * 100).toFixed(1)}%`} />
          <Field
            label="Dehydration"
            value={`${formatClock(generated.dryTime)} · ${generated.drySlope.toFixed(1)} °C/min`}
          />
          <Field
            label="Maillard"
            value={`${formatClock(generated.mailTime)} · ${generated.mailSlope.toFixed(1)} °C/min`}
          />
          <Field
            label="Development"
            value={`${formatClock(generated.devTime)} · ${generated.devSlope.toFixed(1)} °C/min`}
          />
          <Field label="Preheat power" value={`${generated.preheatPower} W`} />
          <Field label="Density" value={`${generated.resolvedDensityGL} g/L · ${generated.densityClass}`} />
          <Field label="Zone 1 · drying" value={formatZoneSummary(generated.zones.zone1)} />
          <Field label="Zone 2 · into crack" value={formatZoneSummary(generated.zones.zone2)} />
          <Field label="Zone 3 · after crack" value={formatZoneSummary(generated.zones.zone3)} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Adjustment breakdown</h2>
          <div className="grid gap-3 text-[12px] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {(
              [
                ["Origin baseline", generated.breakdown.origin],
                [`Variety (${variety.name})`, generated.breakdown.variety],
                [
                  intent.moisture != null
                    ? `Moisture (${intent.moisture}% · 11% ref)`
                    : "Moisture (not set)",
                  generated.breakdown.moisture,
                ],
                [
                  `Density (${generated.resolvedDensityGL} g/L · ${generated.densityClass})`,
                  generated.breakdown.density,
                ],
                [
                  `Flavor (${intent.flavors.map((f) => flavorById(f.id).name).join(" + ") || "none"})`,
                  generated.breakdown.flavor,
                ],
                ["Final total", generated.breakdown.total],
              ] as const
            ).map(([title, adj]) => (
              <div key={title} className="rounded-xl bg-card2 p-3">
                <div className="mb-2 font-semibold text-white">{title}</div>
                <div className="space-y-1 text-label">
                  <div>FC {signed(adj.fcTemp, "°C", 1)}</div>
                  <div>Preheat {signed(adj.preheatW, "W")}</div>
                  <div>Drying {signed(adj.dryingS, "s")}</div>
                  <div>Mid {signed(adj.midS, "s")}</div>
                  <div>Development {signed(adj.developmentS, "s")}</div>
                  <div>Fan {signed(adj.fanRpm, " RPM")}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => downloadText(generated.profile.fileName, generated.kproText)}
            className="rounded-xl bg-blue px-4 py-3 text-[15px] font-semibold text-white"
          >
            Download .kpro
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-card2 px-4 py-3 text-[15px] font-semibold text-white"
          >
            Save to library
          </button>
        </div>
      </div>
    </div>
  );
}
