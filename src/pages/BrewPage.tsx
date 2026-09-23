import { useEffect, useMemo, useRef, useState } from "react";
import { BrewIcon } from "../components/BrewIcon";
import BrewRecipeSheet from "../components/BrewRecipeSheet";
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
import {
  cloneFromCard,
  downloadText,
  importRecipes,
  loadMine,
  mineForMethod,
  recipeFileName,
  removeMine,
  serializePack,
  serializeRecipe,
  upsertMine,
  viewUserRecipe,
  type UserBrewRecipe,
} from "../lib/brewRecipes";
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
  const recipeFileRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [recipeError, setRecipeError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [mineItems, setMineItems] = useState<UserBrewRecipe[]>(() => loadMine());
  const [mineId, setMineId] = useState<string | undefined>();
  const [sheet, setSheet] = useState<UserBrewRecipe | null>(null);

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
    setMineId(undefined);
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
  const mine = mineItems.find((r) => r.id === mineId && r.method === method);
  const shown = mine ? viewUserRecipe(mine, kitchenM) : recipe;
  const mineOnMethod = mineForMethod(method, mineItems);
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

  async function importRecipeFile(file: File) {
    try {
      const added = importRecipes(await file.text());
      const next = loadMine();
      setMineItems(next);
      const match = added.find((r) => r.method === method) ?? added[0];
      if (match) {
        setMethod(match.method);
        setMineId(match.id);
        setTechnique(undefined);
      }
      setRecipeError(null);
    } catch (e) {
      setRecipeError(e instanceof Error ? e.message : "Could not read that recipe file");
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const files = [...e.dataTransfer.files];
    const kpro = files.find((f) => /\.kpro$/i.test(f.name));
    const json = files.find((f) => /\.json$/i.test(f.name));
    if (kpro) void importKpro(kpro);
    else if (json) void importRecipeFile(json);
    else setImportError("Drop a .kpro roast or a .json recipe.");
  }

  function openSaveSheet() {
    setSheet(cloneFromCard(recipe, `${methodInfo?.name ?? method} card`));
  }

  function saveSheet(next: UserBrewRecipe) {
    const items = upsertMine(next);
    setMineItems(items);
    setMethod(next.method);
    setMineId(next.id);
    setTechnique(undefined);
    setSheet(null);
  }

  function deleteMine(id: string) {
    const items = removeMine(id);
    setMineItems(items);
    if (mineId === id) setMineId(undefined);
    setSheet(null);
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
          Starting cards from competition, community, and academic recipes. Save a copy as Mine —
          championship cards stay as they are. Kitchen altitude caps kettle temperature; farm metres
          stay on the roast.
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
                  setMineId(undefined);
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
              {shown.boilC != null ? `${shown.boilC.toFixed(1)} °C` : "Set altitude"}
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
              value={mine ? shown.coffeeG : (dose ?? recipe.coffeeG)}
              disabled={Boolean(mine)}
              onChange={(e) => setDose(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none disabled:text-muted"
            />
          </Row>
          <Row label="Ratio (1 : )">
            <input
              type="number"
              min={method === "espresso" ? 1.5 : 6}
              max={method === "espresso" ? 18 : method === "coldbrew" ? 18 : 22}
              step={method === "espresso" ? 0.1 : 0.5}
              value={mine ? shown.ratioN : (ratio ?? recipe.ratioN)}
              disabled={Boolean(mine)}
              onChange={(e) => setRatio(e.target.value === "" ? undefined : Number(e.target.value))}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none disabled:text-muted"
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
          {mine
            ? "This is a saved card. Edit it from Mine if you want different numbers."
            : "Water and pour weights follow dose × ratio. A bigger bed usually wants a click coarser; a tighter ratio a click finer, so brew time and extraction stay in band."}
        </p>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">Mine</h3>
        {mineOnMethod.length > 0 && (
          <div className="mb-2 flex flex-wrap gap-2">
            {mineOnMethod.map((item) => {
              const on = mineId === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMineId(on ? undefined : item.id)}
                  className={`rounded-full px-3 py-1.5 text-[13px] font-semibold ${
                    on ? "bg-blue text-white" : "bg-card text-label"
                  }`}
                >
                  {item.name}
                </button>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-1">
          {!mine && (
            <button type="button" className="text-[13px] font-medium text-blue" onClick={openSaveSheet}>
              Save this card
            </button>
          )}
          {mine && (
            <>
              <button type="button" className="text-[13px] font-medium text-blue" onClick={() => setSheet(mine)}>
                Edit
              </button>
              <button
                type="button"
                className="text-[13px] font-medium text-blue"
                onClick={() => downloadText(recipeFileName(mine), serializeRecipe(mine))}
              >
                Export
              </button>
            </>
          )}
          <button type="button" className="text-[13px] font-medium text-blue" onClick={() => recipeFileRef.current?.click()}>
            Import
          </button>
          {mineItems.length > 0 && (
            <button
              type="button"
              className="text-[13px] font-medium text-blue"
              onClick={() => downloadText("kaffe-brew-recipes.json", serializePack(mineItems))}
            >
              Export all
            </button>
          )}
        </div>
        <input
          ref={recipeFileRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void importRecipeFile(file);
            e.target.value = "";
          }}
        />
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
          A copy on this device. Championship cards stay cited and read-only. Share with a .json
          file — there is no cloud.
        </p>
        {recipeError && <p className="mt-2 px-1 text-[12px] text-red">{recipeError}</p>}
      </section>

      {techniques.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            {method === "switch" ? "Switch valve" : "Competition recipe"}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {techniques.map((m) => {
              const on = !mine && recipe.technique === m.id;
              const suggested = recipe.suggestedTechnique === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => {
                    setMineId(undefined);
                    setTechnique(m.id);
                  }}
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
                  {m.origin && (
                    <p className={`mt-1.5 text-[11px] leading-snug ${on ? "text-white/70" : "text-muted"}`}>
                      {m.origin}
                    </p>
                  )}
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
              shown.bypassG
                ? `${shown.ratio} in the cup · ${shown.coffeeG} g + ${shown.waterG} g brew + ${shown.bypassG} g bypass`
                : `${shown.ratio} · ${shown.coffeeG} g : ${shown.waterG} g`
            }
          />
          <Field label="Water" value={`${shown.kettleC.toFixed(1)} °C · ${shown.kettleNote}`} />
          <Field label="Time" value={shown.timeLabel} />
          <Field label="Grind" value={shown.grindNote} />
          <Field label="Rest" value={shown.restLabel} />
          {mine?.flavor && <Field label="Flavor" value={mine.flavor} />}
          {mine?.mechanic && <Field label="How" value={mine.mechanic} />}
          {!mine && recipe.technique && techniques.length > 0 && (
            <Field
              label="Recipe"
              value={`${techniques.find((m) => m.id === recipe.technique)?.flavor ?? ""} · ${
                techniques.find((m) => m.id === recipe.technique)?.mechanic ?? recipe.technique
              }`}
            />
          )}
          {shown.origin && <Field label="Source" value={shown.origin} />}
          {shown.gaggiuino && <Field label="Gaggiuino" value={shown.gaggiuino} />}
        </Card>
        {shown.cappedByBoil && (
          <p className="mt-2 px-1 text-[12px] text-orange">
            Wanted {shown.wantedC.toFixed(0)} °C. Local boil will not reach it.
          </p>
        )}
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">Steps</h3>
          {shown.origin && (
            <span className="min-w-0 truncate text-right text-[12px] text-muted">{shown.origin}</span>
          )}
        </div>
        <Card className="divide-y divide-line">
          {shown.steps.map((step) => (
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

      {shown.warnings.length > 0 && (
        <Card className="space-y-2 p-4">
          {shown.warnings.map((w) => (
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
        {shown.why.map((line) => (
          <p key={line} className="text-[13px] leading-relaxed text-label">
            {line}
          </p>
        ))}
      </Card>

      <p className="px-1 text-[11px] leading-relaxed text-muted">{shown.sources.join(" · ")}</p>

      {sheet && (
        <BrewRecipeSheet
          draft={sheet}
          onClose={() => setSheet(null)}
          onSave={saveSheet}
          onDelete={mineItems.some((r) => r.id === sheet.id) ? deleteMine : undefined}
        />
      )}
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
