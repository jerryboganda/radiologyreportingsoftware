import { useEffect, useState, type ReactNode } from 'react';
import { BadgeCheck, CircleDashed, Download, History, MessageCircleQuestion, ShieldCheck } from 'lucide-react';
import type { ReportItem } from '../../lib/report';
import { cn } from '../../lib/cn';
import { Button, Kbd } from '../ui/button';
import { Dialog, DialogClose, DialogContent, PanelContent } from '../ui/overlay';
import { ageSex, displayName, longDate, parseSheet } from './format';

/* ---------- Audit sheet ---------- */

function auditVerdict(r: ReportItem, sheetStatus: string | null) {
  if (!r.verificationSheetMarkdown?.trim()) {
    return { tone: 'neutral', icon: <CircleDashed />, label: 'Not audited yet', note: 'The AI writes this sheet when it drafts the report.' } as const;
  }
  if (r.auditStatus === 'LEGACY') {
    return { tone: 'neutral', icon: <History />, label: 'Legacy record · not audited in-app', note: 'This sheet predates in-app auditing; treat it as unverified.' } as const;
  }
  if (r.auditStatus === 'BLOCKED' || sheetStatus === 'BLOCKED') {
    return { tone: 'warning', icon: <MessageCircleQuestion />, label: 'Blocked · clarification needed', note: 'The AI stopped instead of guessing (AGENTS.md §6.4).' } as const;
  }
  if (r.auditStatus === 'PASS') {
    return { tone: 'success', icon: <BadgeCheck />, label: 'AI self-audit passed', note: 'Gemini 3.8 Flash ran the AGENTS.md §10 final audit. You still verify before signing.' } as const;
  }
  return { tone: 'info', icon: <CircleDashed />, label: 'Pending', note: 'Waiting for the AI to draft and audit this case.' } as const;
}

const VERDICT_TONES = {
  neutral: 'bg-surface-3 text-ink-2',
  info: 'bg-accent-soft text-accent',
  warning: 'bg-warning-soft text-warning',
  success: 'bg-success-soft text-success',
} as const;

export function AuditDialog({ report, open, onOpenChange }: { report: ReportItem | null; open: boolean; onOpenChange: (o: boolean) => void }) {
  if (!report) return null;
  const { status, sections, preamble } = parseSheet(report.verificationSheetMarkdown);
  const verdict = auditVerdict(report, status);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} modal={false}>
      <PanelContent
        leading={
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <ShieldCheck className="h-[18px] w-[18px]" />
          </span>
        }
        title="Verification sheet"
        description={
          <>
            {displayName(report)}
            {report.tokenNumber.trim() && <span className="tabular-nums"> · #{report.tokenNumber}</span>}
          </>
        }
        footer={
          <>
            <span className="mr-auto text-sm text-muted">Rulebook: AGENTS.md</span>
            <DialogClose asChild>
              <Button>Close</Button>
            </DialogClose>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold [&_svg]:h-4 [&_svg]:w-4', VERDICT_TONES[verdict.tone])}>
              {verdict.icon}
              {verdict.label}
            </span>
            {status && <span className="text-sm text-muted">Sheet status: <span className="font-semibold text-ink-2">{status}</span></span>}
          </div>
          <p className="text-sm text-muted">{verdict.note}</p>

          {sections.length ? (
            <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {sections.map((s) => (
                <div key={s.letter + s.title} className="grid gap-x-4 gap-y-1 px-4 py-3 md:grid-cols-[10rem_minmax(0,1fr)]">
                  <dt className="flex items-start gap-2 text-sm font-semibold text-ink">
                    <span className="grid h-5 w-5 shrink-0 place-items-center rounded bg-surface-3 text-xs font-bold text-brand-ink">{s.letter}</span>
                    {s.title}
                  </dt>
                  <dd className="whitespace-pre-wrap break-words font-document text-md leading-relaxed text-ink-2">{s.body || <span className="italic text-muted">Empty</span>}</dd>
                </div>
              ))}
            </dl>
          ) : report.verificationSheetMarkdown?.trim() ? (
            <pre className="whitespace-pre-wrap break-words rounded-lg border border-line bg-surface-2 p-4 font-document text-md leading-relaxed text-ink-2">
              {report.verificationSheetMarkdown}
            </pre>
          ) : (
            <p className="rounded-lg border border-dashed border-line px-4 py-8 text-center text-base text-muted">No verification sheet for this case yet.</p>
          )}
          {preamble && sections.length > 0 && <p className="whitespace-pre-wrap text-sm text-muted">{preamble}</p>}
        </div>
      </PanelContent>
    </Dialog>
  );
}

/* ---------- Approve & issue ---------- */

export function ApproveDialog({
  report,
  open,
  onOpenChange,
  onConfirm,
}: {
  report: ReportItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) setChecked(false);
  }, [open]);

  if (!report) return null;

  const rows: [string, ReactNode][] = [
    ['Patient', displayName(report)],
    ['Token', report.tokenNumber.trim() ? `#${report.tokenNumber}` : 'Not stated'],
    ['Age / sex', ageSex(report) || 'Not stated'],
    ['Study', report.modality || 'Not stated'],
    ['Exam date', longDate(report.studyDate) || 'Not stated'],
  ];

  return (
    <Dialog open={open} onOpenChange={(o) => !busy && onOpenChange(o)}>
      <DialogContent
        size="sm"
        title="Approve and issue this report?"
        description="The PDF is generated now and the case becomes Finalized (read-only until reopened)."
        footer={
          <>
            <DialogClose asChild>
              <Button autoFocus disabled={busy}>
                Cancel
              </Button>
            </DialogClose>
            <Button
              variant="primary"
              disabled={!checked}
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await onConfirm();
                } finally {
                  setBusy(false);
                }
              }}
            >
              {!busy && <Download className="h-4 w-4" />}
              {busy ? 'Generating PDF…' : 'Approve & download'}
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <dl className="divide-y divide-line rounded-lg border border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-3.5 py-2">
                <dt className="text-sm text-muted">{k}</dt>
                <dd className="min-w-0 truncate text-right text-base font-medium tabular-nums text-ink">{v}</dd>
              </div>
            ))}
          </dl>
          <label className="flex cursor-pointer items-start gap-3 rounded-lg border border-line bg-surface-2 px-3.5 py-3 transition-colors hover:border-line-strong has-[:checked]:border-accent/40 has-[:checked]:bg-accent-soft">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-[rgb(var(--accent))]"
            />
            <span className="text-base leading-snug text-ink-2">I have checked every finding, side and measurement against the source note.</span>
          </label>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Keyboard shortcuts ---------- */

const SHORTCUTS: [string[], string][] = [
  [['/'], 'Search cases'],
  [['J'], 'Next case'],
  [['K'], 'Previous case'],
  [['↑', '↓'], 'Move through the case list'],
  [['Ctrl', 'S'], 'Save now'],
  [['F'], 'Focus on the report'],
  [['['], 'Show or hide the case list'],
  [['?'], 'Show this list'],
  [['Esc'], 'Close a dialog'],
];

export function ShortcutsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" title="Keyboard shortcuts" description="Work through the queue without leaving the keyboard.">
        <ul className="divide-y divide-line px-5 py-2">
          {SHORTCUTS.map(([keys, label]) => (
            <li key={label} className="flex items-center justify-between gap-4 py-2.5">
              <span className="text-base text-ink-2">{label}</span>
              <span className="flex items-center gap-1">
                {keys.map((k, i) => (
                  <Kbd key={k} className={cn(i > 0 && keys[0] !== 'Ctrl' && 'ml-1')}>{k}</Kbd>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
