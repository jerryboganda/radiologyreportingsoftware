import type { ReportItem } from '../../lib/report';

const time = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit' });
const dayMonth = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short' });
const full = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

/** "14:32" today, "Yesterday", "30 Sep" this year, "30 Sep 2025" otherwise. */
export function shortDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  if (d.getTime() >= startOfToday) return time.format(d);
  if (d.getTime() >= startOfToday - 86_400_000) return 'Yesterday';
  return d.getFullYear() === now.getFullYear() ? dayMonth.format(d) : full.format(d);
}

/** "2026-09-30" → "30 Sep 2026"; passes through anything that isn't an ISO date. */
export function longDate(value: string | null | undefined): string {
  if (!value) return '';
  const d = new Date(`${value}T00:00:00`);
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(d.getTime()) ? full.format(d) : value;
}

export function elapsed(fromIso: string, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - new Date(fromIso).getTime()) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const displayName = (r: Pick<ReportItem, 'patientName'>) => r.patientName.trim() || 'Untitled note';

export function ageSex(r: Pick<ReportItem, 'age' | 'gender'>): string {
  return [r.age.trim(), r.gender.trim()].filter(Boolean).join(' · ');
}

export const fileName = (path: string) => decodeURIComponent(path.split(/[/\\]/).pop() || path);

/** One entry per line without "1." / "- " markers — the same rule the print page uses. */
export const toLines = (markdown: string) =>
  markdown
    .split('\n')
    .map((line) => line.replace(/^\s*(?:[-*•]|\d+[.)])\s+/, '').trim())
    .filter(Boolean);

export interface SheetSection {
  letter: string;
  title: string;
  body: string;
}

/** Splits an AGENTS.md §11.2 verification sheet ("STATUS: …", "A. HEADER VARIABLES …") into its parts. */
export function parseSheet(markdown: string | null | undefined): { status: string | null; sections: SheetSection[]; preamble: string } {
  const sections: SheetSection[] = [];
  const preamble: string[] = [];
  let status: string | null = null;
  for (const raw of (markdown ?? '').split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const statusMatch = !sections.length && line.match(/^\s*STATUS:\s*([A-Z_ |]+)/i);
    if (statusMatch) {
      status = statusMatch[1].split('|')[0].trim().toUpperCase();
      continue;
    }
    const head = line.match(/^\s*([A-H])\.\s+([A-Z][A-Z \-/&]+?)(?:\s*:\s*|\s{2,}|$)(.*)$/);
    if (head) {
      sections.push({ letter: head[1], title: titleCase(head[2]), body: head[3].trim() });
    } else if (sections.length) {
      const last = sections[sections.length - 1];
      last.body = last.body ? `${last.body}\n${line}` : line;
    } else if (line.trim()) {
      preamble.push(line);
    }
  }
  for (const s of sections) s.body = s.body.replace(/^\n+|\n+$/g, '');
  return { status, sections, preamble: preamble.join('\n') };
}

/** The AI's open questions for a BLOCKED case: §6.4 numbered items, else the audit section text. */
export function clarifications(markdown: string | null | undefined): string[] {
  const { sections } = parseSheet(markdown);
  const audit = sections.find((s) => s.letter === 'H')?.body ?? '';
  const source = audit || (markdown ?? '');
  const items = source
    .split('\n')
    .map((l) => l.match(/^\s*\d+[.)]\s*(?:Item:\s*)?(.+)$/i)?.[1]?.trim())
    .filter((l): l is string => Boolean(l));
  if (items.length) return items;
  return audit
    .split('\n')
    .map((l) => l.replace(/^\s*(?:[-*•]|CLARIFICATION NEEDED:?)\s*/i, '').trim())
    .filter((l) => l && !/^(PASS|BLOCKED)$/i.test(l));
}

const titleCase = (s: string) =>
  s
    .trim()
    .toLowerCase()
    .replace(/\b(ai)\b/g, 'AI')
    .replace(/^./, (c) => c.toUpperCase());
