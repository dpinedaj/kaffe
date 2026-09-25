import { useEffect, useMemo, useRef, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";
import {
  GRINDERS,
  grindersByBrand,
  grinderById,
  searchGrinders,
} from "../lib/grinders";

export function GrinderPicker({
  value,
  onChange,
}: {
  value?: string;
  onChange: (id: string | undefined) => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const selected = grinderById(value);
  const query = q.trim();
  const hits = useMemo(() => searchGrinders(query), [query]);
  const groups = useMemo(() => {
    if (query) return [];
    return grindersByBrand();
  }, [query]);

  useEffect(() => {
    if (!open) return;
    const id = window.setTimeout(() => inputRef.current?.focus(), 40);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.clearTimeout(id);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function pick(id: string | undefined) {
    onChange(id);
    setOpen(false);
    setQ("");
  }

  return (
    <>
      <button
        type="button"
        className="w-full max-w-none text-left text-[15px] font-medium text-blue outline-none sm:max-w-[260px] sm:text-right"
        onClick={() => setOpen(true)}
      >
        {selected ? `${selected.brand} ${selected.name}` : t("grinders.none")}
      </button>
      {open && (
        <div className="fixed inset-0 z-40 flex items-end justify-center sm:items-center">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-label={t("common.close")}
          />
          <div className="relative z-10 flex max-h-[88vh] w-full max-w-lg flex-col rounded-t-3xl bg-card pb-[env(safe-area-inset-bottom)] sm:rounded-3xl">
            <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3">
              <div>
                <h3 className="text-[18px] font-semibold text-white">{t("grinders.label")}</h3>
                <p className="mt-0.5 text-[12px] leading-relaxed text-muted">
                  {t("grinders.n", { n: GRINDERS.length })}
                </p>
              </div>
              <button type="button" className="text-[15px] font-medium text-blue" onClick={() => setOpen(false)}>
                {t("common.close")}
              </button>
            </div>
            <div className="px-5 pb-3">
              <input
                ref={inputRef}
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder={t("grinders.searchPh")}
                autoComplete="off"
                autoCorrect="off"
                spellCheck={false}
                className="w-full rounded-xl bg-card2 px-3 py-2.5 text-[15px] text-white outline-none placeholder:text-muted"
              />
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-4">
              <button
                type="button"
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left ${
                  !value ? "bg-card2" : ""
                }`}
                onClick={() => pick(undefined)}
              >
                <span className="text-[15px] text-white">{t("grinders.none")}</span>
                {!value && <span className="shrink-0 text-[13px] text-blue">●</span>}
              </button>
              {query ? (
                hits.length === 0 ? (
                  <p className="px-3 py-6 text-[13px] text-muted">{t("grinders.empty")}</p>
                ) : (
                  hits.map((g) => (
                    <GrinderRow
                      key={g.id}
                      brand={g.brand}
                      name={g.name}
                      active={g.id === value}
                      onClick={() => pick(g.id)}
                    />
                  ))
                )
              ) : (
                groups.map((group) => (
                  <div key={group.brand} className="mt-3">
                    <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
                      {group.brand}
                    </p>
                    {group.grinders.map((g) => (
                      <GrinderRow
                        key={g.id}
                        name={g.name}
                        active={g.id === value}
                        onClick={() => pick(g.id)}
                      />
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function GrinderRow({
  brand,
  name,
  active,
  onClick,
}: {
  brand?: string;
  name: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`flex w-full items-baseline justify-between gap-3 rounded-xl px-3 py-2.5 text-left ${
        active ? "bg-card2" : ""
      }`}
      onClick={onClick}
    >
      <span className="min-w-0">
        {brand && <span className="mr-1.5 text-[13px] text-muted">{brand}</span>}
        <span className="text-[15px] text-white">{name}</span>
      </span>
      {active && <span className="shrink-0 text-[13px] text-blue">●</span>}
    </button>
  );
}
