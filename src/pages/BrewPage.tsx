import { useEffect, useMemo, useRef, useState } from "react";
import { BrewIcon } from "../components/BrewIcon";
import { Card, Field, Pill, Row } from "../components/ui";
import {
  BREW_METHODS,
  attachKeyOf,
  defaultDays,
  defaultMethod,
  loadKitchenAltitudeM,
  recommendBrew,
  saveKitchenAltitudeM,
  snapshotFromIntent,
  snapshotFromKpro,
  techniquesFor,
  type BrewAttach,
  type BrewMethod,
  type BrewRoastSnapshot,
} from "../lib/brew";
import { curveName, type RoastIntent } from "../lib/generate";
import { parseKpro } from "../lib/kpro";
import { STYLES, type RoastStyleId } from "../lib/knowledge";
import type { SavedProfile } from "../lib/storage";

export default function BrewPage({
  attach,
  setAttach,
  studioIntent,
  library,
}: {
  attach: BrewAttach;
  setAttach: (next: BrewAttach) => void;
  studioIntent: RoastIntent;
  library: SavedProfile[];
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const studioSnap = useMemo(
    () => snapshotFromIntent(studioIntent, curveName(studioIntent)),
    [studioIntent],
  );
  const snap = resolveSnap(attach, studioSnap, library);

  const [kitchenM, setKitchenM] = useState<number | undefined>(() => loadKitchenAltitudeM());
  const [method, setMethod] = useState<BrewMethod>(() => defaultMethod(snap?.brew ?? "filter"));
  const [days, setDays] = useState(() => defaultDays(snap?.drinkPlan ?? "rest"));
  const [looseStyle, setLooseStyle] = useState<RoastStyleId>(snap?.roastStyle ?? "light");
  const [dose, setDose] = useState<number | undefined>();
  const [ratio, setRatio] = useState<number | undefined>();
  const [technique, setTechnique] = useState<string | undefined>();

  const attachKey = attachKeyOf(attach);
  useEffect(() => {
    const next = resolveSnap(attach, studioSnap, library);
    setMethod(defaultMethod(next?.brew ?? "filter"));
    setDays(defaultDays(next?.drinkPlan ?? "rest"));
    setLooseStyle(next?.roastStyle ?? "light");
    setDose(undefined);
    setRatio(undefined);
    setTechnique(undefined);
  }, [attachKey, attach, studioSnap, library]);

  const style = snap?.roastStyle ?? looseStyle;
  const recipe = useMemo(
    () =>
      recommendBrew({
        method,
        roastStyle: style,
        drinkPlan: snap?.drinkPlan ?? "rest",
        daysSinceRoast: days,
        kitchenAltitudeM: kitchenM,
        process: snap?.process,
        flavors: snap?.flavors,
        densityClass: snap?.densityClass,
        varietyName: snap?.varietyName,
        beanSize: snap?.beanSize,
        coffeeG: dose,
        ratio,
        technique,
      }),
    [method, style, snap, days, kitchenM, dose, ratio, technique],
  );
  const techniques = techniquesFor(method);
  const methodInfo = BREW_METHODS.find((m) => m.id === method);

  function patchKitchen(raw: string) {
    if (raw === "") {
      setKitchenM(undefined);
      saveKitchenAltitudeM(undefined);
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) return;
    const next = Math.max(0, Math.min(4500, n));
    setKitchenM(next);
    saveKitchenAltitudeM(next);
  }

  async function importKpro(file: File) {
    try {
      const text = await file.text();
      const profile = parseKpro(text, file.name);
      setAttach({ kind: "kpro", snapshot: snapshotFromKpro(profile) });
      setImportError(null);
    } catch (e) {
      setImportError(e instanceof Error ? e.message : "Could not read that .kpro");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = [...e.dataTransfer.files].find((f) => /\.kpro$/i.test(f.name));
    if (file) void importKpro(file);
    else setImportError("Drop a .kpro file.");
  }

  const selectValue = attach.kind === "library" ? attach.id : attach.kind;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 p-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-[22px] font-semibold">Brew</h2>
          <span className="rounded-full bg-card2 px-2 py-0.5 text-[11px] font-semibold text-orange">Preview</span>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">
          Starting cards from competition, community, and academic recipes. Taste is last. Kitchen
          altitude caps kettle temperature; farm metres stay on the roast.
        </p>
      </div>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Brewer</h3>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {BREW_METHODS.map((m) => {
            const on = method === m.id;
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setMethod(m.id);
                  setDose(undefined);
                  setRatio(undefined);
                  setTechnique(undefined);
                }}
                className={`flex flex-col items-center gap-1.5 rounded-2xl px-2 py-3 ${
                  on ? "bg-card2 text-white ring-1 ring-blue" : "bg-card text-muted"
                }`}
              >
                <BrewIcon id={m.id} className={`h-10 w-10 ${on ? "text-blue" : "text-label"}`} />
                <span className="text-center text-[11px] font-semibold leading-tight">{m.name}</span>
              </button>
            );
          })}
        </div>
        {methodInfo && <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{methodInfo.blurb}</p>}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Roast</h3>
        <Card>
          <Row label="Attached">
            <select
              value={selectValue}
              onChange={(e) => setAttach(parseAttach(e.target.value, attach))}
              className="max-w-[240px] appearance-none bg-transparent text-right text-[15px] font-medium text-blue outline-none"
            >
              <option value="generate">Current Generate roast</option>
              <option value="none">No roast — style only</option>
              {attach.kind === "kpro" && <option value="kpro">{snap?.label ?? "Imported .kpro"}</option>}
              {library.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.curveName}
                </option>
              ))}
            </select>
          </Row>
          <Row label="Name">
            <span className="text-[15px] text-white">{snap?.label ?? "None"}</span>
          </Row>
          {snap ? (
            <Row label="Planned as" last={!snap.flavors.length}>
              <span className="text-[15px] text-white">
                {cap(snap.roastStyle)}
                {snap.level != null ? ` L${snap.level.toFixed(1)}` : ""} · {cap(snap.drinkPlan)} ·{" "}
                {cap(snap.brew)}
                {snap.varietyName ? ` · ${snap.varietyName}` : ""}
              </span>
            </Row>
          ) : (
            <Row label="Roast style" last>
              <div className="flex rounded-lg bg-card2 p-0.5">
                {STYLES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    className={`rounded-md px-2.5 py-1 text-[12px] font-semibold ${
                      looseStyle === s.id ? "bg-blue text-white" : "text-muted"
                    }`}
                    onClick={() => setLooseStyle(s.id)}
                  >
                    {s.name}
                  </button>
                ))}
              </div>
            </Row>
          )}
          {snap != null && snap.flavors.length > 0 && (
            <Row label="Flavor goal" last>
              <span className="text-[15px] text-white">
                {snap.flavors.map((id) => id.replace(/([A-Z])/g, " $1")).join(" · ")}
              </span>
            </Row>
          )}
        </Card>
        <label
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`mt-2 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed px-4 py-5 text-center ${
            dragging ? "border-blue bg-card2" : "border-line bg-card"
          }`}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".kpro"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void importKpro(file);
              e.target.value = "";
            }}
          />
          <div className="text-[13px] font-medium text-white">Drop a .kpro here</div>
          <div className="mt-0.5 text-[12px] text-muted">or click to import a roast file</div>
        </label>
        {importError && <p className="mt-2 px-1 text-[12px] text-red">{importError}</p>}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Kitchen</h3>
        <Card>
          <Row label="Altitude (m)">
            <input
              type="number"
              min={0}
              max={4500}
              step={50}
              placeholder="e.g. 1500"
              value={kitchenM ?? ""}
              onChange={(e) => patchKitchen(e.target.value)}
              className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
            />
          </Row>
          <Row label="Local boil" last={!snap?.farmAltitudeM}>
            <span className="text-[15px] text-white">
              {recipe.boilC != null ? `${recipe.boilC.toFixed(1)} °C` : "Set altitude"}
            </span>
          </Row>
          {snap?.farmAltitudeM != null && (
            <Row label="Same as this lot" last>
              <button
                type="button"
                className="text-[15px] font-medium text-blue"
                onClick={() => patchKitchen(String(snap.farmAltitudeM))}
              >
                Use {snap.farmAltitudeM} m
              </button>
            </Row>
          )}
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
          This is where you brew, not where the cherry grew. Saved on this device; it does not
          change the .kpro.
        </p>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Cup</h3>
        <Card>
          <Row label="Dose (g)">
            <input
              type="number"
              min={5}
              max={80}
              step={0.5}
              value={dose ?? recipe.coffeeG}
              onChange={(e) => setDose(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none"
            />
          </Row>
          <Row label="Ratio (1 : )">
            <input
              type="number"
              min={method === "espresso" ? 1.5 : 6}
              max={method === "espresso" ? 18 : method === "coldbrew" ? 18 : 22}
              step={method === "espresso" ? 0.1 : 0.5}
              value={ratio ?? recipe.ratioN}
              onChange={(e) => setRatio(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none"
            />
          </Row>
          <Row label="Days since roast" last>
            <input
              type="number"
              min={0}
              max={60}
              step={1}
              value={days}
              onChange={(e) => setDays(Math.max(0, Math.min(60, Number(e.target.value) || 0)))}
              className="w-16 bg-transparent text-right text-[15px] text-white outline-none"
            />
          </Row>
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
          Water and pour weights follow dose × ratio. A bigger bed usually wants a click coarser; a
          tighter ratio a click finer, so brew time and extraction stay in band.
        </p>
      </section>

      {techniques.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            {method === "switch" ? "Switch valve" : "Competition recipe"}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {techniques.map((m) => {
              const on = recipe.technique === m.id;
              const suggested = recipe.suggestedTechnique === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setTechnique(m.id)}
                  className={`rounded-2xl px-3 py-3 text-left ${
                    on ? "bg-blue text-white" : "bg-card text-label"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-[14px] font-semibold">{m.name}</span>
                    {suggested && (
                      <span
                        className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                          on ? "bg-white/20 text-white" : "bg-orange/15 text-orange"
                        }`}
                      >
                        Suggested
                      </span>
                    )}
                  </div>
                  <p className={`mt-1 text-[12px] font-medium leading-snug ${on ? "text-white" : "text-label"}`}>
                    {m.flavor}
                  </p>
                  <p className={`mt-0.5 text-[12px] leading-snug ${on ? "text-white/80" : "text-muted"}`}>
                    {m.mechanic}
                  </p>
                </button>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
            Named championship or shop scripts that aim at a flavor. The orange tag is the pick for
            this roast; tap another to override.
          </p>
        </section>
      )}

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Starting card</h3>
        <Card>
          <Field
            label="Ratio"
            value={
              recipe.bypassG
                ? `${recipe.ratio} in the cup · ${recipe.coffeeG} g + ${recipe.waterG} g brew + ${recipe.bypassG} g bypass`
                : `${recipe.ratio} · ${recipe.coffeeG} g : ${recipe.waterG} g`
            }
          />
          <Field label="Water" value={`${recipe.kettleC.toFixed(1)} °C · ${recipe.kettleNote}`} />
          <Field label="Time" value={recipe.timeLabel} />
          <Field label="Grind" value={recipe.grindNote} />
          <Field label="Rest" value={recipe.restLabel} />
          {recipe.technique && techniques.length > 0 && (
            <Field
              label="Recipe"
              value={`${techniques.find((m) => m.id === recipe.technique)?.flavor ?? ""} · ${
                techniques.find((m) => m.id === recipe.technique)?.mechanic ?? recipe.technique
              }`}
            />
          )}
          {recipe.gaggiuino && <Field label="Gaggiuino" value={recipe.gaggiuino} />}
        </Card>
        {recipe.cappedByBoil && (
          <p className="mt-2 px-1 text-[12px] text-orange">
            Wanted {recipe.wantedC.toFixed(0)} °C. Local boil will not reach it.
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Steps</h3>
        <Card className="divide-y divide-line">
          {recipe.steps.map((step) => (
            <div key={`${step.at}-${step.title}`} className="flex gap-3 px-4 py-3">
              <div className="w-16 shrink-0 text-[12px] font-semibold text-blue">{step.at}</div>
              <div>
                <div className="text-[15px] font-medium text-white">{step.title}</div>
                <p className="mt-0.5 text-[13px] leading-relaxed text-label">{step.detail}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      {recipe.warnings.length > 0 && (
        <Card className="space-y-2 p-4">
          {recipe.warnings.map((w) => (
            <p key={w} className="text-[13px] leading-relaxed text-orange">
              {w}
            </p>
          ))}
        </Card>
      )}

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Why</h3>
          <Pill tone="orange">Not a lock</Pill>
        </div>
        {recipe.why.map((line) => (
          <p key={line} className="text-[13px] leading-relaxed text-label">
            {line}
          </p>
        ))}
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-muted">{recipe.sources.join(" · ")}</p>
    </div>
  );
}

function resolveSnap(
  attach: BrewAttach,
  studioSnap: BrewRoastSnapshot,
  library: SavedProfile[],
): BrewRoastSnapshot | null {
  if (attach.kind === "none") return null;
  if (attach.kind === "generate") return studioSnap;
  if (attach.kind === "kpro") return attach.snapshot;
  const item = library.find((p) => p.id === attach.id);
  if (!item) return null;
  return snapshotFromIntent(item.intent, item.curveName);
}

function parseAttach(value: string, current: BrewAttach): BrewAttach {
  if (value === "generate") return { kind: "generate" };
  if (value === "none") return { kind: "none" };
  if (value === "kpro" && current.kind === "kpro") return current;
  return { kind: "library", id: value };
}

function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
