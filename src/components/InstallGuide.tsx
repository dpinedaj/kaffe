import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/LocaleContext";
import type { MessageKey } from "../i18n/en";
import { isIos, type InstallHelp } from "../lib/pwa";

/** Where that browser keeps the button that opens Share (or the menu that holds it). */
function arrowAt(kind: InstallHelp): "top-right" | "bottom-center" | "bottom-right" | null {
  const tablet = /iPad/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  if (kind === "iosInApp") return null;
  if (kind === "iosChrome" || tablet) return "top-right";
  if (kind === "iosFirefox") return "bottom-right";
  return "bottom-center";
}

export function isIosGuide(kind: InstallHelp): boolean {
  return kind.startsWith("ios") && isIos();
}

const ShareGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 3v12M8 7l4-4 4 4" />
    <path d="M7 10H6a2 2 0 00-2 2v7a2 2 0 002 2h12a2 2 0 002-2v-7a2 2 0 00-2-2h-1" />
  </svg>
);

const AddGlyph = () => (
  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <path d="M12 8.5v7M8.5 12h7" />
  </svg>
);

/**
 * iOS has no install prompt in any browser, so the Install button points at the
 * browser's own Share button: two taps, nothing to read.
 */
export function InstallGuide({ kind, onClose }: { kind: InstallHelp; onClose: () => void }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);
  const arrow = arrowAt(kind);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(window.location.href.split("#")[0]);
      setCopied(true);
    } catch {
      /* clipboard blocked: the text still says what to do */
    }
  }

  const pos =
    arrow === "top-right"
      ? "top-[calc(env(safe-area-inset-top)+6px)] right-5"
      : arrow === "bottom-right"
        ? "bottom-[calc(env(safe-area-inset-bottom)+6px)] right-5"
        : "bottom-[calc(env(safe-area-inset-bottom)+6px)] left-1/2 -translate-x-1/2";

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t("install.title")}
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/75 px-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <div className="w-full max-w-sm rounded-3xl bg-card p-5 text-left shadow-2xl ring-1 ring-line" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3">
          <img src="./icons/icon-192.png" alt="" className="h-12 w-12 rounded-2xl" />
          <div className="min-w-0">
            <div className="text-[17px] font-semibold text-white">{t("install.guide.title")}</div>
            <div className="text-[13px] text-muted">{t("install.guide.subtitle")}</div>
          </div>
        </div>
        {kind === "iosInApp" ? (
          <>
            <p className="mt-4 text-[14px] leading-relaxed text-label">{t("install.iosInApp")}</p>
            <button type="button" onClick={copy} className="mt-4 w-full rounded-2xl bg-blue px-4 py-3 text-[15px] font-semibold text-white">
              {copied ? t("install.copied") : t("install.copyLink")}
            </button>
          </>
        ) : (
          <ol className="mt-4 space-y-2.5">
            <li className="flex items-center gap-3 rounded-2xl bg-card2 px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <ShareGlyph />
              </span>
              <span className="text-[15px] text-white">{t(`install.guide.share.${kind}` as MessageKey)}</span>
            </li>
            <li className="flex items-center gap-3 rounded-2xl bg-card2 px-3 py-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue/15 text-blue">
                <AddGlyph />
              </span>
              <span className="text-[15px] text-white">{t("install.guide.add")}</span>
            </li>
          </ol>
        )}
        {kind !== "iosInApp" && <p className="mt-3 text-[12px] leading-relaxed text-muted">{t("install.guide.hint")}</p>}
        <button type="button" onClick={onClose} className="mt-4 w-full rounded-2xl px-4 py-2.5 text-[15px] font-medium text-blue">
          {t("install.guide.done")}
        </button>
      </div>
      {arrow && (
        <div className={`pointer-events-none fixed ${pos} animate-bounce text-blue`} aria-hidden="true">
          <svg viewBox="0 0 24 24" className={`h-10 w-10 ${arrow === "top-right" ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 3v17M5 13l7 7 7-7" />
          </svg>
        </div>
      )}
    </div>,
    document.body,
  );
}
