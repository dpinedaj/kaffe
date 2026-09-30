import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/LocaleContext";
import { SCIENCE, type ScienceTopic } from "../science/content";

/** `**bold**` is the only markup the curated text uses. */
function rich(text: string): ReactNode {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 ? (
      <strong key={i} className="font-semibold text-white">
        {part}
      </strong>
    ) : (
      <Fragment key={i}>{part}</Fragment>
    ),
  );
}

export function SciencePage({
  topic: initialTopic,
  section,
  onClose,
}: {
  topic: ScienceTopic;
  section?: string;
  onClose: () => void;
}) {
  const { t, locale } = useI18n();
  const [topic, setTopic] = useState<ScienceTopic>(initialTopic);
  const scroller = useRef<HTMLDivElement>(null);
  const tab = SCIENCE[locale][topic];

  /** Reference number = position across the tab’s groups, the same order they print in. */
  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    tab.groups.forEach((g) => g.refs.forEach((r) => map.set(r.id, map.size + 1)));
    return map;
  }, [tab]);

  const jump = (id: string) =>
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  useEffect(() => {
    if (section) requestAnimationFrame(() => document.getElementById(`sci-${section}`)?.scrollIntoView({ block: "start" }));
  }, [section]);

  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
  }, [topic]);

  // The phone’s Back gesture closes the page instead of leaving Kaffe.
  useEffect(() => {
    window.history.pushState({ kaffeScience: true }, "");
    const onPop = () => onClose();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && window.history.back();
    window.addEventListener("popstate", onPop);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("popstate", onPop);
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={t("science.title")} className="fixed inset-0 z-50 flex flex-col bg-ink">
      <div className="border-b border-line px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          <h1 className="text-[18px] font-semibold text-white">{t("science.title")}</h1>
          <button type="button" onClick={() => window.history.back()} className="text-[15px] font-medium text-blue">
            {t("common.close")}
          </button>
        </div>
        <div className="mx-auto mt-3 grid max-w-2xl grid-cols-2 rounded-xl bg-card p-1" role="tablist">
          {(["brew", "roast"] as const).map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={topic === id}
              onClick={() => setTopic(id)}
              className={`rounded-lg px-3 py-2 text-[14px] font-semibold ${topic === id ? "bg-card2 text-white" : "text-muted"}`}
            >
              {t(id === "brew" ? "mode.brew" : "mode.roast")}
            </button>
          ))}
        </div>
      </div>

      <div ref={scroller} className="flex-1 overflow-y-auto overscroll-contain px-4 pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto max-w-2xl">
          <p className="mt-5 text-[15px] leading-relaxed text-label">{rich(tab.intro)}</p>

          <nav className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0" aria-label={t("science.contents")}>
            {tab.sections.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => jump(`sci-${s.id}`)}
                className="shrink-0 whitespace-nowrap rounded-full bg-card px-3 py-1.5 text-[13px] text-label ring-1 ring-line"
              >
                {s.title}
              </button>
            ))}
          </nav>

          <div className="mt-5 space-y-3">
            {tab.sections.map((s) => (
              <section key={s.id} id={`sci-${s.id}`} className="scroll-mt-4 rounded-2xl bg-card p-4 ring-1 ring-line">
                <h2 className="text-[17px] font-semibold text-white">{s.title}</h2>
                {s.body.map((p, i) => (
                  <p key={i} className="mt-2 text-[14px] leading-relaxed text-label">
                    {rich(p)}
                  </p>
                ))}
                {s.refs.length > 0 && (
                  <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[12px] text-muted">
                    <span>{t("science.sources")}</span>
                    {s.refs.map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() => jump(`ref-${id}`)}
                        className="rounded-md bg-card2 px-1.5 py-0.5 font-semibold text-blue"
                      >
                        {numbers.get(id)}
                      </button>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>

          {tab.limits.length > 0 && (
            <section className="mt-6">
              <h2 className="text-[15px] font-semibold text-white">{t("science.limits")}</h2>
              <ul className="mt-2 list-disc space-y-1.5 pl-5 text-[14px] leading-relaxed text-label">
                {tab.limits.map((l) => (
                  <li key={l}>{rich(l)}</li>
                ))}
              </ul>
            </section>
          )}

          <section className="mt-6">
            <h2 className="text-[15px] font-semibold text-white">{t("science.references")}</h2>
            {tab.groups.map((g) => (
              <div key={g.title} className="mt-3">
                <h3 className="text-[11px] font-semibold uppercase tracking-wide text-muted">{g.title}</h3>
                <ol className="mt-1.5 space-y-2">
                  {g.refs.map((r) => (
                    <li key={r.id} id={`ref-${r.id}`} className="flex scroll-mt-4 gap-2 text-[13px] leading-relaxed text-label">
                      <span className="w-6 shrink-0 text-right font-semibold text-muted">{numbers.get(r.id)}.</span>
                      <span className="min-w-0 break-words">
                        {r.text}
                        {r.url && (
                          <>
                            {" "}
                            <a href={r.url} target="_blank" rel="noreferrer" className="break-all text-blue">
                              {t("science.open")} ↗
                            </a>
                          </>
                        )}
                      </span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </section>

        </div>
      </div>
    </div>,
    document.body,
  );
}
