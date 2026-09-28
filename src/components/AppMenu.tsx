import { useEffect, useRef, useState } from "react";
import { LocaleSwitch, useI18n } from "../i18n/LocaleContext";
import type { RoasterId } from "../lib/roasters";
import { RoasterSelect } from "./RoasterSelect";

export function AppMenu({
  roaster,
  onRoaster,
  onWelcome,
}: {
  roaster: RoasterId;
  onRoaster: (id: RoasterId) => void;
  onWelcome: () => void;
}) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (box.current && !box.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={t("menu.label")}
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-card2 text-white"
      >
        <svg viewBox="0 0 16 16" className="h-4 w-4" fill="currentColor" aria-hidden="true">
          <circle cx="3" cy="8" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="13" cy="8" r="1.5" />
        </svg>
      </button>
      {open && (
        <div
          role="menu"
          className="fixed inset-x-4 top-[calc(env(safe-area-inset-top)+64px)] z-50 rounded-2xl bg-card p-2 text-left shadow-2xl ring-1 ring-line sm:absolute sm:inset-x-auto sm:right-0 sm:top-full sm:mt-2 sm:w-80"
        >
          <div className="rounded-xl px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("roaster.label")}</div>
            <div className="mt-1 flex items-center justify-between gap-2">
              <RoasterSelect value={roaster} onChange={onRoaster} className="min-w-0 flex-1 text-[15px]" />
              <span className="text-[12px] text-muted" aria-hidden="true">▾</span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-muted">{t("roaster.help")}</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl px-3 py-2.5">
            <span className="text-[14px] text-white">{t("nav.lang")}</span>
            <LocaleSwitch />
          </div>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onWelcome();
            }}
            className="flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-[14px] text-white hover:bg-card2"
          >
            {t("menu.welcome")}
            <span className="text-muted" aria-hidden="true">→</span>
          </button>
          <div className="mt-1 border-t border-line px-3 pt-2.5 pb-1 text-[12px] text-muted">
            {t("menu.version", { v: __APP_VERSION__ })}
          </div>
        </div>
      )}
    </div>
  );
}
