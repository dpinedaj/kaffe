import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { LOCALES, translate, type Locale } from "./translate";
import type { MessageKey } from "./en";

const KEY = "kaffe.locale";

function readLocale(): Locale {
  if (typeof localStorage === "undefined") return "en";
  try {
    const raw = localStorage.getItem(KEY);
    return raw === "es" || raw === "en" ? raw : "en";
  } catch {
    return "en";
  }
}

type TFn = (key: MessageKey, vars?: Record<string, string | number>) => string;

const LocaleContext = createContext<{
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TFn;
}>({
  locale: "en",
  setLocale: () => undefined,
  t: (key, vars) => translate("en", key, vars),
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(readLocale);

  useEffect(() => {
    document.documentElement.lang = locale === "es" ? "es" : "en";
  }, [locale]);

  const value = useMemo(() => {
    function setLocale(next: Locale) {
      setLocaleState(next);
      try {
        localStorage.setItem(KEY, next);
      } catch {
        /* quota / private mode */
      }
    }
    return {
      locale,
      setLocale,
      t: (key: MessageKey, vars?: Record<string, string | number>) => translate(locale, key, vars),
    };
  }, [locale]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useI18n() {
  return useContext(LocaleContext);
}

export function LocaleSwitch() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="flex items-center rounded-lg bg-card p-0.5" role="group" aria-label={t("nav.lang")}>
      {LOCALES.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`min-h-8 min-w-8 rounded-md px-2 text-[12px] font-semibold ${
            locale === item.id ? "bg-card2 text-white" : "text-muted"
          }`}
          onClick={() => setLocale(item.id)}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}
