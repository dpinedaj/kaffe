import type { ReactNode } from "react";
import { parseCoachInline, parseCoachMarkdown } from "../lib/ai/coachMarkdown";

function Inline({ text }: { text: string }) {
  return parseCoachInline(text).map((part, i) => {
    if (part.type === "strong") {
      return (
        <strong key={i} className="font-semibold text-white">
          {part.text}
        </strong>
      );
    }
    if (part.type === "code") {
      return (
        <code key={i} className="rounded bg-card2 px-1 py-0.5 text-[12px] text-label">
          {part.text}
        </code>
      );
    }
    return <span key={i}>{part.text}</span>;
  });
}

export function CoachMarkdown({ text }: { text: string }) {
  const blocks = parseCoachMarkdown(text);
  const nodes: ReactNode[] = blocks.map((block, i) => {
    if (block.type === "ul") {
      return (
        <ul key={i} className="list-disc space-y-1.5 pl-5">
          {block.items.map((item, j) => (
            <li key={j}>
              <Inline text={item} />
            </li>
          ))}
        </ul>
      );
    }
    if (block.type === "ol") {
      return (
        <ol key={i} className="list-decimal space-y-1.5 pl-5">
          {block.items.map((item, j) => (
            <li key={j}>
              <Inline text={item} />
            </li>
          ))}
        </ol>
      );
    }
    return (
      <p key={i}>
        <Inline text={block.text} />
      </p>
    );
  });
  return <div className="space-y-2.5 text-[13px] leading-5 text-label">{nodes}</div>;
}
