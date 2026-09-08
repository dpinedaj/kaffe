export type CoachMdBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "ol"; items: string[] };

const UL = /^[-*]\s+(.*)$/;
const OL = /^\d+\.\s+(.*)$/;

export function parseCoachMarkdown(text: string): CoachMdBlock[] {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const blocks: CoachMdBlock[] = [];
  let para: string[] = [];
  let ul: string[] = [];
  let ol: string[] = [];

  function flushPara() {
    const joined = para.join(" ").trim();
    if (joined) blocks.push({ type: "p", text: joined });
    para = [];
  }
  function flushUl() {
    if (ul.length) blocks.push({ type: "ul", items: ul });
    ul = [];
  }
  function flushOl() {
    if (ol.length) blocks.push({ type: "ol", items: ol });
    ol = [];
  }

  for (const raw of lines) {
    const line = raw.trimEnd();
    const ulMatch = line.trim().match(UL);
    const olMatch = line.trim().match(OL);
    if (ulMatch) {
      flushPara();
      flushOl();
      ul.push(ulMatch[1]);
      continue;
    }
    if (olMatch) {
      flushPara();
      flushUl();
      ol.push(olMatch[1]);
      continue;
    }
    if (line.trim() === "") {
      flushPara();
      flushUl();
      flushOl();
      continue;
    }
    flushUl();
    flushOl();
    para.push(line.trim());
  }
  flushPara();
  flushUl();
  flushOl();
  return blocks;
}

export type CoachInlinePart =
  | { type: "text"; text: string }
  | { type: "strong"; text: string }
  | { type: "code"; text: string };

export function parseCoachInline(text: string): CoachInlinePart[] {
  const parts: CoachInlinePart[] = [];
  const re = /\*\*([^*]+)\*\*|`([^`]+)`/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    if (m.index > last) parts.push({ type: "text", text: text.slice(last, m.index) });
    if (m[1] != null) parts.push({ type: "strong", text: m[1] });
    else if (m[2] != null) parts.push({ type: "code", text: m[2] });
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push({ type: "text", text: text.slice(last) });
  return parts.length ? parts : [{ type: "text", text }];
}
