import { useState, type ReactNode } from "react";
import { LocaleSwitch, useI18n } from "../i18n/LocaleContext";
import type { AppMode } from "../lib/appMode";
import { ROASTERS, roasterName, type RoasterId } from "../lib/roasters";

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

export const CupGlyph = () => (
  <>
    <path d="M5 9h11v5.5a5.5 5.5 0 01-11 0V9z" />
    <path d="M16 10.5h1.5a2.5 2.5 0 010 5H16" />
    <path d="M8 3.5c0 1.2 1 1.3 1 2.5M11.5 3.5c0 1.2 1 1.3 1 2.5" />
  </>
);

export const BeanGlyph = () => (
  <>
    <ellipse cx="12" cy="12" rx="6" ry="8.5" transform="rotate(-28 12 12)" />
    <path d="M10.6 4.3c2.6 3.5-1.9 6.2.9 9.6 2 2.5-1 4.9-.2 6" />
  </>
);

function Choice({
  icon,
  title,
  body,
  points,
  onClick,
}: {
  icon: ReactNode;
  title: string;
  body: string;
  points: string[];
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-start gap-4 rounded-3xl bg-card p-5 text-left ring-1 ring-line transition hover:ring-blue focus-visible:ring-2 focus-visible:ring-blue"
    >
      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue/15 text-blue">
        <Glyph>{icon}</Glyph>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="text-[18px] font-semibold text-white">{title}</span>
          <span className="text-[18px] text-muted transition group-hover:translate-x-0.5 group-hover:text-blue" aria-hidden="true">
            →
          </span>
        </span>
        <span className="mt-1 block text-[14px] leading-relaxed text-label">{body}</span>
        <span className="mt-3 flex flex-wrap gap-1.5">
          {points.map((p) => (
            <span key={p} className="rounded-full bg-card2 px-2.5 py-1 text-[12px] text-muted">
              {p}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}

export function Welcome({ onDone }: { onDone: (mode: AppMode, roaster?: RoasterId) => void }) {
  const { t } = useI18n();
  const [step, setStep] = useState<"mode" | "roaster">("mode");
  const [roaster, setRoaster] = useState<RoasterId>(ROASTERS[0].id);

  return (
    <div className="flex min-h-dvh flex-col bg-ink px-5 pt-[max(1rem,env(safe-area-inset-top))] pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="./icons/icon.svg" alt="" className="h-8 w-8 rounded-xl" />
          <span className="text-[17px] font-semibold">Kaffe</span>
        </div>
        <LocaleSwitch />
      </div>

      <div className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center py-8">
        {step === "mode" ? (
          <>
            <h1 className="text-[28px] font-semibold leading-tight text-white sm:text-[32px]">{t("welcome.title")}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("welcome.subtitle")}</p>
            <div className="mt-6 space-y-3">
              <Choice
                icon={<CupGlyph />}
                title={t("welcome.brew.title")}
                body={t("welcome.brew.body")}
                points={[t("welcome.brew.p1"), t("welcome.brew.p2"), t("welcome.brew.p3")]}
                onClick={() => onDone("brew")}
              />
              <Choice
                icon={<BeanGlyph />}
                title={t("welcome.roast.title")}
                body={t("welcome.roast.body")}
                points={[t("welcome.roast.p1"), t("welcome.roast.p2"), t("welcome.roast.p3")]}
                onClick={() => setStep("roaster")}
              />
            </div>
          </>
        ) : (
          <>
            <button type="button" className="mb-4 self-start text-[14px] font-medium text-blue" onClick={() => setStep("mode")}>
              ← {t("welcome.back")}
            </button>
            <h1 className="text-[28px] font-semibold leading-tight text-white">{t("welcome.roaster.title")}</h1>
            <p className="mt-2 text-[15px] leading-relaxed text-muted">{t("welcome.roaster.subtitle")}</p>
            <div className="mt-6 space-y-3" role="radiogroup" aria-label={t("welcome.roaster.title")}>
              {ROASTERS.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  role="radio"
                  aria-checked={roaster === r.id}
                  onClick={() => setRoaster(r.id)}
                  className={`flex w-full items-center gap-4 rounded-3xl bg-card p-5 text-left ring-1 ${
                    roaster === r.id ? "ring-2 ring-blue" : "ring-line"
                  }`}
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-blue/15 text-blue">
                    <Glyph>
                      <BeanGlyph />
                    </Glyph>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[18px] font-semibold text-white">{roasterName(r)}</span>
                    <span className="mt-0.5 block text-[13px] text-muted">
                      {t("welcome.roaster.spec", {
                        profile: r.profileExt,
                        log: r.logExt,
                        min: r.capacityG[0],
                        max: r.capacityG[1],
                      })}
                    </span>
                  </span>
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-bold ${
                      roaster === r.id ? "bg-blue text-white" : "bg-card2 text-transparent"
                    }`}
                    aria-hidden="true"
                  >
                    ✓
                  </span>
                </button>
              ))}
              <div className="flex w-full items-center gap-4 rounded-3xl border border-dashed border-line p-5 text-left">
                <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-card2 text-muted">+</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-semibold text-label">{t("welcome.roaster.more")}</span>
                  <span className="mt-0.5 block text-[13px] text-muted">{t("welcome.roaster.moreBody")}</span>
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onDone("roast", roaster)}
              className="mt-6 w-full rounded-2xl bg-blue px-4 py-4 text-[17px] font-semibold text-white"
            >
              {t("welcome.roaster.start")}
            </button>
          </>
        )}
        <p className="mt-6 text-center text-[12px] leading-relaxed text-muted">{t("welcome.footer")}</p>
      </div>
    </div>
  );
}
