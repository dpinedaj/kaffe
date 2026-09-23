import { useEffect, useState } from "react";
import { DraftNumber } from "./ui";
import { BREW_METHODS, type BrewMethod, type BrewStep } from "../lib/brew";
import {
  GRIND_OPTIONS,
  type UserBrewRecipe,
} from "../lib/brewRecipes";

export default function BrewRecipeSheet({
  draft,
  basedOn,
  onClose,
  onSave,
  onDelete,
}: {
  draft: UserBrewRecipe;
  basedOn?: string;
  onClose: () => void;
  onSave: (recipe: UserBrewRecipe) => void;
  onDelete?: (id: string) => void;
}) {
  const [rec, setRec] = useState(draft);
  const saved = Boolean(onDelete);

  useEffect(() => {
    setRec(draft);
  }, [draft]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function patch(partial: Partial<UserBrewRecipe>) {
    setRec((prev) => ({ ...prev, ...partial }));
  }

  function patchStep(i: number, partial: Partial<BrewStep>) {
    setRec((prev) => ({
      ...prev,
      steps: prev.steps.map((s, j) => (j === i ? { ...s, ...partial } : s)),
    }));
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close" />
      <div className="relative z-10 flex max-h-[92vh] w-full max-w-lg flex-col rounded-t-3xl bg-card sm:rounded-3xl">
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
          <div>
            <h3 className="text-[18px] font-semibold text-white">{saved ? "Edit this card" : "New recipe"}</h3>
            <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
              {saved
                ? "Changes stay on this device. Championship cards are not edited."
                : basedOn
                  ? `Based on ${basedOn}. The original stays as it is.`
                  : "A blank card on this device. Add steps, then Create."}
            </p>
          </div>
          <button type="button" className="text-[15px] font-medium text-blue" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-5 pb-4">
          <label className="block">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Name</span>
            <input
              value={rec.name}
              onChange={(e) => patch({ name: e.target.value })}
              placeholder="Name this recipe"
              className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none placeholder:text-muted"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Method</span>
              <select
                value={rec.method}
                onChange={(e) => {
                  const method = e.target.value as BrewMethod;
                  patch(method === "espresso" ? { method } : { method, gaggiuino: undefined });
                }}
                className="mt-1 w-full appearance-none rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none"
              >
                {BREW_METHODS.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Origin</span>
              <input
                value={rec.origin}
                onChange={(e) => patch({ origin: e.target.value })}
                className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none"
              />
            </label>
          </div>
          <label className="block">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Flavor (optional)</span>
            <input
              value={rec.flavor}
              onChange={(e) => patch({ flavor: e.target.value })}
              placeholder="Sweet / clear"
              className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none placeholder:text-muted"
            />
          </label>
          <label className="block">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">How (optional)</span>
            <input
              value={rec.mechanic}
              onChange={(e) => patch({ mechanic: e.target.value })}
              placeholder="Closed bloom, then open"
              className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none placeholder:text-muted"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Num label="Dose (g)" value={rec.coffeeG} onChange={(n) => patch({ coffeeG: n })} step={0.5} />
            <Num label="Ratio (1 : )" value={rec.ratioN} onChange={(n) => patch({ ratioN: n })} step={0.1} />
            <Num label="Temp (°C)" value={rec.wantedC} onChange={(n) => patch({ wantedC: n })} step={1} />
            <Num label="Time (s)" value={rec.timeS} onChange={(n) => patch({ timeS: n })} step={1} />
          </div>
          <label className="block">
            <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Grind</span>
            <select
              value={rec.grind}
              onChange={(e) => patch({ grind: e.target.value as UserBrewRecipe["grind"] })}
              className="mt-1 w-full appearance-none rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none"
            >
              {GRIND_OPTIONS.map((g) => (
                <option key={g} value={g}>
                  {g.replace("-", " ")}
                </option>
              ))}
            </select>
          </label>
          {rec.method === "espresso" && (
            <label className="block">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Gaggiuino (optional)</span>
              <input
                value={rec.gaggiuino ?? ""}
                onChange={(e) => patch({ gaggiuino: e.target.value || undefined })}
                placeholder="Adaptive for Light Roast"
                className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none placeholder:text-muted"
              />
            </label>
          )}
          {rec.forkedFrom && <p className="text-[12px] text-muted">Forked from {rec.forkedFrom}</p>}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">Steps</span>
              <button
                type="button"
                className="text-[13px] font-medium text-blue"
                onClick={() =>
                  patch({
                    steps: [...rec.steps, { at: "", title: "Step", detail: "" }],
                  })
                }
              >
                Add step
              </button>
            </div>
            <div className="space-y-2">
              {rec.steps.map((step, i) => (
                <div key={i} className="rounded-2xl bg-card2 p-3">
                  <div className="mb-2 flex gap-2">
                    <input
                      value={step.at}
                      onChange={(e) => patchStep(i, { at: e.target.value })}
                      placeholder="0:00"
                      className="w-20 bg-transparent text-[13px] font-semibold text-blue outline-none"
                    />
                    <input
                      value={step.title}
                      onChange={(e) => patchStep(i, { title: e.target.value })}
                      placeholder="Title"
                      className="min-w-0 flex-1 bg-transparent text-[14px] font-medium text-white outline-none"
                    />
                    <button
                      type="button"
                      className="text-[12px] text-muted"
                      onClick={() => patch({ steps: rec.steps.filter((_, j) => j !== i) })}
                    >
                      Remove
                    </button>
                  </div>
                  <textarea
                    value={step.detail}
                    onChange={(e) => patchStep(i, { detail: e.target.value })}
                    rows={2}
                    className="w-full resize-none bg-transparent text-[13px] leading-relaxed text-label outline-none"
                    placeholder="What to do"
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-4">
          {onDelete ? (
            <button type="button" className="text-[14px] font-medium text-orange" onClick={() => onDelete(rec.id)}>
              Delete
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className="rounded-xl px-3 py-2 text-[14px] text-muted" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="rounded-xl bg-blue px-4 py-2 text-[14px] font-semibold text-white"
              onClick={() => onSave({ ...rec, name: rec.name.trim() || "Untitled" })}
            >
              {saved ? "Save" : "Create"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Num({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: number;
  onChange: (n: number) => void;
  step: number;
}) {
  return (
    <label className="block">
      <span className="text-[12px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      <DraftNumber
        value={value}
        step={step}
        onChange={onChange}
        className="mt-1 w-full rounded-xl bg-card2 px-3 py-2 text-[15px] text-white outline-none"
      />
    </label>
  );
}
