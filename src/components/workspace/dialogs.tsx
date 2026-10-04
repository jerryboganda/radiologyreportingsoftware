import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { BadgeCheck, CircleDashed, Download, History, MessageCircleQuestion, ShieldCheck, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportItem } from '../../lib/report';
import type { WordingFlag } from '../../lib/wording';
import { cn } from '../../lib/cn';
import { Button, Kbd } from '../ui/button';
import { Dialog, DialogClose, DialogContent, PanelContent } from '../ui/overlay';
import { ageSex, displayName, longDate, parseSheet } from './format';
import { WordingList } from './WordingList';

/* ---------- Audit sheet ---------- */

function auditVerdict(r: ReportItem, sheetStatus: string | null, flags: WordingFlag[], wordingConfirmed: boolean) {
  if (flags.length > 0 && !wordingConfirmed) {
    const terms = new Set(flags.map((f) => f.term)).size;
    return { tone: 'warning', icon: <TriangleAlert />, label: `Check wording · ${terms} term${terms === 1 ? '' : 's'}`, note: 'The AI’s own audit may say PASS, but these terms are not in the senior’s note.' } as const;
  }
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

export function AuditDialog({
  report,
  open,
  onOpenChange,
  flags,
  wordingConfirmed,
}: {
  report: ReportItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flags: WordingFlag[];
  wordingConfirmed: boolean;
}) {
  if (!report) return null;
  const hasReference = report.auditStatus !== 'LEGACY' && (report.verbatimTranscription?.trim().length ?? 0) >= 15;
  const { status, sections, preamble } = parseSheet(report.verificationSheetMarkdown);
  const verdict = auditVerdict(report, status, flags, wordingConfirmed);

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

          <section
            aria-label="Wording check"
            className={cn('rounded-lg border px-4 py-3', flags.length > 0 && !wordingConfirmed ? 'border-warning/30 bg-warning-soft' : 'border-line bg-surface-2')}
          >
            <h3 className="flex items-center gap-2 text-sm font-semibold text-ink">
              {flags.length > 0 ? <TriangleAlert className="h-4 w-4 text-warning" aria-hidden /> : <BadgeCheck className="h-4 w-4 text-success" aria-hidden />}
              Wording check
            </h3>
            {flags.length > 0 ? (
              <>
                <p className="mt-1 text-sm text-ink-2">
                  {wordingConfirmed ? 'You confirmed these terms, which the senior’s note does not contain.' : 'These terms and numbers are not in the senior’s note.'}
                </p>
                <WordingList flags={flags} limit={30} className="mt-2" />
              </>
            ) : hasReference ? (
              <p className="mt-1 text-sm text-muted">
                No serious medical term or number outside the senior’s note was found. This checks a fixed list of terms and every number, so it does not replace your own check.
              </p>
            ) : (
              <p className="mt-1 text-sm text-muted">Not available: there is no transcription of the senior’s note to compare with.</p>
            )}
          </section>

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
  flags,
  wordingConfirmed,
}: {
  report: ReportItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onConfirm: () => Promise<void>;
  flags: WordingFlag[];
  wordingConfirmed: boolean;
}) {
  const [checked, setChecked] = useState(false);
  const [wordingChecked, setWordingChecked] = useState(false);
  const needsWording = flags.length > 0 && !wordingConfirmed;
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setChecked(false);
      setWordingChecked(false);
    }
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
        size={flags.length > 0 ? 'md' : 'sm'}
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
              disabled={!checked || (needsWording && !wordingChecked)}
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
          {flags.length > 0 && (
            <div className={cn('rounded-lg border px-3.5 py-3', needsWording ? 'border-warning/30 bg-warning-soft' : 'border-line bg-surface-2')}>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <TriangleAlert className={cn('h-4 w-4', needsWording ? 'text-warning' : 'text-muted')} aria-hidden />
                {needsWording ? `Not in the senior’s note: ${new Set(flags.map((f) => f.term)).size} term${new Set(flags.map((f) => f.term)).size === 1 ? '' : 's'}` : 'You already confirmed these terms'}
              </p>
              <WordingList flags={flags} limit={6} className="mt-1.5" />
              {needsWording && (
                <label className="mt-2 flex cursor-pointer items-start gap-3 rounded-md px-1.5 py-1.5 hover:bg-warning/10">
                  <input
                    type="checkbox"
                    checked={wordingChecked}
                    onChange={(e) => setWordingChecked(e.target.checked)}
                    className="mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-line-strong accent-[rgb(var(--accent))]"
                  />
                  <span className="text-base leading-snug text-ink-2">I checked these with the senior: this is what the senior meant.</span>
                </label>
              )}
            </div>
          )}
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

/* ---------- AI settings ---------- */

const ENGINE_OPTIONS = [
  { value: 'antigravity', label: 'Antigravity (agy CLI)' },
  { value: 'opencode', label: 'OpenCode CLI' },
] as const;

export function SettingsDialog({
  open,
  onOpenChange,
  workerModels,
  workerEngine,
  workerModel,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  workerModels: string[];
  workerEngine: string | null;
  workerModel: string | null;
}) {
  const [engine, setEngine] = useState('antigravity');
  const [model, setModel] = useState('');
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch('/api/settings')
      .then((r) => r.json())
      .then((s) => {
        if (cancelled) return;
        setEngine(typeof s.engine === 'string' ? s.engine : 'antigravity');
        setModel(typeof s.model === 'string' ? s.model : '');
      })
      .catch(() => {});
    // Opening the dialog asks the worker to re-list models; the updated list arrives on its next heartbeat.
    setFetching(true);
    setFetchNote('Asking the worker for the current model list…');
    fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch_models' }) })
      .catch(() => setFetchNote('Could not reach the app server.'))
      .finally(() => {
        if (!cancelled) setTimeout(() => setFetching(false), 3000);
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // When a fresh model list arrives, the placeholder note clears.
  useEffect(() => {
    if (workerModels.length > 0) setFetchNote('');
  }, [workerModels]);

  const fetchModels = async () => {
    setFetching(true);
    setFetchNote('Fetching the latest models from the worker…');
    try {
      await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch_models' }) });
      setFetchNote('The worker re-lists `opencode models`; the list updates within a few seconds. Is the worker online? If it stays empty, start it.');
    } catch {
      setFetchNote('Could not reach the app server.');
    } finally {
      setTimeout(() => setFetching(false), 3000);
    }
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const startedAt = Date.now();
    try {
      await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_test', engine, model: model.trim() }) });
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        const q = await fetch('/api/queue').then((r) => r.json()).catch(() => null);
        const t = q?.lastTest;
        if (t && t.at >= startedAt && t.engine === engine && t.model === model.trim()) {
          setTestResult({ ok: Boolean(t.ok), detail: String(t.detail ?? '') });
          break;
        }
        if (Date.now() - startedAt > 150_000) {
          setTestResult({ ok: false, detail: 'No response from the worker. Make sure it is running and the selected engine is installed.' });
          break;
        }
      }
    } catch (error) {
      setTestResult({ ok: false, detail: (error as Error).message });
    } finally {
      setTesting(false);
    }
  };

  const modelOptions = useMemo(() => {
    if (engine === 'antigravity') return ['gemini-3.8-flash-high'];
    const opts = workerModels.length > 0 ? workerModels : [];
    return model && !opts.includes(model) ? [...opts, model] : opts;
  }, [engine, workerModels, model]);

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, model: model.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings');
      toast.success('AI settings saved', { description: `${engine} · ${model.trim()}. The worker picks it up on the next case.` });
      onOpenChange(false);
    } catch (error) {
      toast.error('Could not save settings', { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="AI engine settings"
        description="Which CLI drafts the reports, and which model it runs."
        footer={
          <>
            <DialogClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DialogClose>
            <Button onClick={save} loading={busy}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Engine</span>
            <select
              value={engine}
              onChange={(e) => setEngine(e.target.value)}
              className="h-10 w-full rounded-md border border-line bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
            >
              {ENGINE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-ink">Model</span>
            {modelOptions.length > 0 ? (
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="h-10 w-full rounded-md border border-line bg-surface px-3 text-base text-ink focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              >
                {modelOptions.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              <input
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. opencode-go/deepseek-v4-flash"
                className="h-10 w-full rounded-md border border-line bg-surface px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
              />
            )}
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-muted">
                {fetching ? 'Fetching models…' : workerModels.length > 0 ? `${workerModels.length} model${workerModels.length === 1 ? '' : 's'} reported by the worker.` : 'No models reported — start the worker or fetch again.'}
              </p>
              <button type="button" onClick={fetchModels} disabled={fetching} className="text-xs font-medium text-accent hover:underline disabled:opacity-50">
                Fetch latest
              </button>
            </div>
            <p className="text-xs text-muted">{fetchNote}</p>
          </label>

          <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium text-ink">Connection test</span>
              <Button variant="secondary" size="sm" onClick={testConnection} loading={testing}>
                Test connection
              </Button>
            </div>
            <p className="mt-1.5 text-xs text-muted">
              {testing
                ? `Asking the ${engine} worker to run ${model} on a one-word prompt…`
                : testResult
                  ? testResult.ok
                    ? `OK — ${engine} responded${testResult.detail ? `: ${testResult.detail}` : ''}`
                    : `FAILED — ${testResult.detail}`
                  : "Asks the AI worker to run the selected engine and model once; reports OK or the error."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

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
