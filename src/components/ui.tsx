import type { ReactNode } from "react";

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
    <div className={`flex items-center justify-between gap-4 px-4 py-3 ${last ? "" : "border-b border-line"}`}>
      <span className="text-[15px] text-white">{label}</span>
      <div className="min-w-0 text-right">{children}</div>
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
      className="max-w-[220px] appearance-none bg-transparent text-right text-[15px] font-medium text-blue outline-none"
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

export function Field({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5">
      <span className="text-[15px] text-label">{label}</span>
      <span className="min-w-0 flex-1 text-right text-[15px] font-medium leading-snug break-words text-white">{value}</span>
    </div>
  );
}
