import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/LocaleContext";
import type { BrewStep } from "../lib/brew";
import { buildTimeline, formatTimer, stepIndexAt } from "../lib/brewTimer";

const SOUND_KEY = "kaffe.timer.sound";

function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function chime(ctx: AudioContext | null, times = 1) {
  if (!ctx) return;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + i * 0.22;
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.0001, t0);
    gain.gain.exponentialRampToValueAtTime(0.25, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.18);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + 0.2);
  }
}

type WakeLock = { release: () => Promise<void> };

export function BrewTimer({
  title,
  subtitle,
  steps,
  totalS,
  onClose,
  onDone,
}: {
  title: string;
  subtitle: string;
  steps: BrewStep[];
  totalS: number;
  onClose: () => void;
  onDone: () => void;
}) {
  const { t } = useI18n();
  const timeline = useMemo(() => buildTimeline(steps, totalS), [steps, totalS]);
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(false);
  const [sound, setSound] = useState(loadSound);
  const startedAt = useRef<number | null>(null);
  const banked = useRef(0);
  const audio = useRef<AudioContext | null>(null);
  const lastIdx = useRef(-1);
  const wake = useRef<WakeLock | null>(null);
  const cards = useRef<Record<string, HTMLLIElement | null>>({});
  const [toggled, setToggled] = useState<Record<string, boolean>>({});
  const done = elapsed >= timeline.totalS && timeline.totalS > 0;

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startedAt.current == null) return;
      setElapsed(banked.current + (performance.now() - startedAt.current) / 1000);
    }, 200);
    return () => window.clearInterval(id);
  }, [running]);

  const idx = stepIndexAt(timeline, elapsed);
  useEffect(() => {
    if (!running) return;
    if (idx !== lastIdx.current && idx >= 0) {
      if (lastIdx.current !== -2 && sound) chime(audio.current);
      navigator.vibrate?.(120);
    }
    lastIdx.current = idx;
  }, [idx, running, sound]);

  useEffect(() => {
    if (!running) return;
    setToggled({});
    const key = idx >= 0 ? `t${idx}` : "prep";
    cards.current[key]?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [idx, running]);

  useEffect(() => {
    if (done) cards.current.after?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [done]);

  useEffect(() => {
    if (!done || !running) return;
    setRunning(false);
    banked.current = timeline.totalS;
    startedAt.current = null;
    if (sound) chime(audio.current, 2);
    navigator.vibrate?.([120, 80, 120]);
  }, [done, running, sound, timeline.totalS]);

  useEffect(() => {
    const nav = navigator as Navigator & { wakeLock?: { request: (k: "screen") => Promise<WakeLock> } };
    if (running && nav.wakeLock) {
      nav.wakeLock.request("screen").then((lock) => (wake.current = lock)).catch(() => {});
    }
    if (!running && wake.current) {
      void wake.current.release().catch(() => {});
      wake.current = null;
    }
  }, [running]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      void wake.current?.release().catch(() => {});
      void audio.current?.close().catch(() => {});
    };
  }, [onClose]);

  function start() {
    if (!audio.current) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      audio.current = Ctx ? new Ctx() : null;
    }
    void audio.current?.resume();
    if (done) reset();
    startedAt.current = performance.now();
    setRunning(true);
  }

  function pause() {
    banked.current = elapsed;
    startedAt.current = null;
    setRunning(false);
  }

  function reset() {
    banked.current = 0;
    startedAt.current = running ? performance.now() : null;
    lastIdx.current = -1;
    setToggled({});
    setElapsed(0);
  }

  function toggleSound() {
    const next = !sound;
    setSound(next);
    try {
      localStorage.setItem(SOUND_KEY, next ? "on" : "off");
    } catch {
      /* private mode */
    }
  }

  const next = timeline.timed[idx + 1];
  const untilNext = next ? next.s - elapsed : null;
  const progress = timeline.totalS > 0 ? Math.min(1, elapsed / timeline.totalS) : 0;
  const notStarted = elapsed === 0 && !running;
  const currentKey = done ? "after" : notStarted ? "prep" : idx >= 0 ? `t${idx}` : "prep";

  const allKeys = [...(timeline.prep.length ? ["prep"] : []), ...timeline.timed.map((_, i) => `t${i}`), "after"];
  const allOpen = allKeys.every((k) => isOpen(k));

  function isOpen(key: string) {
    return toggled[key] ?? key === currentKey;
  }

  function setAll(open: boolean) {
    setToggled(Object.fromEntries(allKeys.map((k) => [k, open])));
  }

  function toggle(key: string) {
    setToggled((cur) => ({ ...cur, [key]: !isOpen(key) }));
  }

  function jumpTo(seconds: number) {
    banked.current = seconds;
    startedAt.current = running ? performance.now() : null;
    lastIdx.current = stepIndexAt(timeline, seconds);
    setToggled({});
    setElapsed(seconds);
  }

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-left">
      <div className="flex items-start justify-between gap-3 px-5 pt-[calc(env(safe-area-inset-top)+16px)] pb-2">
        <div className="min-w-0">
          <h3 className="truncate text-[18px] font-semibold text-white">{title}</h3>
          <p className="truncate text-[12px] text-muted">{subtitle}</p>
        </div>
        <div className="flex shrink-0 items-center gap-3">
          <button type="button" className="text-[13px] font-medium text-muted" onClick={toggleSound}>
            {sound ? t("timer.soundOn") : t("timer.soundOff")}
          </button>
          <button type="button" className="text-[15px] font-medium text-blue" onClick={onClose}>
            {t("common.close")}
          </button>
        </div>
      </div>

      <div className="mx-auto w-full max-w-md px-5 pb-3">
        <div className="flex items-end justify-between gap-3">
          <div className="text-[56px] font-semibold tabular-nums leading-none text-white sm:text-[72px]">
            {formatTimer(elapsed)}
          </div>
          <div className="pb-1 text-right text-[12px] leading-snug text-muted">
            <div>{t("timer.of", { total: formatTimer(timeline.totalS) })}</div>
            {!done && next && untilNext != null && (
              <div className="tabular-nums text-label">
                {t("timer.nextIn", { title: next.step.title, t: formatTimer(untilNext) })}
              </div>
            )}
          </div>
        </div>
        <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-card2">
          <div className="h-full rounded-full bg-blue transition-[width] duration-200" style={{ width: `${progress * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-end">
          <button type="button" className="text-[12px] font-semibold text-blue" onClick={() => setAll(!allOpen)}>
            {allOpen ? t("timer.collapseAll") : t("timer.expandAll")}
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-4">
        <ol className="mx-auto w-full max-w-md space-y-2">
          {timeline.prep.length > 0 && (
            <StepCard
              refFn={(el) => (cards.current.prep = el)}
              state={notStarted ? "now" : "done"}
              open={isOpen("prep")}
              onToggle={() => toggle("prep")}
              at={timeline.prep[0].at}
              title={timeline.prep.map((p) => p.title).join(" · ")}
            >
              {timeline.prep.map((p) => (
                <div key={p.title} className="mt-2 first:mt-0">
                  {timeline.prep.length > 1 && <div className="text-[14px] font-medium text-white">{p.title}</div>}
                  <p className="text-[14px] leading-relaxed text-label">{p.detail}</p>
                </div>
              ))}
            </StepCard>
          )}
          {timeline.timed.map((item, i) => {
            const key = `t${i}`;
            const state = done || i < idx ? "done" : i === idx && !notStarted ? "now" : "next";
            const startsIn = item.s - elapsed;
            return (
              <StepCard
                key={key}
                refFn={(el) => (cards.current[key] = el)}
                state={state}
                open={isOpen(key)}
                onToggle={() => toggle(key)}
                at={item.step.at}
                title={item.step.title}
                badge={
                  state === "now" && untilNext != null
                    ? t("timer.left", { t: formatTimer(untilNext) })
                    : state === "next" && !notStarted
                      ? t("timer.in", { t: formatTimer(startsIn) })
                      : undefined
                }
              >
                <p className="text-[15px] leading-relaxed text-label">{item.step.detail}</p>
                {state !== "now" && (
                  <button
                    type="button"
                    className="mt-2 text-[13px] font-semibold text-blue"
                    onClick={(e) => {
                      e.stopPropagation();
                      jumpTo(item.s);
                    }}
                  >
                    {t("timer.jump")}
                  </button>
                )}
              </StepCard>
            );
          })}
          <StepCard
            refFn={(el) => (cards.current.after = el)}
            state={done ? "now" : "next"}
            open={isOpen("after")}
            onToggle={() => toggle("after")}
            at={formatTimer(timeline.totalS)}
            title={done ? t("timer.done") : t("timer.finish")}
            badge={!done && !notStarted ? t("timer.in", { t: formatTimer(timeline.totalS - elapsed) }) : undefined}
          >
            {timeline.after.map((p) => (
              <div key={p.title} className="mb-2">
                <div className="text-[14px] font-medium text-white">{p.title}</div>
                <p className="text-[14px] leading-relaxed text-label">{p.detail}</p>
              </div>
            ))}
            <button
              type="button"
              className="mt-1 w-full rounded-xl bg-blue px-4 py-3 text-[15px] font-semibold text-white"
              onClick={(e) => {
                e.stopPropagation();
                onDone();
              }}
            >
              {t("timer.taste")}
            </button>
          </StepCard>
        </ol>
      </div>

      <div className="flex gap-2 px-5 pt-2 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <button
          type="button"
          className="flex-1 rounded-2xl bg-card2 px-4 py-4 text-[16px] font-semibold text-white disabled:text-muted"
          onClick={reset}
          disabled={notStarted}
        >
          {t("timer.reset")}
        </button>
        <button
          type="button"
          className="flex-[2] rounded-2xl bg-blue px-4 py-4 text-[17px] font-semibold text-white"
          onClick={running ? pause : start}
        >
          {running ? t("timer.pause") : notStarted ? t("timer.start") : done ? t("timer.again") : t("timer.resume")}
        </button>
      </div>
    </div>,
    document.body,
  );
}

function StepCard({
  state,
  open,
  onToggle,
  at,
  title,
  badge,
  refFn,
  children,
}: {
  state: "done" | "now" | "next";
  open: boolean;
  onToggle: () => void;
  at: string;
  title: string;
  badge?: string;
  refFn: (el: HTMLLIElement | null) => void;
  children: React.ReactNode;
}) {
  const tone =
    state === "now" ? "bg-card ring-1 ring-blue" : state === "done" ? "bg-card/50 opacity-60" : "bg-card/80";
  return (
    <li ref={refFn} className={`rounded-2xl ${tone}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left"
      >
        <span
          className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold ${
            state === "done" ? "bg-green/20 text-green" : state === "now" ? "bg-blue text-white" : "bg-card2 text-muted"
          }`}
          aria-hidden="true"
        >
          {state === "done" ? "✓" : state === "now" ? "●" : ""}
        </span>
        <span className="w-14 shrink-0 text-[12px] font-semibold tabular-nums text-blue">{at}</span>
        <span className={`min-w-0 flex-1 truncate font-medium text-white ${state === "now" ? "text-[17px]" : "text-[15px]"}`}>
          {title}
        </span>
        {badge && <span className="shrink-0 text-[12px] tabular-nums text-muted">{badge}</span>}
        <span className={`shrink-0 text-[12px] text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <div className="px-4 pb-4 pl-[4.75rem]">{children}</div>}
    </li>
  );
}
