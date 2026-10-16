import { Fragment, type ReactNode } from "react";

// Renders a model answer as returned: paragraphs, headings, lists and bold or italic spans.
// No HTML is interpreted, so nothing in the text can inject markup.
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /(\*\*[^*]+\*\*|\*[^*\s][^*]*\*|_[^_\s][^_]*_)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    const tok = m[0];
    if (tok.startsWith("**")) out.push(<strong key={i++}>{tok.slice(2, -2)}</strong>);
    else out.push(<em key={i++}>{tok.slice(1, -1)}</em>);
    last = m.index + tok.length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function PlainMarkdown({ text, className }: { text: string; className?: string }) {
  const blocks: ReactNode[] = [];
  const lines = text.replace(/\r/g, "").split("\n");
  let list: { ordered: boolean; start: number; items: string[] } | null = null;
  const flush = () => {
    if (!list) return;
    const Tag = list.ordered ? "ol" : "ul";
    blocks.push(
      <Tag key={`l${blocks.length}`} start={list.ordered ? list.start : undefined} style={{ margin: 0, paddingLeft: 22, display: "flex", flexDirection: "column", gap: 6 }}>
        {list.items.map((it, j) => (
          <li key={j}>{inline(it)}</li>
        ))}
      </Tag>,
    );
    list = null;
  };
  for (const raw of lines) {
    const line = raw.trimEnd();
    const ul = /^\s*[-*+]\s+(.*)$/.exec(line);
    const ol = /^\s*(\d+)[.)]\s+(.*)$/.exec(line);
    if (ul || ol) {
      const ordered = Boolean(ol);
      if (!list || list.ordered !== ordered) {
        flush();
        list = { ordered, start: ol ? Number(ol[1]) : 1, items: [] };
      }
      list.items.push(ul ? ul[1]! : ol![2]!);
      continue;
    }
    // Blank lines between items keep the list open; any other text closes it.
    if (!line.trim()) continue;
    flush();
    const h = /^#{1,6}\s+(.*)$/.exec(line);
    if (h) blocks.push(<p key={`h${blocks.length}`} style={{ fontWeight: 700 }}>{inline(h[1]!)}</p>);
    else if (/^-{3,}$/.test(line.trim())) continue;
    else blocks.push(<p key={`p${blocks.length}`}>{inline(line)}</p>);
  }
  flush();
  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      {blocks.map((b, i) => (
        <Fragment key={i}>{b}</Fragment>
      ))}
    </div>
  );
}
