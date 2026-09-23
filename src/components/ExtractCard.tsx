import { useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";
import type { MessageKey } from "../i18n/en";
import { grindLabel } from "../i18n/labels";
import type { Grind } from "../lib/brew";
import {
  clipRatioLine,
  defaultYieldG,
  formatBrewRatio,
  loadExtractHistory,
  nextCupPoint,
  peTicks,
  ratioIsolines,
  readExtract,
  rememberExtract,
  snapEyToRatio,
  tdsTicks,
  type ExtractRecipe,
  type ExtractReading,
  type ExtractUnit,
} from "../lib/extract";
import { Card } from "./ui";

export default function ExtractCard({ recipe }: { recipe: ExtractRecipe }) {
  const { t } = useI18n();
  const [unit, setUnit] = useState<ExtractUnit>("tds");
  const [value, setValue] = useState<number | undefined>();
  const [yieldG, setYieldG] = useState<number | undefined>();
  const [open, setOpen] = useState(false);
  const [history, setHistory] = useState(() => loadExtractHistory());

  const reading = useMemo(
    () => (value != null ? readExtract(unit, value, yieldG, recipe) : undefined),
    [unit, value, yieldG, recipe],
  );

  function openChart() {
    if (reading?.inRange) {
      setHistory(
        rememberExtract({
          at: new Date().toISOString(),
          method: recipe.method,
          tds: reading.tds,
          ey: reading.ey,
        }),
      );
    }
    setOpen(true);
  }

  const tone =
    reading?.verdict === "ok"
      ? "text-green"
      : reading?.verdict === "over"
        ? "text-orange"
        : reading?.verdict === "out"
          ? "text-muted"
          : "text-blue";

  function withGrind(vars?: Record<string, string | number>) {
    if (!vars?.grind) return vars;
    return { ...vars, grind: grindLabel(String(vars.grind) as Grind, t) };
  }

  return (
    <section>
      <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("extract.title")}</h3>
      <Card className="p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="flex rounded-lg bg-card2 p-0.5 sm:w-auto">
            {(
              [
                ["tds", "TDS"],
                ["brix", "Brix"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className={`flex-1 rounded-md px-3 py-2 text-[13px] font-semibold sm:flex-none sm:py-1.5 ${
                  unit === id ? "bg-blue text-white" : "text-muted"
                }`}
                onClick={() => setUnit(id)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-1 sm:items-center sm:justify-end sm:gap-4">
            <label className="flex flex-col gap-1 rounded-xl bg-card2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2 sm:bg-transparent sm:p-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-[13px] sm:normal-case sm:tracking-normal">
                {unit === "tds" ? "TDS" : "Brix"}
              </span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={recipe.method === "espresso" ? 0.1 : 0.01}
                  placeholder={unit === "brix" ? "1.55" : recipe.method === "espresso" ? "9.5" : "1.30"}
                  value={value ?? ""}
                  onChange={(e) => setValue(e.target.value === "" ? undefined : Number(e.target.value))}
                  className="min-w-0 w-full bg-transparent text-[20px] font-semibold leading-none text-white outline-none placeholder:text-muted sm:w-16 sm:text-right sm:text-[17px]"
                />
                <span className="shrink-0 text-[12px] text-muted">{unit === "tds" ? "%" : "°Bx"}</span>
              </span>
            </label>
            <label className="flex flex-col gap-1 rounded-xl bg-card2 px-3 py-2.5 sm:flex-row sm:items-center sm:gap-2 sm:bg-transparent sm:p-0">
              <span className="text-[11px] font-semibold uppercase tracking-wide text-muted sm:text-[13px] sm:normal-case sm:tracking-normal">
                {t("extract.yield")}
              </span>
              <span className="flex items-baseline gap-1">
                <input
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step={0.5}
                  placeholder={String(Math.round(defaultYieldG(recipe.method, recipe.coffeeG, recipe.waterG)))}
                  value={yieldG ?? ""}
                  onChange={(e) => setYieldG(e.target.value === "" ? undefined : Number(e.target.value))}
                  className="min-w-0 w-full bg-transparent text-[20px] font-semibold leading-none text-white outline-none placeholder:text-muted sm:w-16 sm:text-right sm:text-[17px]"
                />
                <span className="shrink-0 text-[12px] text-muted">g</span>
              </span>
            </label>
          </div>
        </div>

        {reading ? (
          <div className="mt-3 space-y-2">
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <div>
                <div className={`text-[17px] font-semibold ${tone}`}>
                  {t(`extract.verdict.${reading.verdict}` as MessageKey)}
                </div>
                <p className="mt-0.5 text-[13px] text-label">
                  {reading.ey.toFixed(1)}% PE · {reading.tds.toFixed(2)}% TDS · {Math.round(reading.yieldG)} g ·{" "}
                  {formatBrewRatio(recipe.waterG / recipe.coffeeG)}
                  {reading.inRange && reading.tdsBand !== "ok"
                    ? ` · ${t(`extract.strength.${reading.tdsBand}` as MessageKey)}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={openChart}
                className="rounded-xl bg-card2 px-3 py-2 text-[13px] font-semibold text-white"
              >
                {t("extract.chart")}
              </button>
            </div>
            {reading.verdict === "out" ? (
              <p className="text-[13px] leading-relaxed text-label">{t("extract.out")}</p>
            ) : null}
            {reading.tips[0] && (
              <p className="text-[13px] leading-relaxed text-white">
                {t("extract.next")}{" "}
                {t(reading.tips[0].id, withGrind(reading.tips[0].vars))}
              </p>
            )}
            {reading.tips.slice(1).map((tip) => (
              <p key={tip.id} className="text-[12px] leading-relaxed text-muted">
                {t(tip.id, withGrind(tip.vars))}
              </p>
            ))}
          </div>
        ) : (
          <p className="mt-3 text-[12px] leading-relaxed text-muted">{t("extract.help")}</p>
        )}
      </Card>
      <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{t("extract.note")}</p>

      {open && (
        <ExtractChart
          recipe={recipe}
          reading={reading}
          history={history.filter(
            (h) =>
              h.method === recipe.method &&
              !(reading && Math.abs(h.ey - reading.ey) < 0.08 && Math.abs(h.tds - reading.tds) < 0.02),
          )}
          onClose={() => setOpen(false)}
        />
      )}
    </section>
  );
}

function ExtractChart({
  recipe,
  reading,
  history,
  onClose,
}: {
  recipe: ExtractRecipe;
  reading: ExtractReading | undefined;
  history: { tds: number; ey: number }[];
  onClose: () => void;
}) {
  const { t } = useI18n();
  const svgRef = useRef<SVGSVGElement>(null);
  const dragging = useRef(false);
  const [previewEy, setPreviewEy] = useState<number | null>(null);
  const [compare, setCompare] = useState<{ tds: number; ey: number } | null>(null);
  const [grabbing, setGrabbing] = useState(false);

  if (!reading?.window) return null;
  const plot = reading.window;

  const W = 360;
  const H = 292;
  const pad = { l: 42, r: 14, t: 22, b: 34 };
  const plotW = W - pad.l - pad.r;
  const plotH = H - pad.t - pad.b;
  const x = (ey: number) => pad.l + ((ey - plot.eyLo) / (plot.eyHi - plot.eyLo)) * plotW;
  const y = (tds: number) => pad.t + (1 - (tds - plot.tdsLo) / (plot.tdsHi - plot.tdsLo)) * plotH;
  const clampX = (ey: number) => Math.max(pad.l, Math.min(pad.l + plotW, x(ey)));
  const clampY = (tds: number) => Math.max(pad.t, Math.min(pad.t + plotH, y(tds)));
  const box = {
    x: x(plot.eyMin),
    y: y(plot.tdsMax),
    w: x(plot.eyMax) - x(plot.eyMin),
    h: y(plot.tdsMin) - y(plot.tdsMax),
  };
  const pourRatio = recipe.waterG / recipe.coffeeG;
  const lineRatio = reading.ey / reading.tds;
  const ratioLabel = formatBrewRatio(pourRatio);
  const beverageLine = clipRatioLine(lineRatio, plot);
  const preview = previewEy == null ? { ey: reading.ey, tds: reading.tds } : snapEyToRatio(previewEy, lineRatio, plot);
  const drifted = Math.abs(preview.ey - reading.ey) > 0.12;
  const live = drifted ? readExtract("tds", preview.tds, reading.yieldG, recipe) ?? reading : reading;
  const ghost = nextCupPoint(reading, lineRatio);
  const px = clampX(preview.ey);
  const py = clampY(preview.tds);
  const labelRight = px < pad.l + plotW * 0.58;
  const lx = labelRight ? px + 12 : px - 12;
  const anchor = labelRight ? "start" : "end";
  const mx = clampX(reading.ey);
  const my = clampY(reading.tds);
  const gx = ghost ? clampX(ghost.ey) : 0;
  const gy = ghost ? clampY(ghost.tds) : 0;

  function svgXY(clientX: number, clientY: number) {
    const svg = svgRef.current!;
    const rect = svg.getBoundingClientRect();
    return {
      x: ((clientX - rect.left) / rect.width) * W,
      y: ((clientY - rect.top) / rect.height) * H,
    };
  }

  function near(ax: number, ay: number, bx: number, by: number, r = 16) {
    const dx = ax - bx;
    const dy = ay - by;
    return dx * dx + dy * dy <= r * r;
  }

  function projectEy(sx: number, sy: number) {
    if (!beverageLine) {
      const ey = plot.eyLo + ((sx - pad.l) / plotW) * (plot.eyHi - plot.eyLo);
      return snapEyToRatio(ey, lineRatio, plot).ey;
    }
    const x1 = x(beverageLine.pe1);
    const y1 = y(beverageLine.tds1);
    const x2 = x(beverageLine.pe2);
    const y2 = y(beverageLine.tds2);
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy;
    const u = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((sx - x1) * dx + (sy - y1) * dy) / len2));
    return beverageLine.pe1 + u * (beverageLine.pe2 - beverageLine.pe1);
  }

  function onPointerDown(e: React.PointerEvent<SVGSVGElement>) {
    const p = svgXY(e.clientX, e.clientY);
    for (const h of history) {
      if (near(p.x, p.y, clampX(h.ey), clampY(h.tds))) {
        setCompare((cur) => (cur && Math.abs(cur.ey - h.ey) < 0.05 && Math.abs(cur.tds - h.tds) < 0.01 ? null : h));
        return;
      }
    }
    if (ghost && near(p.x, p.y, gx, gy, 18)) {
      setPreviewEy(ghost.ey);
      return;
    }
    if (drifted && near(p.x, p.y, mx, my, 16)) {
      setPreviewEy(null);
      return;
    }
    dragging.current = true;
    setGrabbing(true);
    e.currentTarget.setPointerCapture(e.pointerId);
    setPreviewEy(projectEy(p.x, p.y));
  }

  function onPointerMove(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    const p = svgXY(e.clientX, e.clientY);
    setPreviewEy(projectEy(p.x, p.y));
  }

  function endDrag(e: React.PointerEvent<SVGSVGElement>) {
    if (!dragging.current) return;
    dragging.current = false;
    setGrabbing(false);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label={t("common.close")} />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-xl flex-col rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-1">
          <div>
            <h3 className="text-[18px] font-semibold text-white">{t("extract.chartTitle")}</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">{t("extract.chartHelp")}</p>
          </div>
          <button type="button" className="text-[15px] font-medium text-blue" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-5">
          <svg
            ref={svgRef}
            viewBox={`0 0 ${W} ${H}`}
            className={`h-auto w-full touch-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
            role="img"
            aria-label={t("extract.chartTitle")}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={endDrag}
            onPointerCancel={endDrag}
          >
            <defs>
              <clipPath id="extract-plot">
                <rect x={pad.l} y={pad.t} width={plotW} height={plotH} />
              </clipPath>
            </defs>

            {peTicks(plot).map((pe) => (
              <g key={`pe-${pe}`}>
                <line
                  x1={x(pe)}
                  x2={x(pe)}
                  y1={pad.t}
                  y2={pad.t + plotH}
                  stroke="#2c2c2e"
                  strokeWidth="1"
                  strokeDasharray={pe % 4 === 0 ? undefined : "2 3"}
                />
                <text x={x(pe)} y={H - 16} textAnchor="middle" fill="#8e8e93" fontSize="9">
                  {pe}
                </text>
              </g>
            ))}
            {tdsTicks(plot).map((tds) => (
              <g key={`tds-${tds}`}>
                <line
                  x1={pad.l}
                  x2={pad.l + plotW}
                  y1={y(tds)}
                  y2={y(tds)}
                  stroke="#2c2c2e"
                  strokeWidth="1"
                  strokeDasharray="2 3"
                />
                <text x={pad.l - 6} y={y(tds) + 3} textAnchor="end" fill="#8e8e93" fontSize="9">
                  {tds.toFixed(tds >= 4 ? 0 : 2)}
                </text>
              </g>
            ))}

            <g clipPath="url(#extract-plot)">
              {ratioIsolines(reading.scale).map((r) => {
                const line = clipRatioLine(r, plot);
                if (!line) return null;
                const poured = Math.abs(r - pourRatio) < 0.35;
                return (
                  <g key={`r-${r}`}>
                    <line
                      x1={x(line.pe1)}
                      y1={y(line.tds1)}
                      x2={x(line.pe2)}
                      y2={y(line.tds2)}
                      stroke={poured ? "#48484a" : "#3a3a3c"}
                      strokeWidth={poured ? 1.2 : 1}
                      strokeDasharray="4 5"
                    />
                    <text
                      x={x(line.pe2) - 2}
                      y={y(line.tds2) + 10}
                      textAnchor="end"
                      fill={poured ? "#8e8e93" : "#636366"}
                      fontSize="8"
                    >
                      1:{Number.isInteger(r) ? r : r.toFixed(1)}
                    </text>
                  </g>
                );
              })}

              {beverageLine && (
                <line
                  x1={x(beverageLine.pe1)}
                  y1={y(beverageLine.tds1)}
                  x2={x(beverageLine.pe2)}
                  y2={y(beverageLine.tds2)}
                  stroke="#0a84ff"
                  strokeWidth="2"
                />
              )}

              <rect
                x={box.x}
                y={box.y}
                width={box.w}
                height={box.h}
                fill="rgba(10,132,255,0.12)"
                stroke="#0a84ff"
                strokeWidth="1.2"
              />
              <text
                x={box.x + box.w / 2}
                y={box.y + box.h / 2 + 3}
                textAnchor="middle"
                fill="#0a84ff"
                fontSize="10"
                fontWeight="600"
              >
                {t("extract.classic")}
              </text>

              <text x={x(plot.eyLo + 1.3)} y={y(plot.tdsLo + (plot.tdsHi - plot.tdsLo) * 0.88)} fill="#8e8e93" fontSize="8">
                {t("extract.sourCitrus")}
              </text>
              <text
                x={x(plot.eyHi - 0.4)}
                y={y(plot.tdsLo + (plot.tdsHi - plot.tdsLo) * 0.88)}
                textAnchor="end"
                fill="#8e8e93"
                fontSize="8"
              >
                {t("extract.bitterRoast")}
              </text>
              <text
                x={x((plot.eyLo + plot.eyHi) / 2)}
                y={y(plot.tdsHi) + 12}
                textAnchor="middle"
                fill="#8e8e93"
                fontSize="8"
              >
                {t("extract.thick")}
              </text>
              <text x={x(plot.eyLo + 2)} y={y(plot.tdsLo + (plot.tdsHi - plot.tdsLo) * 0.22)} fill="#8e8e93" fontSize="8">
                {t("extract.sweet")}
              </text>
              <text
                x={x(plot.eyHi - 0.3)}
                y={y(plot.tdsLo + (plot.tdsHi - plot.tdsLo) * 0.18)}
                textAnchor="end"
                fill="#8e8e93"
                fontSize="8"
              >
                {t("extract.tea")}
              </text>
              <text
                x={x((plot.eyLo + plot.eyHi) / 2)}
                y={y(plot.tdsLo) - 4}
                textAnchor="middle"
                fill="#8e8e93"
                fontSize="8"
              >
                {t("extract.thin")}
              </text>

              <line x1={px} x2={px} y1={pad.t} y2={pad.t + plotH} stroke="#636366" strokeWidth="1" strokeDasharray="3 4" />
              <line x1={pad.l} x2={pad.l + plotW} y1={py} y2={py} stroke="#636366" strokeWidth="1" strokeDasharray="3 4" />

              {history.map((h, i) => {
                const selected =
                  compare != null && Math.abs(compare.ey - h.ey) < 0.05 && Math.abs(compare.tds - h.tds) < 0.01;
                return (
                  <circle
                    key={`${h.ey}-${h.tds}-${i}`}
                    cx={clampX(h.ey)}
                    cy={clampY(h.tds)}
                    r={selected ? 5.5 : 3.2}
                    fill={selected ? "#d1d1d6" : "#2c2c2e"}
                    stroke={selected ? "#f5f5f7" : "#8e8e93"}
                    strokeWidth={selected ? 1.6 : 1}
                  />
                );
              })}

              {ghost && (
                <g>
                  <line x1={mx} y1={my} x2={gx} y2={gy} stroke="#0a84ff" strokeWidth="1" strokeDasharray="3 4" opacity="0.55" />
                  <circle cx={gx} cy={gy} r="8" fill="none" stroke="#0a84ff" strokeWidth="1.3" strokeDasharray="3 3" />
                  <circle cx={gx} cy={gy} r="2.4" fill="#0a84ff" opacity="0.85" />
                </g>
              )}

              {drifted && <circle cx={mx} cy={my} r="3.2" fill="#ff9f0a" opacity="0.55" />}
              <circle cx={px} cy={py} r="11" fill="rgba(255,159,10,0.16)" />
              <circle cx={px} cy={py} r="8" fill="none" stroke="#f5f5f7" strokeWidth="1.6" />
              <circle cx={px} cy={py} r="3.4" fill="#ff9f0a" />
              <text x={lx} y={py - 11} textAnchor={anchor} fill="#f5f5f7" fontSize="9" fontWeight="600">
                {preview.ey.toFixed(1)}% PE · {preview.tds.toFixed(2)}%
              </text>
              <text x={lx} y={py + 16} textAnchor={anchor} fill="#aeaeb2" fontSize="8">
                {Math.round(reading.yieldG)} g · {ratioLabel}
              </text>
            </g>

            <rect x={pad.l} y={pad.t} width={plotW} height={plotH} fill="none" stroke="#38383a" strokeWidth="1" />
            <text x={pad.l + plotW / 2} y={H - 4} textAnchor="middle" fill="#8e8e93" fontSize="10">
              {t("extract.axisPE")}
            </text>
            <text
              x="12"
              y={pad.t + plotH / 2}
              textAnchor="middle"
              fill="#8e8e93"
              fontSize="10"
              transform={`rotate(-90 12 ${pad.t + plotH / 2})`}
            >
              {t("extract.axisTDS")}
            </text>
          </svg>

          <div className="mx-3 mt-1 flex flex-wrap items-center gap-2">
            <LegendDot color="#ff9f0a" label={drifted ? t("extract.whatIf") : t("extract.thisCup")} />
            {ghost && <LegendDot color="#0a84ff" dashed label={t("extract.nextGhost")} />}
            {compare && (
              <LegendDot
                color="#d1d1d6"
                label={`${t("extract.earlier")} ${compare.ey.toFixed(1)} · ${compare.tds.toFixed(2)}`}
              />
            )}
            {drifted && (
              <button type="button" className="ml-auto text-[12px] font-medium text-blue" onClick={() => setPreviewEy(null)}>
                {t("extract.reset")}
              </button>
            )}
          </div>

          <div className="mx-3 mt-2 grid grid-cols-2 gap-2 rounded-2xl bg-card2 px-3 py-3 text-center sm:grid-cols-4">
            <Stat label="PE" value={`${live.ey.toFixed(1)}%`} />
            <Stat label="TDS" value={`${live.tds.toFixed(2)}%`} />
            <Stat label={t("extract.yield")} value={`${live.yieldG.toFixed(0)} g`} />
            <Stat label={t("common.ratio")} value={ratioLabel} />
          </div>
          <p className="mx-3 mt-1 text-center text-[11px] text-muted">
            {t("extract.dose")} {recipe.coffeeG.toFixed(1)} g
          </p>
          <p className="mt-3 px-3 text-[13px] leading-relaxed text-label">
            {t(
              (live.verdict === "out"
                ? "extract.detail.out"
                : `extract.detail.${live.verdict}${live.tdsBand === "ok" ? "" : cap(live.tdsBand)}`) as MessageKey,
              {
                ey: live.ey.toFixed(1),
                tds: live.tds.toFixed(2),
                method: recipe.method,
              },
            )}
          </p>
          {live.tips.map((tip, i) => (
            <p
              key={tip.id}
              className={`px-3 leading-relaxed ${i === 0 ? "mt-1.5 text-[13px] text-white" : "mt-1 text-[12px] text-muted"}`}
            >
              {i === 0 ? `${t("extract.next")} ` : ""}
              {t(tip.id, withGrindChart(tip.vars, t))}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function LegendDot({ color, label, dashed }: { color: string; label: string; dashed?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-muted">
      <span
        className="inline-block h-2.5 w-2.5 rounded-full"
        style={{
          background: dashed ? "transparent" : color,
          boxShadow: dashed ? `inset 0 0 0 1.5px ${color}` : undefined,
        }}
      />
      {label}
    </span>
  );
}

function withGrindChart(
  vars: Record<string, string | number> | undefined,
  t: (key: MessageKey, vars?: Record<string, string | number>) => string,
) {
  if (!vars?.grind) return vars;
  return { ...vars, grind: grindLabel(String(vars.grind) as Grind, t) };
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted">{label}</div>
      <div className="mt-0.5 text-[14px] font-semibold text-white">{value}</div>
    </div>
  );
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
