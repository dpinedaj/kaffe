import { useEffect, useRef, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";
import {
  applyUpdate,
  isIos,
  promptInstall,
  pwaState,
  subscribePwa,
  type PwaState,
} from "../lib/pwa";

export function InstallButton() {
  const { t } = useI18n();
  const [state, setState] = useState<PwaState>(() => pwaState());
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => subscribePwa(setState), []);
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

  if (state.updateReady) {
    return (
      <button
        type="button"
        className="rounded-lg bg-blue px-2.5 py-1.5 text-[12px] font-semibold text-white"
        onClick={applyUpdate}
      >
        {t("install.update")}
      </button>
    );
  }
  if (state.installed) return null;

  async function onClick() {
    if (state.canPrompt) {
      await promptInstall();
      return;
    }
    setOpen((v) => !v);
  }

  return (
    <div ref={box} className="relative">
      <button
        type="button"
        onClick={onClick}
        aria-expanded={open}
        className="flex items-center gap-1.5 rounded-lg bg-card2 px-2.5 py-1.5 text-[12px] font-semibold text-white"
      >
        <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 2v8M4.5 6.5 8 10l3.5-3.5M3 13h10" />
        </svg>
        <span className="hidden sm:inline">{t("install.button")}</span>
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-2xl bg-card p-4 text-left shadow-2xl ring-1 ring-line">
          <div className="text-[15px] font-semibold text-white">{t("install.title")}</div>
          <p className="mt-1 text-[13px] leading-relaxed text-label">
            {isIos() ? t("install.ios") : t("install.other")}
          </p>
          <p className="mt-2 text-[12px] leading-relaxed text-muted">{t("install.offline")}</p>
        </div>
      )}
    </div>
  );
}
