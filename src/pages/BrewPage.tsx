import { useEffect, useMemo, useRef, useState } from "react";
import { BrewIcon } from "../components/BrewIcon";
import BrewRecipeSheet from "../components/BrewRecipeSheet";
import { Card, DraftNumber, Field, Pill, Row, Select } from "../components/ui";
import {
  BREW_METHODS,
  attachKeyOf,
  bagBrewFields,
  defaultDays,
  defaultMethod,
  leanFlavorsForVariety,
  loadBrewBag,
  loadKitchenAltitudeM,
  recommendBrew,
  saveBrewBag,
  saveKitchenAltitudeM,
  snapshotFromIntent,
  snapshotFromKpro,
  techniquesFor,
  type BrewAttach,
  type BrewBag,
  type BrewMethod,
  type BrewRoastSnapshot,
} from "../lib/brew";
import {
  blankRecipe,
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
import { useI18n } from "../i18n/LocaleContext";
import {
  defText,
  flavorLabel,
  originLabel,
  processLabel,
  restLabelFor,
  styleLabel,
  varietyLabel,
} from "../i18n/labels";
import type { MessageKey } from "../i18n/en";
import { curveName, type RoastIntent } from "../lib/generate";
import { parseKpro } from "../lib/kpro";
import {
  FLAVORS,
  ORIGINS,
  PROCESSES,
  STYLES,
  VARIETIES,
  originById,
  type FlavorId,
  type RoastStyleId,
} from "../lib/knowledge";
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
  const { t, locale } = useI18n();
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
  const [roastTab, setRoastTab] = useState<"profile" | "bag">("profile");
  const [bag, setBag] = useState<BrewBag>(() => loadBrewBag());

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

  const usingBag = roastTab === "bag";
  const style = usingBag ? bag.roastStyle : (snap?.roastStyle ?? looseStyle);
  const bagFields = bagBrewFields(bag);
  const brewInput = {
    method,
    roastStyle: style,
    drinkPlan: usingBag ? "rest" : (snap?.drinkPlan ?? "rest"),
    daysSinceRoast: days,
    kitchenAltitudeM: kitchenM,
    process: usingBag ? bag.process : snap?.process,
    flavors: usingBag ? bagFields.flavors : snap?.flavors,
    densityClass: usingBag ? bagFields.densityClass : snap?.densityClass,
    varietyName: usingBag ? bagFields.varietyName : snap?.varietyName,
    beanSize: usingBag ? bagFields.beanSize : snap?.beanSize,
    coffeeG: dose,
    ratio,
    locale,
  } as const;
  const recipe = useMemo(
    () => recommendBrew({ ...brewInput, technique }),
    [method, style, snap, days, kitchenM, dose, ratio, technique, usingBag, bag, locale],
  );
  const restShown = restLabelFor(
    locale,
    usingBag ? "rest" : (snap?.drinkPlan ?? "rest"),
    days,
    style,
  );
  const mine = mineItems.find((r) => r.id === mineId && r.method === method);
  const shown = mine ? viewUserRecipe(mine, kitchenM, locale) : recipe;
  const otherWarnings = shown.warnings.filter(
    (w) =>
      w !== recipe.restWarn &&
      w !== restShown.restWarn &&
      w !== t("brew.warnAltitude") &&
      w !== t("brew.warnSca", { boil: shown.boilC?.toFixed(1) ?? "" }) &&
      w !== t("brew.warnCapped", { wanted: shown.wantedC.toFixed(0) }),
  );
  const mineOnMethod = mineForMethod(method, mineItems);
  const techniques = techniquesFor(method, locale);
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
      setRoastTab("profile");
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

  function openBlankSheet() {
    setMineId(undefined);
    setSheet(blankRecipe(method));
  }

  function openCreateSheet(techniqueId: string) {
    const card = techniqueId !== recipe.technique
      ? recommendBrew({ ...brewInput, technique: techniqueId })
      : recipe;
    const name = techniques.find((t) => t.id === techniqueId)?.name ?? methodInfo?.name ?? method;
    setMineId(undefined);
    setTechnique(techniqueId);
    setSheet(cloneFromCard(card, t("brew.myName", { name })));
  }

  function saveSheet(next: UserBrewRecipe) {
    const items = upsertMine(next);
    setMineItems(items);
    setMethod(next.method);
    setMineId(next.id);
    setTechnique(undefined);
    setSheet(null);
  }

  function patchBag(partial: Partial<BrewBag>) {
    const next = { ...bag, ...partial };
    setBag(next);
    saveBrewBag(next);
    setTechnique(undefined);
  }

  function toggleBagFlavor(id: FlavorId) {
    const has = bag.flavors.includes(id);
    const flavors = has ? bag.flavors.filter((f) => f !== id) : [...bag.flavors, id].slice(-2);
    patchBag({ flavors });
  }

  function setBagOrigin(id: string) {
    if (!id) {
      patchBag({ originId: undefined });
      return;
    }
    const origin = originById(id);
    const varietyId = origin.suggestedVarietyId ?? "unknown";
    patchBag({
      originId: id,
      process: origin.typicalProcess,
      farmAltitudeM: origin.typicalAltitude,
      varietyId,
      flavors: leanFlavorsForVariety(varietyId),
    });
  }

  function setBagVariety(id: string) {
    patchBag({
      varietyId: id,
      flavors: leanFlavorsForVariety(id),
    });
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
          <h2 className="text-[22px] font-semibold">{t("brew.title")}</h2>
        </div>
        <p className="mt-1 text-[13px] leading-relaxed text-muted">{t("brew.intro")}</p>
      </div>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.brewer")}</h3>
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
        {methodInfo && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
            {defText(`methodBlurb.${methodInfo.id}` as MessageKey, t, methodInfo.blurb)}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.roast")}</h3>
        <div className="mb-2 flex rounded-lg bg-card2 p-0.5">
          {(
            [
              ["profile", t("brew.profile")],
              ["bag", t("brew.thisBag")],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              className={`flex-1 rounded-md px-3 py-2 text-[13px] font-semibold ${
                roastTab === id ? "bg-blue text-white" : "text-muted"
              }`}
              onClick={() => {
                setRoastTab(id);
                setTechnique(undefined);
              }}
            >
              {label}
            </button>
          ))}
        </div>
        {roastTab === "profile" ? (
          <>
            <Card>
              <Row label={t("brew.attached")}>
                <select
                  value={selectValue}
                  onChange={(e) => setAttach(parseAttach(e.target.value, attach))}
                  className="w-full max-w-none appearance-none bg-transparent text-left text-[15px] font-medium text-blue outline-none sm:max-w-[240px] sm:text-right"
                >
                  <option value="generate">{t("brew.currentGenerate")}</option>
                  <option value="none">{t("brew.noRoast")}</option>
                  {attach.kind === "kpro" && <option value="kpro">{snap?.label ?? t("brew.importedKpro")}</option>}
                  {library.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.curveName}
                    </option>
                  ))}
                </select>
              </Row>
              <Row label={t("brew.name")}>
                <span className="text-[15px] text-white">{snap?.label ?? t("common.none")}</span>
              </Row>
              {snap ? (
                <Row label={t("brew.plannedAs")} last={!snap.flavors.length}>
                  <span className="text-[15px] text-white">
                    {styleLabel(snap.roastStyle, t)}
                    {snap.level != null ? ` L${snap.level.toFixed(1)}` : ""} · {cap(snap.drinkPlan)} ·{" "}
                    {cap(snap.brew)}
                    {snap.varietyName ? ` · ${snap.varietyName}` : ""}
                  </span>
                </Row>
              ) : (
                <Row label={t("studio.roastStyle")} last>
                  <div className="flex w-full rounded-lg bg-card2 p-0.5 sm:w-auto">
                    {STYLES.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold sm:flex-none ${
                          looseStyle === s.id ? "bg-blue text-white" : "text-muted"
                        }`}
                        onClick={() => setLooseStyle(s.id)}
                      >
                        {styleLabel(s.id, t)}
                      </button>
                    ))}
                  </div>
                </Row>
              )}
              {snap != null && snap.flavors.length > 0 && (
                <Row label={t("brew.flavorGoal")} last>
                  <span className="text-[15px] text-white">
                    {snap.flavors.map((id) => flavorLabel(id, t)).join(" · ")}
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
              <div className="text-[13px] font-medium text-white">{t("brew.dropKpro")}</div>
              <div className="mt-0.5 text-[12px] text-muted">{t("brew.orImport")}</div>
            </label>
            {importError && <p className="mt-2 px-1 text-[12px] text-red">{importError}</p>}
          </>
        ) : (
          <>
            <Card>
              <Row label={t("brew.roast")}>
                <div className="flex w-full rounded-lg bg-card2 p-0.5 sm:w-auto">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      className={`flex-1 rounded-md px-2.5 py-1.5 text-[12px] font-semibold sm:flex-none ${
                        bag.roastStyle === s.id ? "bg-blue text-white" : "text-muted"
                      }`}
                      onClick={() => patchBag({ roastStyle: s.id })}
                    >
                      {styleLabel(s.id, t)}
                    </button>
                  ))}
                </div>
              </Row>
              <Row label={t("studio.origin")}>
                <Select value={bag.originId ?? ""} onChange={setBagOrigin}>
                  <option value="">{t("origin.unknown")}</option>
                  {ORIGINS.map((o) => (
                    <option key={o.id} value={o.id}>
                      {originLabel(o.id, t, o.name)}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label={t("studio.variety")}>
                <Select value={bag.varietyId ?? "unknown"} onChange={setBagVariety}>
                  {VARIETIES.map((v) => (
                    <option key={v.id} value={v.id}>
                      {varietyLabel(v.id, t, v.name)}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label={t("studio.process")}>
                <Select
                  value={bag.process}
                  onChange={(id) => patchBag({ process: id as BrewBag["process"] })}
                >
                  {PROCESSES.map((p) => (
                    <option key={p.id} value={p.id}>
                      {processLabel(p.id, t)}
                    </option>
                  ))}
                </Select>
              </Row>
              <Row label={t("brew.farmM")} last>
                <input
                  type="number"
                  min={0}
                  max={4500}
                  step={50}
                  placeholder={t("brew.altPh", { m: 1800 })}
                  value={bag.farmAltitudeM ?? ""}
                  onChange={(e) => {
                    if (e.target.value === "") {
                      patchBag({ farmAltitudeM: undefined });
                      return;
                    }
                    const n = Number(e.target.value);
                    if (Number.isFinite(n)) patchBag({ farmAltitudeM: Math.max(0, Math.min(4500, n)) });
                  }}
                  className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
                />
              </Row>
            </Card>
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between px-1">
                <h4 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.iWant")}</h4>
                <span className="rounded-full bg-card2 px-2 py-0.5 text-[11px] text-muted">
                  {bag.flavors.length}/2
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {FLAVORS.map((f) => {
                  const idx = bag.flavors.indexOf(f.id);
                  const selected = idx >= 0;
                  return (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => toggleBagFlavor(f.id)}
                      className={`relative rounded-2xl bg-card p-3 text-left ${
                        selected ? "ring-2 ring-blue" : ""
                      }`}
                    >
                      {selected && (
                        <span className="absolute top-2 right-2 flex h-5 w-5 items-center justify-center rounded-full bg-blue text-[11px] font-bold text-white">
                          {idx + 1}
                        </span>
                      )}
                      <div className="text-xl">{f.icon}</div>
                      <div className="mt-1 text-[13px] font-semibold">{flavorLabel(f.id, t)}</div>
                    </button>
                  );
                })}
              </div>
            </div>
            <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{t("brew.bagHelp")}</p>
          </>
        )}
        <Card className="mt-2">
          <Row label={t("brew.days")} last>
            <DraftNumber
              value={days}
              step={1}
              onChange={(n) => setDays(Math.max(0, Math.min(60, n)))}
              className="w-16 bg-transparent text-right text-[15px] text-white outline-none"
            />
          </Row>
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{restShown.restLabel}</p>
        {restShown.restWarn && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-orange">{restShown.restWarn}</p>
        )}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.mine")}</h3>
        {mineOnMethod.length > 0 && (
          <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {mineOnMethod.map((item) => {
              const on = mineId === item.id;
              return (
                <div
                  key={item.id}
                  className={`rounded-2xl px-3 py-3 ${on ? "bg-blue text-white" : "bg-card text-label"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => setMineId(on ? undefined : item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="text-[14px] font-semibold">{item.name}</div>
                      {item.flavor && (
                        <p className={`mt-1 text-[12px] leading-snug ${on ? "text-white" : "text-label"}`}>
                          {item.flavor}
                        </p>
                      )}
                      <p className={`mt-0.5 text-[12px] leading-snug ${on ? "text-white/70" : "text-muted"}`}>
                        {item.origin}
                      </p>
                    </button>
                    <div className="flex shrink-0 items-center gap-3">
                      <button
                        type="button"
                        className={`text-[12px] font-semibold ${on ? "text-white" : "text-blue"}`}
                        onClick={() => {
                          setMineId(item.id);
                          setSheet(item);
                        }}
                      >
                        {t("common.edit")}
                      </button>
                      <button
                        type="button"
                        className={`text-[12px] font-semibold ${on ? "text-white/80" : "text-orange"}`}
                        onClick={() => deleteMine(item.id)}
                      >
                        {t("common.delete")}
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2 px-1">
          <button type="button" className="rounded-lg bg-card px-3 py-2 text-[13px] font-medium text-blue" onClick={openBlankSheet}>
            {t("brew.newRecipe")}
          </button>
          <button type="button" className="rounded-lg bg-card px-3 py-2 text-[13px] font-medium text-blue" onClick={() => recipeFileRef.current?.click()}>
            {t("common.import")}
          </button>
          {mine && (
            <button
              type="button"
              className="rounded-lg bg-card px-3 py-2 text-[13px] font-medium text-blue"
              onClick={() => downloadText(recipeFileName(mine), serializeRecipe(mine))}
            >
              {t("common.export")}
            </button>
          )}
          {mineItems.length > 0 && (
            <button
              type="button"
              className="rounded-lg bg-card px-3 py-2 text-[13px] font-medium text-blue"
              onClick={() => downloadText("kaffe-brew-recipes.json", serializePack(mineItems))}
            >
              {t("brew.exportAll")}
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
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{t("brew.mineHelp")}</p>
        {recipeError && <p className="mt-2 px-1 text-[12px] text-red">{recipeError}</p>}
      </section>

      {techniques.length > 0 && (
        <section>
          <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
            {method === "switch" ? t("brew.switchValve") : t("brew.compRecipe")}
          </h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {techniques.map((m) => {
              const on = !mine && recipe.technique === m.id;
              const suggested = recipe.suggestedTechnique === m.id;
              return (
                <div
                  key={m.id}
                  className={`rounded-2xl px-3 py-3 ${on ? "bg-blue text-white" : "bg-card text-label"}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setMineId(undefined);
                        setTechnique(m.id);
                      }}
                      className="min-w-0 flex-1 text-left"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[14px] font-semibold">{m.name}</span>
                        {suggested && (
                          <span
                            className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                              on ? "bg-white/20 text-white" : "bg-orange/15 text-orange"
                            }`}
                          >
                            {t("common.suggested")}
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
                    <button
                      type="button"
                      className={`shrink-0 text-[12px] font-semibold ${on ? "text-white" : "text-blue"}`}
                      onClick={() => openCreateSheet(m.id)}
                    >
                      {t("common.edit")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
            {techniques.length > 1 ? t("brew.compHelpMany") : t("brew.compHelpOne")}
          </p>
        </section>
      )}

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.kitchen")}</h3>
        <Card>
          <Row label={t("studio.altitude")}>
            <input
              type="number"
              min={0}
              max={4500}
              step={50}
              placeholder={t("brew.altPh", { m: 1500 })}
              value={kitchenM ?? ""}
              onChange={(e) => patchKitchen(e.target.value)}
              className="w-24 bg-transparent text-right text-[15px] text-white outline-none placeholder:text-muted"
            />
          </Row>
          <Row label={t("brew.localBoil")} last={!snap?.farmAltitudeM}>
            <span className="text-[15px] text-white">
              {shown.boilC != null ? `${shown.boilC.toFixed(1)} °C` : t("brew.setAltitude")}
            </span>
          </Row>
          {snap?.farmAltitudeM != null && (
            <Row label={t("brew.sameLot")} last>
              <button
                type="button"
                className="text-[15px] font-medium text-blue"
                onClick={() => patchKitchen(String(snap.farmAltitudeM))}
              >
                {t("brew.useM", { m: snap.farmAltitudeM })}
              </button>
            </Row>
          )}
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">{t("brew.kitchenHelp")}</p>
        {shown.boilC == null && method !== "espresso" && method !== "coldbrew" && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-orange">{t("brew.warnAltitude")}</p>
        )}
        {shown.boilC != null && shown.boilC < 92 && method !== "espresso" && method !== "coldbrew" && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-orange">
            {t("brew.warnSca", { boil: shown.boilC.toFixed(1) })}
          </p>
        )}
        {shown.cappedByBoil && (
          <p className="mt-2 px-1 text-[12px] leading-relaxed text-orange">
            {t("brew.warnCapped", { wanted: shown.wantedC.toFixed(0) })}
          </p>
        )}
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.cup")}</h3>
        <Card>
          <Row label={t("brew.dose")}>
            <DraftNumber
              key={`${method}-dose`}
              value={mine ? shown.coffeeG : (dose ?? recipe.coffeeG)}
              disabled={Boolean(mine)}
              step={0.5}
              onChange={setDose}
              onEmpty={() => setDose(undefined)}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none disabled:text-muted"
            />
          </Row>
          <Row label={t("brew.ratio")} last>
            <DraftNumber
              key={`${method}-ratio`}
              value={mine ? shown.ratioN : (ratio ?? recipe.ratioN)}
              disabled={Boolean(mine)}
              step={method === "espresso" ? 0.1 : 0.5}
              onChange={setRatio}
              onEmpty={() => setRatio(undefined)}
              className="w-20 bg-transparent text-right text-[15px] text-white outline-none disabled:text-muted"
            />
          </Row>
        </Card>
        <p className="mt-2 px-1 text-[12px] leading-relaxed text-muted">
          {mine ? t("brew.cupMine") : t("brew.cupHelp")}
        </p>
      </section>

      <section>
        <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.startingCard")}</h3>
        <Card>
          <Field
            label={t("common.ratio")}
            value={
              shown.bypassG
                ? t("brew.ratioCup", {
                    ratio: shown.ratio,
                    coffee: shown.coffeeG,
                    water: shown.waterG,
                    bypass: shown.bypassG,
                  })
                : t("brew.ratioPlain", {
                    ratio: shown.ratio,
                    coffee: shown.coffeeG,
                    water: shown.waterG,
                  })
            }
          />
          <Field label={t("common.water")} value={`${shown.kettleC.toFixed(1)} °C · ${shown.kettleNote}`} />
          <Field label={t("common.time")} value={shown.timeLabel} />
          <Field label={t("common.grind")} value={shown.grindNote} />
          <Field label={t("common.rest")} value={restShown.restLabel} />
          {mine?.flavor && <Field label={t("common.flavor")} value={mine.flavor} />}
          {mine?.mechanic && <Field label={t("common.how")} value={mine.mechanic} />}
          {!mine && recipe.technique && techniques.length > 0 && (
            <Field
              label={t("common.recipe")}
              value={`${techniques.find((m) => m.id === recipe.technique)?.flavor ?? ""} · ${
                techniques.find((m) => m.id === recipe.technique)?.mechanic ?? recipe.technique
              }`}
            />
          )}
          {shown.origin && <Field label={t("common.source")} value={shown.origin} />}
          {shown.gaggiuino && <Field label="Gaggiuino" value={shown.gaggiuino} />}
        </Card>
      </section>

      <section>
        <div className="mb-2 flex items-baseline justify-between gap-3 px-1">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t("brew.steps")}</h3>
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

      {otherWarnings.length > 0 && (
        <Card className="space-y-2 p-4">
          {otherWarnings.map((w) => (
            <p key={w} className="text-[13px] leading-relaxed text-orange">
              {w}
            </p>
          ))}
        </Card>
      )}

      <Card className="space-y-2 p-4">
        <div className="flex items-center justify-between">
          <h3 className="text-[13px] font-semibold uppercase tracking-wide text-muted">{t("common.why")}</h3>
          <Pill tone="orange">{t("common.notALock")}</Pill>
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
          basedOn={sheet.forkedFrom}
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
