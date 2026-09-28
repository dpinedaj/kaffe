import { useI18n } from "../i18n/LocaleContext";
import { openScience, type ScienceTarget } from "../lib/science";

/** Small “Why?” that opens How Kaffe works at the section behind a number. */
export function WhyLink({ target, className = "" }: { target: ScienceTarget; className?: string }) {
  const { t } = useI18n();
  return (
    <button type="button" onClick={() => openScience(target)} className={`font-medium text-blue ${className}`}>
      {t("science.why")}
    </button>
  );
}
