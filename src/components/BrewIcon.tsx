import type { BrewMethod } from "../lib/brew";

export function BrewIcon({ id, className = "" }: { id: BrewMethod; className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      {shape(id)}
    </svg>
  );
}

function shape(id: BrewMethod) {
  switch (id) {
    case "v60":
      return (
        <>
          <path d="M10 12h28" />
          <path d="M14 12 24 40 34 12" />
          <path d="M20 40h8" />
        </>
      );
    case "kalita":
      return (
        <>
          <path d="M12 12h24l-4 22H16z" />
          <path d="M19 34v4M24 34v4M29 34v4" />
          <path d="M16 40h16" />
        </>
      );
    case "origami":
      return (
        <>
          <path d="M8 14h32" />
          <path d="M12 14 24 40 36 14" />
          <path d="M18 14 24 40 30 14" />
        </>
      );
    case "chemex":
      return (
        <>
          <path d="M16 8h16l-6 14h-4z" />
          <path d="M20 22h8l4 18H16z" />
          <path d="M14 22h20" />
        </>
      );
    case "switch":
      return (
        <>
          <path d="M14 10h20L24 34 14 10z" />
          <rect x="16" y="34" width="16" height="6" rx="1" />
          <path d="M32 37h6" />
        </>
      );
    case "clever":
      return (
        <>
          <path d="M14 10h20v20l-4 8H18l-4-8z" />
          <path d="M18 38h12" />
          <path d="M14 18h20" />
        </>
      );
    case "aeropress":
      return (
        <>
          <rect x="16" y="8" width="16" height="28" rx="2" />
          <path d="M20 8V4h8v4" />
          <path d="M16 30h16" />
          <path d="M18 36h12" />
        </>
      );
    case "frenchpress":
      return (
        <>
          <path d="M16 12h14v26h-14z" />
          <path d="M23 6v10" />
          <path d="M18 16h10" />
          <path d="M30 18c6 2 6 12 0 14" />
        </>
      );
    case "orea":
      return (
        <>
          <path d="M12 14h24l-3 20H15z" />
          <path d="M18 34v5M24 34v5M30 34v5" />
          <path d="M16 41h16" />
        </>
      );
    case "coldbrew":
      return (
        <>
          <rect x="14" y="10" width="20" height="28" rx="3" />
          <path d="M16 8h16" />
          <path d="M18 20h4M26 24h4M20 30h6" />
        </>
      );
    case "moka":
      return (
        <>
          <path d="M16 28h16l-2 12H18z" />
          <path d="M18 28V18h12v10" />
          <path d="M20 18l2-8h4l2 8" />
          <path d="M32 20c4 2 4 8 0 10" />
        </>
      );
    case "espresso":
      return (
        <>
          <path d="M12 18h18v10H12z" />
          <path d="M30 20c6 1 6 7 0 8" />
          <path d="M18 18v-6h6v6" />
          <path d="M16 28c0 6 4 10 8 10s8-4 8-10" />
        </>
      );
    case "siphon":
      return (
        <>
          <path d="M18 6h12v12a6 6 0 0 1-12 0z" />
          <path d="M24 24v4" />
          <circle cx="24" cy="35" r="7" />
          <path d="M14 44h20" />
        </>
      );
    case "batch":
      return (
        <>
          <rect x="10" y="6" width="28" height="8" rx="2" />
          <path d="M16 14l2 8h12l2-8" />
          <path d="M16 26h16v12a4 4 0 0 1-4 4h-8a4 4 0 0 1-4-4z" />
          <path d="M32 30h3a2 2 0 0 1 0 6h-3" />
        </>
      );
    case "cupping":
      return (
        <>
          <ellipse cx="24" cy="18" rx="14" ry="6" />
          <path d="M10 18c0 10 6 16 14 16s14-6 14-16" />
          <path d="M28 14 36 8" />
          <path d="M34 8h4v3" />
        </>
      );
  }
}
