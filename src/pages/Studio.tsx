import { useMemo } from "react";
import { PreviewChart } from "../components/RoastChart";
import { Card, Field, Pill, Row, Select, Toggle } from "../components/ui";
import { formatClock } from "../lib/curve";
import { downloadText, generateProfile, signed, type RoastIntent } from "../lib/generate";
import {
  BREWS,
  FLAVORS,
  ORIGINS,
  PROCESSES,
  STYLES,
  flavorById,
  originById,
  recommendFlavor,
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

  function patch(partial: Partial<RoastIntent>) {
    setIntent({ ...intent, ...partial });
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
                    patch({ originId: id, process: o.typicalProcess, altitudeM: o.typicalAltitude });
                  }}>
                    {ORIGINS.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.regions})
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
                <Row label="Moisture (%, optional)">
                  <input
                    type="number"
                    placeholder="Optional"
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
                <Row label="Roast style" last>
                  <Select value={intent.roastStyle} onChange={(v) => patch({ roastStyle: v as RoastIntent["roastStyle"] })}>
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </Select>
                </Row>
              </Card>
            </section>

            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Roast level</h2>
              <Card>
                <Row label="Auto level (roast-style default)" last>
                  <Toggle on={intent.autoLevel} onChange={(on) => patch({ autoLevel: on })} />
                </Row>
              </Card>
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
                  const rec = recommendFlavor(f.id, intent.process, intent.roastStyle, origin);
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
              const rec = recommendFlavor(f.id, intent.process, intent.roastStyle, origin);
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
            <button type="button" className="text-[13px] text-blue lg:hidden" onClick={() => setTab("curve")}>
              Expand
            </button>
          </div>
          <PreviewChart
            roast={generated.roastPoly}
            ror={generated.rorPoly}
            fan={generated.fanPoly}
            fcTime={generated.firstCrackTime}
            endTime={generated.totalTime}
          />
          <div className="mt-2 flex gap-4 text-[12px] text-muted">
            <span className="text-blue">Bean</span>
            <span className="text-orange">RoR</span>
            <span>Red = first crack · Green = drop</span>
          </div>
        </Card>

        <Card>
          <h2 className="px-4 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Result</h2>
          <Field label="Curve name" value={generated.curveName} />
          <Field label="First crack temp" value={`${generated.firstCrackTemp.toFixed(1)} °C`} />
          <Field label="First crack time" value={formatClock(generated.firstCrackTime)} />
          <Field label="Total time" value={formatClock(generated.totalTime)} />
          <Field label="DTR" value={`${(generated.dtr * 100).toFixed(1)}%`} />
          <Field label="Preheat power" value={`${generated.preheatPower} W`} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">Adjustment breakdown</h2>
          <div className="grid gap-3 text-[12px] sm:grid-cols-3">
            {(
              [
                ["Origin baseline", generated.breakdown.origin],
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
                  <div>Fan {signed(adj.fanS, "s")}</div>
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
