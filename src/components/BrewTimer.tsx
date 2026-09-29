import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useI18n } from "../i18n/LocaleContext";
import type { BrewStep } from "../lib/brew";
import { buildTimeline, formatTimer, stepIndexAt } from "../lib/brewTimer";

const SOUND_KEY = "kaffe.timer.sound";
/** Seconds before a step change when the timer turns red and counts down. */
const WARN_S = 10;

function loadSound(): boolean {
  try {
    return localStorage.getItem(SOUND_KEY) !== "off";
  } catch {
    return true;
  }
}

function chime(ctx: AudioContext | null, times = 1, freq = 880) {
  if (!ctx) return;
  for (let i = 0; i < times; i++) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const t0 = ctx.currentTime + i * 0.22;
    osc.frequency.value = freq;
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
  about,
  steps,
  totalS,
  onClose,
  onDone,
}: {
  title: string;
  subtitle: string;
  about?: string;
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
  /** Recipe notes: shown before brewing, tucked away once you start or scroll the steps. */
  const [aboutOpen, setAboutOpen] = useState(true);
  /** Once the user taps the notes toggle, stop hiding them on scroll / start. */
  const aboutPinned = useRef(false);
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
    if (!aboutPinned.current) setAboutOpen(false);
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
  const untilChange = untilNext ?? timeline.totalS - elapsed;
  const warnLeft = !done && running && untilChange > 0 && untilChange <= WARN_S ? Math.ceil(untilChange) : null;
  const currentKey = done ? "after" : notStarted ? "prep" : idx >= 0 ? `t${idx}` : "prep";
  /** During the heads-up countdown the next card opens too, so you can read what is coming. */
  const upcomingKey = warnLeft == null ? null : next ? `t${idx + 1}` : "after";

  const allKeys = [...(timeline.prep.length ? ["prep"] : []), ...timeline.timed.map((_, i) => `t${i}`), "after"];
  const allOpen = allKeys.every((k) => isOpen(k));

  function isOpen(key: string) {
    return toggled[key] ?? (key === currentKey || key === upcomingKey);
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

  useEffect(() => {
    if (warnLeft == null || warnLeft > 3) return;
    if (sound) chime(audio.current, 1, 660);
    navigator.vibrate?.(40);
  }, [warnLeft, sound]);

  useEffect(() => {
    if (upcomingKey) cards.current[upcomingKey]?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [upcomingKey]);

  return createPortal(
    <div className="fixed inset-0 z-[70] flex flex-col bg-black text-left">
      <div className="border-b border-line px-3 pt-[calc(env(safe-area-inset-top)+8px)] pb-2">
        <div className="mx-auto flex w-full max-w-md items-center gap-2">
          <IconButton label={t("common.close")} onClick={onClose}>
            <path d="M6 6l12 12M18 6L6 18" />
          </IconButton>
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-[15px] font-semibold leading-tight text-white">{title}</h3>
            <p className="truncate text-[12px] leading-tight text-muted">{subtitle}</p>
          </div>
          {about && (
            <IconButton
              label={aboutOpen ? t("timer.aboutHide") : t("timer.aboutShow")}
              active={aboutOpen}
              expanded={aboutOpen}
              onClick={() => {
                aboutPinned.current = true;
                setAboutOpen((v) => !v);
              }}
            >
              <circle cx="12" cy="12" r="8.5" />
              <path d="M12 11v5M12 8h.01" />
            </IconButton>
          )}
          <IconButton label={sound ? t("timer.soundOn") : t("timer.soundOff")} active={sound} pressed={sound} onClick={toggleSound}>
            <path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z" />
            {sound ? <path d="M15.5 9a4 4 0 010 6M18 6.5a7.5 7.5 0 010 11" /> : <path d="M16 9.5l5 5M21 9.5l-5 5" />}
          </IconButton>
        </div>
        {about && (
          <div
            className={`mx-auto grid w-full max-w-md transition-[grid-template-rows,opacity] duration-200 ease-out ${
              aboutOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
            aria-hidden={!aboutOpen}
          >
            <p className="overflow-hidden px-1 text-[12px] leading-snug text-label">
              <span className="block pt-2">{about}</span>
            </p>
          </div>
        )}
      </div>

      <div
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-3"
        onScroll={(e) => {
          if (aboutOpen && !aboutPinned.current && e.currentTarget.scrollTop > 24) setAboutOpen(false);
        }}
      >
        <div className="mx-auto flex w-full max-w-md justify-end pb-1.5">
          <button type="button" className="py-1 text-[12px] font-semibold text-blue" onClick={() => setAll(!allOpen)}>
            {allOpen ? t("timer.collapseAll") : t("timer.expandAll")}
          </button>
        </div>
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
            const warn = warnLeft != null && i === idx + 1;
            return (
              <StepCard
                key={key}
                refFn={(el) => (cards.current[key] = el)}
                state={state}
                warn={warn}
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
                {state !== "now" && !warn && (
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
            warn={warnLeft != null && !next}
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

      <div className="border-t border-line bg-card/60 px-4 pt-0 pb-[calc(env(safe-area-inset-bottom)+10px)] backdrop-blur">
        <div className="mx-auto w-full max-w-md">
          <div className="-mx-4 h-1 bg-card2 sm:mx-0 sm:rounded-full">
            <div
              className={`h-full transition-[width] duration-200 sm:rounded-full ${warnLeft != null ? "bg-red" : "bg-blue"}`}
              style={{ width: `${progress * 100}%` }}
            />
          </div>
          <div className="flex items-center gap-3 pt-2.5">
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <span
                  className={`text-[36px] font-semibold tabular-nums leading-none ${
                    warnLeft != null ? "animate-pulse text-red" : "text-white"
                  }`}
                >
                  {formatTimer(elapsed)}
                </span>
                <span className="text-[12px] tabular-nums text-muted">{t("timer.of", { total: formatTimer(timeline.totalS) })}</span>
              </div>
              {!done && next && untilNext != null && (
                <div
                  className={`mt-1 truncate text-[12px] leading-tight tabular-nums ${
                    warnLeft != null ? "font-semibold text-red" : "text-label"
                  }`}
                >
                  {t("timer.nextIn", { title: next.step.title, t: formatTimer(untilNext) })}
                </div>
              )}
            </div>
            <button
              type="button"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-card2 text-white disabled:text-muted"
              onClick={reset}
              disabled={notStarted}
              aria-label={t("timer.reset")}
              title={t("timer.reset")}
            >
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M4.5 12a7.5 7.5 0 107.5-7.5H8" />
                <path d="M10 2 7.5 4.5 10 7" />
              </svg>
            </button>
            <button
              type="button"
              className="flex h-11 shrink-0 items-center gap-1.5 rounded-full bg-blue pr-5 pl-4 text-[15px] font-semibold text-white"
              onClick={running ? pause : start}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                {running ? <path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" /> : <path d="M8 5.5v13l10.5-6.5z" />}
              </svg>
              {running ? t("timer.pause") : notStarted ? t("timer.start") : done ? t("timer.again") : t("timer.resume")}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}

function StepCard({
  state,
  warn,
  open,
  onToggle,
  at,
  title,
  badge,
  refFn,
  children,
}: {
  state: "done" | "now" | "next";
  warn?: boolean;
  open: boolean;
  onToggle: () => void;
  at: string;
  title: string;
  badge?: string;
  refFn: (el: HTMLLIElement | null) => void;
  children: React.ReactNode;
}) {
  const tone = warn
    ? "bg-card ring-2 ring-red"
    : state === "now"
      ? "bg-card ring-1 ring-blue"
      : state === "done"
        ? "bg-card/50 opacity-60"
        : "bg-card/80";
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
        {badge && (
          <span
            className={`shrink-0 tabular-nums ${
              warn ? "animate-pulse text-[15px] font-bold text-red" : "text-[12px] text-muted"
            }`}
          >
            {badge}
          </span>
        )}
        <span className={`shrink-0 text-[12px] text-muted transition-transform ${open ? "rotate-180" : ""}`} aria-hidden="true">
          ▾
        </span>
      </button>
      {open && <div className="px-4 pb-4 pl-[4.75rem]">{children}</div>}
    </li>
  );
}

function IconButton({
  label,
  onClick,
  active = true,
  pressed,
  expanded,
  children,
}: {
  label: string;
  onClick: () => void;
  active?: boolean;
  pressed?: boolean;
  expanded?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-card2 ${active ? "text-white" : "text-muted"}`}
      onClick={onClick}
      aria-label={label}
      aria-pressed={pressed}
      aria-expanded={expanded}
      title={label}
    >
      <svg viewBox="0 0 24 24" className="h-[18px] w-[18px]" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {children}
      </svg>
    </button>
  );
}
