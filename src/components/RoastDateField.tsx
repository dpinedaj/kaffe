import { useI18n } from "../i18n/LocaleContext";
import { daysSinceRoast, roastDateFor } from "../lib/storage";

function CalendarIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" aria-hidden="true">
      <rect x="2" y="3" width="12" height="11" rx="2" />
      <path d="M2 6.5h12M5.5 1.5v3M10.5 1.5v3" />
    </svg>
  );
}

/**
 * Roast day as a date chip (opens the native picker) next to a day stepper.
 * Both edit the same value: picking a date sets the days, stepping moves the date.
 */
export function RoastDateField({
  days,
  onChange,
  maxDays = 60,
}: {
  days: number;
  onChange: (days: number) => void;
  maxDays?: number;
}) {
  const { t, locale } = useI18n();
  const iso = roastDateFor(days);
  const [y, m, d] = iso.split("-").map(Number);
  const shown = new Intl.DateTimeFormat(locale, { month: "short", day: "numeric" }).format(new Date(y, m - 1, d));
  const set = (n: number) => onChange(Math.max(0, Math.min(maxDays, n)));
  const step = "flex h-8 w-8 items-center justify-center text-[18px] leading-none text-blue disabled:text-muted";
  return (
    <div className="flex items-center justify-end gap-2">
      <label className="relative flex h-8 cursor-pointer items-center gap-1.5 rounded-lg bg-card2 px-2.5 text-[13px] text-white">
        <span className="text-blue">
          <CalendarIcon />
        </span>
        <span>{shown}</span>
        <input
          type="date"
          value={iso}
          min={roastDateFor(maxDays)}
          max={roastDateFor(0)}
          aria-label={t("brew.roastDate")}
          onClick={(e) => {
            try {
              e.currentTarget.showPicker?.();
            } catch {
              /* older browsers open it on tap anyway */
            }
          }}
          onChange={(e) => {
            const n = daysSinceRoast(e.target.value);
            if (n != null) set(n);
          }}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </label>
      <div className="flex h-8 items-center rounded-lg bg-card2">
        <button type="button" className={step} aria-label={t("brew.dayLess")} disabled={days <= 0} onClick={() => set(days - 1)}>
          −
        </button>
        <span className="min-w-[3.25rem] text-center text-[13px] tabular-nums text-white">
          {days === 0 ? t("brew.today") : t("library.daysAgo", { days })}
        </span>
        <button type="button" className={step} aria-label={t("brew.dayMore")} disabled={days >= maxDays} onClick={() => set(days + 1)}>
          +
        </button>
      </div>
    </div>
  );
}
