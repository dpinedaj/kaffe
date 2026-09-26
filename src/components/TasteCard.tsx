import { forwardRef, useMemo, useState } from "react";
import { useI18n } from "../i18n/LocaleContext";
import type { MessageKey } from "../i18n/en";
import { grindLabel } from "../i18n/labels";
import type { BrewMethod, Grind } from "../lib/brew";
import {
  BALANCES,
  STRENGTHS,
  loadTastes,
  saveTaste,
  tasteTips,
  tastesForLot,
  type TasteBalance,
  type TasteStrength,
} from "../lib/taste";
import { Card } from "./ui";

function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
}: {
  options: T[];
  value: T | undefined;
  onChange: (v: T) => void;
  label: (v: T) => string;
}) {
  return (
    <div className="flex rounded-lg bg-card2 p-0.5">
      {options.map((o) => (
        <button
          key={o}
          type="button"
          className={`flex-1 rounded-md px-2 py-2 text-[13px] font-semibold sm:py-1.5 ${
            value === o ? "bg-blue text-white" : "text-muted"
          }`}
          onClick={() => onChange(o)}
        >
          {label(o)}
        </button>
      ))}
    </div>
  );
}

export const TasteCard = forwardRef<
  HTMLElement,
  {
    lot: string;
    lotLabel?: string;
    method: BrewMethod;
    technique?: string;
    grind: Grind;
    ratioN: number;
  }
>(function TasteCard({ lot, lotLabel, method, technique, grind, ratioN }, ref) {
  const { t, locale } = useI18n();
  const [balance, setBalance] = useState<TasteBalance | undefined>();
  const [strength, setStrength] = useState<TasteStrength | undefined>();
  const [stars, setStars] = useState<number | undefined>();
  const [note, setNote] = useState("");
  const [items, setItems] = useState(() => loadTastes());
  const [saved, setSaved] = useState(false);
  const history = useMemo(() => tastesForLot(lot, items).slice(0, 3), [lot, items]);
  const ready = balance != null && strength != null;
  const tips = ready ? tasteTips(balance, strength, { grind, ratioN, method }) : [];

  function save() {
    if (!ready) return;
    setItems(
      saveTaste({
        at: new Date().toISOString(),
        lot,
        lotLabel,
        method,
        technique,
        balance,
        strength,
        stars,
        note: note.trim() || undefined,
      }),
    );
    setSaved(true);
  }

  function reset() {
    setBalance(undefined);
    setStrength(undefined);
    setStars(undefined);
    setNote("");
    setSaved(false);
  }

  return (
    <section ref={ref}>
      <h3 className="mb-2 px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">{t("taste.title")}</h3>
      <Card className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-[88px_1fr] sm:items-center">
          <span className="text-[13px] text-muted">{t("taste.balance")}</span>
          <Segmented
            options={BALANCES}
            value={balance}
            onChange={(v) => {
              setBalance(v);
              setSaved(false);
            }}
            label={(v) => t(`taste.balance.${v}` as MessageKey)}
          />
          <span className="text-[13px] text-muted">{t("taste.strength")}</span>
          <Segmented
            options={STRENGTHS}
            value={strength}
            onChange={(v) => {
              setStrength(v);
              setSaved(false);
            }}
            label={(v) => t(`taste.strength.${v}` as MessageKey)}
          />
        </div>

        {ready && (
          <div className="space-y-1">
            {tips.map((tip) => (
              <p key={tip.key} className="text-[13px] leading-relaxed text-white">
                {t(tip.key, tip.vars?.grind ? { ...tip.vars, grind: grindLabel(tip.vars.grind as Grind, t) } : tip.vars)}
              </p>
            ))}
          </div>
        )}

        {ready && (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex gap-1" role="radiogroup" aria-label={t("taste.stars")}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={stars === n}
                  className={`text-[22px] leading-none ${stars != null && n <= stars ? "text-orange" : "text-muted"}`}
                  onClick={() => setStars(stars === n ? undefined : n)}
                >
                  ★
                </button>
              ))}
            </div>
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder={t("taste.notePh")}
              className="min-w-0 flex-1 rounded-xl bg-card2 px-3 py-2 text-[14px] text-white outline-none placeholder:text-muted"
            />
            {saved ? (
              <button type="button" className="rounded-xl px-3 py-2 text-[13px] font-semibold text-green" onClick={reset}>
                {t("taste.saved")}
              </button>
            ) : (
              <button type="button" className="rounded-xl bg-blue px-4 py-2 text-[13px] font-semibold text-white" onClick={save}>
                {t("taste.save")}
              </button>
            )}
          </div>
        )}

        {!ready && <p className="text-[12px] leading-relaxed text-muted">{t("taste.help")}</p>}

        {history.length > 0 && (
          <div className="border-t border-line pt-3">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t("taste.history")}</div>
            {history.map((h) => (
              <p key={h.at} className="mt-1 text-[12px] leading-relaxed text-label">
                {new Date(h.at).toLocaleDateString(locale === "es" ? "es" : "en")} ·{" "}
                {t(`taste.balance.${h.balance}` as MessageKey)} · {t(`taste.strength.${h.strength}` as MessageKey)}
                {h.stars ? ` · ${"★".repeat(h.stars)}` : ""}
                {h.note ? ` · ${h.note}` : ""}
              </p>
            ))}
          </div>
        )}
      </Card>
    </section>
  );
});
