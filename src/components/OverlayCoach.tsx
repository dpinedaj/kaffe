import { useEffect, useState } from "react";
import { generateProfile, type RoastIntent } from "../lib/generate";
import {
  applyIntentPatch,
  buildOverlayReviewContext,
  isLocalAiUiEnabled,
  parseCoachReply,
  type OverlayCoachChatTurn,
  type OverlayCoachReply,
} from "../lib/ai/overlayCoach";
import { defaultLevel, type OverlayTrack } from "../lib/overlay";
import { parseKpro } from "../lib/kpro";
import { Card } from "./ui";

export function OverlayCoach({
  tracks,
  baseIntent,
  onOpenInGenerate,
  onAddGeneratedTrack,
}: {
  tracks: OverlayTrack[];
  baseIntent: RoastIntent;
  onOpenInGenerate: (intent: RoastIntent) => void;
  onAddGeneratedTrack: (track: OverlayTrack) => void;
}) {
  const [status, setStatus] = useState<{ enabled: boolean; reason: string | null; model: string } | null>(null);
  const [question, setQuestion] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [turns, setTurns] = useState<OverlayCoachChatTurn[]>([]);
  const [proposal, setProposal] = useState<RoastIntent | null>(null);

  useEffect(() => {
    if (!isLocalAiUiEnabled()) return;
    let cancelled = false;
    void fetch("/api/overlay-coach/status")
      .then(async (res) => {
        const body = (await res.json()) as { enabled?: boolean; reason?: string | null; model?: string };
        if (!cancelled) {
          setStatus({
            enabled: Boolean(body.enabled),
            reason: body.reason ?? null,
            model: body.model ?? "composer-2.5",
          });
        }
      })
      .catch(() => {
        if (!cancelled) setStatus({ enabled: false, reason: "Dev overlay-coach API is not running.", model: "composer-2.5" });
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!isLocalAiUiEnabled()) return null;

  async function send() {
    const text = question.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    setQuestion("");
    const nextTurns = [...turns, { role: "user" as const, text }];
    setTurns(nextTurns);
    try {
      const res = await fetch("/api/overlay-coach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          context: buildOverlayReviewContext(tracks),
          intent: baseIntent,
          history: nextTurns.slice(-8),
        }),
      });
      const body = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) throw new Error(body.error || `HTTP ${res.status}`);
      const parsed: OverlayCoachReply = parseCoachReply(body.text ?? "");
      setTurns((prev) => [...prev, { role: "assistant", text: parsed.feedback }]);
      setProposal(parsed.intentPatch ? applyIntentPatch(baseIntent, parsed.intentPatch) : null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Cursor coach failed.");
    } finally {
      setBusy(false);
    }
  }

  function applyGenerated() {
    if (!proposal) return;
    const generated = generateProfile(proposal);
    const profile = parseKpro(generated.kproText, generated.profile.fileName);
    onAddGeneratedTrack({
      id: `ai-${Date.now()}`,
      kind: "profile",
      color: "#64D2FF",
      name: generated.curveName || profile.name,
      profile,
      level: defaultLevel(profile),
    });
  }

  return (
    <Card className="p-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-[15px] font-semibold">Local Cursor coach</h3>
          <p className="mt-1 text-[12px] text-muted">
            Only on <code className="text-label">npm run dev</code>. GitHub Pages never loads this. Key stays on the Vite
            server, not in the browser bundle.
          </p>
        </div>
        <span className="rounded-full bg-card2 px-2 py-1 text-[11px] text-muted">{status?.model ?? "…"}</span>
      </div>
      {status && !status.enabled && <p className="mb-3 text-[13px] text-orange">{status.reason}</p>}
      <div className="mb-3 max-h-64 space-y-2 overflow-y-auto">
        {turns.length === 0 && (
          <p className="text-[13px] text-muted">
            Ask why the log drifted, or request a new Generate intent (flavors, Rest/RTD, moisture). The model cannot
            rewrite Bézier points directly — Kaffe regenerates the .kpro from parameters.
          </p>
        )}
        {turns.map((turn, i) => (
          <div key={`${turn.role}-${i}`} className={`rounded-xl px-3 py-2 text-[13px] ${turn.role === "user" ? "bg-card2 text-white" : "bg-ink text-label"}`}>
            <div className="mb-1 text-[11px] uppercase tracking-wide text-muted">{turn.role === "user" ? "You" : "Coach"}</div>
            <div className="whitespace-pre-wrap">{turn.text}</div>
          </div>
        ))}
      </div>
      {error && <p className="mb-2 text-[13px] text-orange">{error}</p>}
      {proposal && (
        <div className="mb-3 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg bg-blue px-3 py-2 text-[13px] font-semibold text-white"
            onClick={() => onOpenInGenerate(proposal)}
          >
            Open proposed profile in Generate
          </button>
          <button type="button" className="rounded-lg bg-card2 px-3 py-2 text-[13px] font-semibold text-white" onClick={applyGenerated}>
            Add generated .kpro to overlay
          </button>
        </div>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          disabled={busy || status?.enabled === false}
          placeholder={tracks.length === 0 ? "Load a .klog or .kpro first, then ask…" : "e.g. Why did we crash into first crack?"}
          className="min-w-0 flex-1 rounded-lg bg-card2 px-3 py-2 text-[13px] text-white outline-none placeholder:text-muted"
        />
        <button
          type="submit"
          disabled={busy || status?.enabled === false || !question.trim()}
          className="rounded-lg bg-card2 px-3 py-2 text-[13px] font-semibold text-white disabled:text-muted"
        >
          {busy ? "Asking…" : "Ask"}
        </button>
      </form>
    </Card>
  );
}
