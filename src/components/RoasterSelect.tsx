import { useI18n } from "../i18n/LocaleContext";
import { ROASTERS, roasterName, type RoasterId } from "../lib/roasters";

/** The roaster Kaffe designs for. One machine today; the disabled row says more are planned. */
export function RoasterSelect({
  value,
  onChange,
  className = "",
}: {
  value: RoasterId;
  onChange: (id: RoasterId) => void;
  className?: string;
}) {
  const { t } = useI18n();
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as RoasterId)}
      aria-label={t("roaster.label")}
      className={`appearance-none bg-transparent text-[14px] font-medium text-blue outline-none ${className}`}
    >
      {ROASTERS.map((r) => (
        <option key={r.id} value={r.id}>
          {roasterName(r)}
        </option>
      ))}
      <option disabled value="">
        {t("roaster.more")}
      </option>
    </select>
  );
}
