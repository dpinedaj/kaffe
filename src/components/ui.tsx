import { useState, type ReactNode } from "react";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-2xl bg-card ${className}`}>{children}</div>;
}

export function Row({
  label,
  children,
  last = false,
}: {
  label: string;
  children: ReactNode;
  last?: boolean;
}) {
  return (
    <div
      className={`flex flex-col items-stretch gap-1.5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4 ${
        last ? "" : "border-b border-line"
      }`}
    >
      <span className="text-[13px] text-muted sm:text-[15px] sm:text-white">{label}</span>
      <div className="flex min-w-0 justify-end sm:block sm:text-right">{children}</div>
    </div>
  );
}

export function Select({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full max-w-none appearance-none bg-transparent text-left text-[15px] font-medium text-blue outline-none sm:max-w-[220px] sm:text-right"
    >
      {children}
    </select>
  );
}

export function Toggle({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`relative h-[31px] w-[51px] rounded-full transition-colors ${on ? "bg-blue" : "bg-[#39393d]"}`}
    >
      <span
        className={`absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white transition-transform ${
          on ? "translate-x-5" : ""
        }`}
      />
    </button>
  );
}

export function Pill({
  children,
  tone = "muted",
}: {
  children: ReactNode;
  tone?: "muted" | "green" | "orange" | "blue";
}) {
  const map = {
    muted: "text-label",
    green: "text-green",
    orange: "text-orange",
    blue: "text-blue",
  };
  return <span className={`text-[12px] font-medium ${map[tone]}`}>{children}</span>;
}

export function DraftNumber({
  value,
  onChange,
  onEmpty,
  disabled,
  step,
  className = "",
}: {
  value: number;
  onChange: (n: number) => void;
  onEmpty?: () => void;
  disabled?: boolean;
  step?: number;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  return (
    <input
      type="number"
      inputMode="decimal"
      step={step ?? "any"}
      disabled={disabled}
      value={draft ?? String(value)}
      onChange={(e) => {
        const raw = e.target.value.replace(",", ".");
        if (raw !== "" && !/^-?\d*\.?\d*$/.test(raw)) return;
        setDraft(raw);
        if (raw === "" || raw === "-" || raw === ".") return;
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(n);
      }}
      onBlur={() => {
        if (draft === "" || draft === "-" || draft === ".") onEmpty?.();
        setDraft(null);
      }}
      className={className}
    />
  );
}

export function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col items-start gap-0.5 px-4 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
      <span className="shrink-0 text-[13px] text-muted sm:text-[15px] sm:text-label">{label}</span>
      <span className="min-w-0 w-full text-[15px] font-medium leading-snug break-words text-white sm:flex-1 sm:text-right">
        {value}
      </span>
    </div>
  );
}
