import { useI18n } from "../i18n/LocaleContext";
import type { UserBrewRecipe } from "../lib/brewRecipes";
import { recipeSummary } from "../lib/shareRecipe";

/** Shown when Kaffe opens from a shared recipe link: preview it, then add it to My recipes or skip. */
export function SharedRecipeDialog({
  recipe,
  onAdd,
  onClose,
}: {
  recipe: UserBrewRecipe | null;
  onAdd: (recipe: UserBrewRecipe) => void;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const timed = recipe?.steps.filter((s) => s.title.trim()) ?? [];
  return (
    <div className="fixed inset-0 z-[80] flex items-end justify-center sm:items-center">
      <button type="button" className="absolute inset-0 bg-black/70" onClick={onClose} aria-label={t("common.close")} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="shared-recipe-title"
        className="relative z-10 flex max-h-[88vh] w-full max-w-md flex-col rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] sm:rounded-3xl"
      >
        <div className="px-5 pt-5 pb-3">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">{t("share.incomingTitle")}</p>
          {recipe ? (
            <>
              <h2 id="shared-recipe-title" className="mt-1 text-[20px] font-semibold text-white">
                {recipe.name}
              </h2>
              <p className="mt-1 text-[13px] text-label">{recipeSummary(recipe).split(" · ").slice(1).join(" · ")}</p>
              {recipe.flavor && <p className="mt-1 text-[13px] text-label">{recipe.flavor}</p>}
              <p className="mt-1 text-[12px] text-muted">
                {[recipe.forkedFrom ?? recipe.origin, t("share.steps", { n: timed.length })].filter(Boolean).join(" · ")}
              </p>
            </>
          ) : (
            <p id="shared-recipe-title" className="mt-2 text-[14px] leading-relaxed text-orange">
              {t("share.broken")}
            </p>
          )}
        </div>
        {recipe && timed.length > 0 && (
          <ol className="min-h-0 flex-1 divide-y divide-line overflow-y-auto border-y border-line">
            {timed.map((step, i) => (
              <li key={`${i}-${step.title}`} className="flex gap-3 px-5 py-2.5">
                <span className="w-12 shrink-0 text-[12px] font-semibold text-blue">{step.at}</span>
                <span className="text-[14px] text-white">{step.title}</span>
              </li>
            ))}
          </ol>
        )}
        <div className="flex gap-2 px-5 pt-3 pb-4">
          <button type="button" className="flex-1 rounded-xl bg-card2 py-3 text-[15px] font-medium text-blue" onClick={onClose}>
            {recipe ? t("share.notNow") : t("common.close")}
          </button>
          {recipe && (
            <button
              type="button"
              className="flex-1 rounded-xl bg-blue py-3 text-[15px] font-semibold text-white"
              onClick={() => onAdd(recipe)}
            >
              {t("share.add")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
