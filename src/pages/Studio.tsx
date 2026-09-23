import { useMemo, useRef } from "react";
import { BoostZones } from "../components/BoostZones";
import { InteractiveCurve } from "../components/InteractiveCurve";
import { Card, Field, Pill, Row, Select, Toggle } from "../components/ui";
import { formatClock, levelToTemp, sampleAtTime, timeAtValue } from "../lib/curve";
import {
  downloadText,
  generateProfile,
  inferFlavorsFromAdjustment,
  inferStyleFromCurve,
  formatZoneSummary,
  isAutoDensity,
  signed,
  YELLOW_TEMP,
  type RoastIntent,
} from "../lib/generate";
import { activeZones } from "../lib/kpro";
import { useI18n } from "../i18n/LocaleContext";
import {
  brewLabel,
  defText,
  densityLabel,
  flavorLabel,
  originLabel,
  processLabel,
  sizeLabel,
  styleLabel,
  varietyLabel,
} from "../i18n/labels";
import type { MessageKey } from "../i18n/en";
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
  onBrew,
}: {
  intent: RoastIntent;
  setIntent: (next: RoastIntent) => void;
  tab: StudioTab;
  setTab: (tab: StudioTab) => void;
  onSave: () => void;
  onBrew: () => void;
}) {
  const { t } = useI18n();
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
      const next = intent.flavors.filter((f) => f.id !== id);
      patch({ flavors: next.length === 1 ? [{ ...next[0], weight: 1 }] : next });
      return;
    }
    if (intent.flavors.length >= 2) {
      patch({
        flavors: [
          { ...intent.flavors[1], weight: 0.5 },
          { id, weight: 0.5 },
        ],
      });
      return;
    }
    if (intent.flavors.length === 1) {
      patch({
        flavors: [
          { ...intent.flavors[0], weight: 0.5 },
          { id, weight: 0.5 },
        ],
      });
      return;
    }
    patch({ flavors: [{ id, weight: 1 }] });
  }

  function setFlavorWeight(id: FlavorId, weight: number) {
    if (intent.flavors.length < 2) {
      patch({
        flavors: intent.flavors.map((x) => (x.id === id ? { ...x, weight } : x)),
      });
      return;
    }
    const w = Math.max(0.05, Math.min(0.95, weight));
    patch({
      flavors: intent.flavors.map((x) => (x.id === id ? { ...x, weight: w } : { ...x, weight: Number((1 - w).toFixed(2)) })),
    });
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
              {id === "parameters" ? t("studio.parameters") : t("studio.flavor")}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2 lg:hidden">
          <button
            type="button"
            onClick={() => downloadText(generated.profile.fileName, generated.kproText)}
            className="rounded-xl bg-blue px-2 py-2.5 text-[13px] font-semibold text-white"
          >
            {t("common.download")}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-card2 px-2 py-2.5 text-[13px] font-semibold text-white"
          >
            {t("common.save")}
          </button>
          <button
            type="button"
            onClick={onBrew}
            className="rounded-xl bg-card2 px-2 py-2.5 text-[13px] font-semibold text-white"
          >
            {t("nav.brew")}
          </button>
        </div>

        {tab === "parameters" ? (
          <div className="space-y-4">
            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("studio.beanInfo")}</h2>
              <Card>
                <Row label={t("studio.origin")}>
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
                        {originLabel(o.id, t, o.name)}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label={t("studio.variety")}>
                  <Select value={intent.varietyId || "unknown"} onChange={(id) => patch({ varietyId: id })}>
                    {VARIETIES.map((v) => (
                      <option key={v.id} value={v.id}>
                        {varietyLabel(v.id, t, v.name)}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label={t("studio.process")}>
                  <Select value={intent.process} onChange={(v) => patch({ process: v as RoastIntent["process"] })}>
                    {PROCESSES.map((p) => (
                      <option key={p.id} value={p.id}>
                        {processLabel(p.id, t)}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label={t("studio.altitude")}>
                  <input
                    type="number"
                    value={intent.altitudeM}
                    onChange={(e) => patch({ altitudeM: Number(e.target.value) })}
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none"
                  />
                </Row>
                <Row label={t("studio.densityFromAlt")}>
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
                <Row label={t("studio.densityGL")}>
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
                <Row label={t("studio.moisture")}>
                  <input
                    type="number"
                    min={6}
                    max={16}
                    step={0.1}
                    placeholder={t("studio.moisturePh")}
                    value={intent.moisture ?? ""}
                    onChange={(e) => patch({ moisture: e.target.value === "" ? undefined : Number(e.target.value) })}
                    className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
                  />
                </Row>
                <Row label={t("studio.brew")}>
                  <Select value={intent.brew} onChange={(v) => patch({ brew: v as RoastIntent["brew"] })}>
                    {BREWS.map((b) => (
                      <option key={b.id} value={b.id}>
                        {brewLabel(b.id, t)}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label={t("studio.roastStyle")}>
                  <Select value={intent.roastStyle} onChange={(v) => patch({ roastStyle: v as RoastIntent["roastStyle"] })}>
                    {STYLES.map((s) => (
                      <option key={s.id} value={s.id}>
                        {styleLabel(s.id, t)}
                      </option>
                    ))}
                  </Select>
                </Row>
                <Row label={t("studio.cupTiming")} last>
                  <div className="flex w-full rounded-lg bg-card2 p-0.5 sm:w-auto">
                    {([
                      ["rest", "Rest"],
                      ["rtd", "RTD"],
                    ] as const).map(([id, label]) => (
                      <button
                        key={id}
                        type="button"
                        className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold sm:flex-none ${
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
                {(origin.notes || origin.cup) && (
                  <p>
                    <span className="text-label">
                      {origin.cup
                        ? `${defText(`originCup.${origin.id}` as MessageKey, t, origin.cup)}. `
                        : ""}
                    </span>
                    {defText(`originNote.${origin.id}` as MessageKey, t, origin.notes)}
                  </p>
                )}
                {variety.notes && variety.id !== "unknown" && (
                  <p>
                    <span className="text-label">
                      {varietyLabel(variety.id, t, variety.name)}
                      {variety.cup
                        ? ` · ${defText(`varietyCup.${variety.id}` as MessageKey, t, variety.cup)}. `
                        : ". "}
                    </span>
                    {defText(`varietyNote.${variety.id}` as MessageKey, t, variety.notes)}{" "}
                    {t("studio.seedLine", {
                      size: sizeLabel(variety.beanSize, t),
                      density: densityLabel(variety.density, t),
                    })}
                  </p>
                )}
                {isAutoDensity(intent) ? (
                  <p>
                    <span className="text-label">
                      {t("studio.densityAuto", {
                        gl: generated.resolvedDensityGL,
                        cls: densityLabel(generated.densityClass, t),
                        m: intent.altitudeM,
                      })}
                    </span>
                    {t("studio.densityAutoHelp")}
                  </p>
                ) : (
                  <p>
                    <span className="text-label">
                      {t("studio.densityManual", {
                        gl: generated.resolvedDensityGL,
                        cls: densityLabel(generated.densityClass, t),
                      })}
                    </span>
                    {t("studio.densityManualHelp")}
                  </p>
                )}
                {intent.moisture != null && (
                  <p>
                    <span className="text-label">{t("studio.moistureLine", { n: intent.moisture })}</span>
                    {intent.moisture > 11
                      ? t("studio.moistureWet")
                      : intent.moisture < 11
                        ? t("studio.moistureDry")
                        : t("studio.moistureRef")}
                  </p>
                )}
                {(intent.drinkPlan ?? "rest") === "rtd" ? (
                  <p>
                    <span className="text-label">{t("studio.rtdTitle")}</span>
                    {t("studio.rtdHelp")}
                  </p>
                ) : (
                  <p>
                    <span className="text-label">{t("studio.restTitle")}</span>
                    {t("studio.restHelp")}
                  </p>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("studio.roastLevel")}</h2>
              <Card>
                <Row label={t("studio.autoLevel")}>
                  <Toggle on={intent.autoLevel} onChange={(on) => patch({ autoLevel: on })} />
                </Row>
                <Row label={t("studio.expectFc")} last>
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
                {intent.expectFc != null
                  ? t("studio.expectFcSet", {
                      fc: generated.firstCrackTemp.toFixed(1),
                      level: Number(generated.profile.raw.recommended_level).toFixed(1),
                      temp: (
                        levelToTemp(generated.profile.roastLevels, Number(generated.profile.raw.recommended_level)) ?? 0
                      ).toFixed(1),
                    })
                  : t("studio.expectFcEmpty", { fc: generated.autoFirstCrackTemp.toFixed(1) })}
              </p>
              {!intent.autoLevel && (
                <Card className="mt-2 px-4 py-3">
                  <div className="mb-2 flex justify-between text-[13px] text-label">
                    <span>{t("studio.level")}</span>
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
                <h2 className="text-[17px] font-semibold">{t("studio.flavorGoal")}</h2>
                <span className="rounded-full bg-card2 px-2 py-0.5 text-[11px] text-muted">
                  {intent.flavors.length}/2
                </span>
              </div>
              <p className="mb-3 px-1 text-[13px] text-muted">
                {t("studio.flavorHelp")}
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
                      <div className="mt-1 text-[13px] font-semibold">{flavorLabel(f.id, t)}</div>
                      <Pill tone={rec === "recommended" ? "green" : rec === "avoid" ? "orange" : "muted"}>
                        {rec === "recommended"
                          ? t("common.recommended")
                          : rec === "avoid"
                            ? t("common.notRecommended")
                            : t("common.neutral")}
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
              const suggestedLevel = STYLES.find((s) => s.id === f.suggestedStyle)?.level;
              return (
                <Card key={f.id} className="p-4">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <div className="text-[16px] font-semibold">{flavorLabel(f.id, t)}</div>
                      <Pill tone={rec === "recommended" ? "green" : rec === "avoid" ? "orange" : "muted"}>
                        {rec === "recommended"
                          ? t("common.recommended")
                          : rec === "avoid"
                            ? t("common.notRecommended")
                            : t("common.neutral")}
                      </Pill>
                    </div>
                    <button type="button" className="text-muted" onClick={() => toggleFlavor(f.id)}>
                      ✕
                    </button>
                  </div>
                  <div className="mb-1 flex justify-between text-[13px] text-label">
                    <span>{t("studio.flavorAdj")}</span>
                    <span className="text-white">{Math.round(pick.weight * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={pick.weight}
                    onChange={(e) => setFlavorWeight(pick.id, Number(e.target.value))}
                    className="mb-4 w-full"
                  />
                  <details open className="text-[13px]">
                    <summary className="cursor-pointer font-semibold text-blue">{t("studio.roastStrategy")}</summary>
                    <div className="mt-3 space-y-3 text-label">
                      <p>
                        {t("studio.suggestedLevel")}{" "}
                        <span className="text-green">
                          {styleLabel(f.suggestedStyle, t)}
                          {suggestedLevel != null ? ` L${suggestedLevel.toFixed(1)}` : ""}{" "}
                          {f.suggestedStyle === intent.roastStyle ? t("studio.alreadyCurrent") : ""}
                        </span>
                      </p>
                      <ul className="list-disc space-y-1 pl-4">
                        {t(`flavorStrat.${f.id}` as MessageKey).split(" · ").map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ul>
                      <p>
                        <span className="text-white">{t("studio.whyPrefix")}</span>
                        {t(`flavorWhy.${f.id}` as MessageKey)}
                      </p>
                      <p>
                        {t("studio.expected", {
                          expected: t(`flavorExp.${f.id}` as MessageKey),
                          tradeoffs: t(`flavorTrade.${f.id}` as MessageKey),
                        })}
                      </p>
                      <p className="text-orange">{t(`flavorWarn.${f.id}` as MessageKey)}</p>
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
            <h2 className="text-[15px] font-semibold">{t("studio.curvePreview")}</h2>
            <span className="text-[12px] text-muted">{t("studio.curveHint")}</span>
          </div>
          <InteractiveCurve
            poly={generated.roastPoly}
            anchors={generated.profile.roast.anchors}
            ror={generated.rorPoly}
            fan={generated.fanPoly}
            yellowTime={timeAtValue(generated.roastPoly, YELLOW_TEMP) ?? undefined}
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
              const dropTemp = sampleAtTime(preview.roastPoly, preview.totalTime) ?? anchors[anchors.length - 1]?.v ?? 212;
              next.roastStyle = inferStyleFromCurve(preview.dtr, dropTemp);
              setIntent(next);
            }}
          />
          {generated.manual && (
            <p className="mt-2 text-[12px] text-blue">
              {t("studio.curveManual")}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-muted">
            <span className="text-blue">{t("studio.legendBean")}</span>
            <span className="text-orange">{t("studio.legendRor")}</span>
            <span className="text-[#BF5AF2]">{t("studio.legendFan")}</span>
            <span className="text-[#BF5AF2] opacity-70">{t("studio.legendBoost")}</span>
            <span className="text-[#FFD60A]">{t("studio.legendColor")}</span>
            <span className="text-red">{t("studio.legendFc")}</span>
            <span className="text-green">{t("studio.legendDrop")}</span>
          </div>
        </Card>

        <Card>
          <h2 className="px-4 pt-3 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("studio.result")}</h2>
          <Field
            label={t("studio.cupTiming")}
            value={(intent.drinkPlan ?? "rest") === "rtd" ? t("studio.cupRtd") : t("studio.cupRest")}
          />
          <Field label={t("studio.curveName")} value={generated.curveName} />
          <Field label={t("studio.onNano")} value={generated.profile.name} />
          <Field
            label={t("studio.drop")}
            value={`L${Number(generated.profile.raw.recommended_level).toFixed(1)} · ${(levelToTemp(generated.profile.roastLevels, Number(generated.profile.raw.recommended_level)) ?? 0).toFixed(1)} °C`}
          />
          <Field
            label={t("studio.colourChange")}
            value={`${YELLOW_TEMP.toFixed(1)} °C · ${formatClock(timeAtValue(generated.roastPoly, YELLOW_TEMP) ?? generated.dryTime)}`}
          />
          <Field
            label={t("studio.fcTemp")}
            value={`${generated.firstCrackTemp.toFixed(1)} °C${intent.expectFc != null ? t("studio.fcSet") : ""}`}
          />
          <Field label={t("studio.fcTime")} value={formatClock(generated.firstCrackTime)} />
          <Field label={t("studio.totalTime")} value={formatClock(generated.totalTime)} />
          <Field
            label={t("studio.pace")}
            value={
              generated.family === "nordic"
                ? t("pace.nordic")
                : generated.family === "slow"
                  ? t("pace.slow")
                  : t("pace.classic")
            }
          />
          <Field label={t("studio.dtr")} value={`${(generated.dtr * 100).toFixed(1)}%`} />
          <Field
            label={t("studio.dehydration")}
            value={`${formatClock(generated.dryTime)} · ${generated.drySlope.toFixed(1)} °C/min`}
          />
          <Field
            label={t("studio.maillard")}
            value={`${formatClock(generated.mailTime)} · ${generated.mailSlope.toFixed(1)} °C/min`}
          />
          <Field
            label={t("studio.development")}
            value={`${formatClock(generated.devTime)} · ${generated.devSlope.toFixed(1)} °C/min`}
          />
          <Field
            label={t("studio.fan")}
            value={`${Math.round(sampleAtTime(generated.fanPoly, 40) ?? 0).toLocaleString()} → ${Math.round(sampleAtTime(generated.fanPoly, generated.totalTime) ?? 0).toLocaleString()} RPM`}
          />
          <Field label={t("studio.preheat")} value={`${generated.preheatPower} W`} />
          <Field
            label={t("studio.density")}
            value={`${generated.resolvedDensityGL} g/L · ${densityLabel(generated.densityClass, t)}`}
          />
          <Field label={t("studio.zone1")} value={formatZoneSummary(generated.zones.zone1)} />
          <Field label={t("studio.zone2")} value={formatZoneSummary(generated.zones.zone2)} />
          <Field label={t("studio.zone3")} value={formatZoneSummary(generated.zones.zone3)} />
        </Card>

        <Card className="p-4">
          <h2 className="mb-3 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("studio.breakdown")}</h2>
          <div className="grid gap-3 text-[12px] sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
            {(
              [
                [t("studio.bdOrigin"), generated.breakdown.origin],
                [t("studio.bdVariety", { name: varietyLabel(variety.id, t, variety.name) }), generated.breakdown.variety],
                [
                  intent.moisture != null
                    ? t("studio.bdMoistureSet", { n: intent.moisture })
                    : t("studio.bdMoistureOff"),
                  generated.breakdown.moisture,
                ],
                [
                  t("studio.bdDensity", {
                    gl: generated.resolvedDensityGL,
                    cls: densityLabel(generated.densityClass, t),
                  }),
                  generated.breakdown.density,
                ],
                [
                  t("studio.bdFlavor", {
                    names: intent.flavors.map((f) => flavorLabel(f.id, t)).join(" + ") || t("studio.bdFlavorNone"),
                  }),
                  generated.breakdown.flavor,
                ],
                [t("studio.bdTotal"), generated.breakdown.total],
              ] as const
            ).map(([title, adj]) => (
              <div key={title} className="rounded-xl bg-card2 p-3">
                <div className="mb-2 font-semibold text-white">{title}</div>
                <div className="space-y-1 text-label">
                  <div>{t("studio.bdFc", { v: signed(adj.fcTemp, "°C", 1) })}</div>
                  <div>{t("studio.bdPreheat", { v: signed(adj.preheatW, "W") })}</div>
                  <div>{t("studio.bdDrying", { v: signed(adj.dryingS, "s") })}</div>
                  <div>{t("studio.bdMid", { v: signed(adj.midS, "s") })}</div>
                  <div>{t("studio.bdDev", { v: signed(adj.developmentS, "s") })}</div>
                  <div>{t("studio.bdFan", { v: signed(adj.fanRpm, " RPM") })}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <div className="grid grid-cols-1 gap-2 sm:flex sm:flex-wrap">
          <button
            type="button"
            onClick={() => downloadText(generated.profile.fileName, generated.kproText)}
            className="rounded-xl bg-blue px-4 py-3 text-[15px] font-semibold text-white"
          >
            {t("studio.downloadKpro")}
          </button>
          <button
            type="button"
            onClick={onSave}
            className="rounded-xl bg-card2 px-4 py-3 text-[15px] font-semibold text-white"
          >
            {t("studio.saveLibrary")}
          </button>
          <button
            type="button"
            onClick={onBrew}
            className="rounded-xl bg-card2 px-4 py-3 text-[15px] font-semibold text-white"
          >
            {t("studio.brewThis")}
          </button>
        </div>
      </div>
    </div>
  );
}
