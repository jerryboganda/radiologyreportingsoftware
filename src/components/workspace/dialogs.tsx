import { Fragment, useEffect, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { BadgeCheck, CircleDashed, Download, History, MessageCircleQuestion, Plus, RefreshCw, ShieldCheck, Trash2, TriangleAlert } from 'lucide-react';
import { toast } from 'sonner';
import type { ReportItem } from '../../lib/report';
import {
  MAX_REPORTERS,
  defaultProfile,
  sanitizeProfile,
  type InstitutionProfile,
  type Radiologist,
} from '../../lib/institution';
import type { WordingFlag } from '../../lib/wording';
import { ENGINE_DEFAULT_LABEL, aiCopy, modelLabel } from '../../lib/aiModel';
import { cn } from '../../lib/cn';
import { Button, Kbd, fieldClass } from '../ui/button';
import { Dialog, DialogClose, DialogContent, IconButton, PanelContent } from '../ui/overlay';
import { Skeleton } from '../ui/status';
import { ageSex, displayName, longDate, parseSheet } from './format';
import { WordingList } from './WordingList';

/* ---------- Audit sheet ---------- */

function auditVerdict(r: ReportItem, sheetStatus: string | null, flags: WordingFlag[], wordingConfirmed: boolean, aiLabel: string) {
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
    return { tone: 'success', icon: <BadgeCheck />, label: 'AI self-audit passed', note: aiCopy(aiLabel).named.auditNote } as const;
  }
  return { tone: 'info', icon: <CircleDashed />, label: 'Pending', note: 'Waiting for the AI to draft and audit this case.' } as const;
}

// Glossy like the status chips: the soft fill, a same-hue inset ring and the edge light.
const VERDICT_TONES = {
  neutral: 'bg-surface-3 text-ink-2 ring-line-strong/70',
  info: 'bg-accent-soft text-accent ring-accent/20',
  warning: 'bg-warning-soft text-warning ring-warning/25',
  success: 'bg-success-soft text-success ring-success/25',
} as const;

export function AuditDialog({
  report,
  open,
  onOpenChange,
  flags,
  wordingConfirmed,
  aiLabel,
}: {
  report: ReportItem | null;
  open: boolean;
  onOpenChange: (o: boolean) => void;
  flags: WordingFlag[];
  wordingConfirmed: boolean;
  /** The model actually running, named on the audit verdict. */
  aiLabel: string;
}) {
  // Parsed once per sheet, not on every keystroke in the report behind it.
  const sheet = useMemo(() => parseSheet(report?.verificationSheetMarkdown), [report?.verificationSheetMarkdown]);
  if (!report) return null;
  const hasReference = report.auditStatus !== 'LEGACY' && (report.verbatimTranscription?.trim().length ?? 0) >= 15;
  const { status, sections, preamble } = sheet;
  const verdict = auditVerdict(report, status, flags, wordingConfirmed, aiLabel);

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
        {/* The panel's own width (not the viewport's) decides when the sheet goes two-column. */}
        <div className="space-y-4 px-5 py-4 [container:audit/inline-size]">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
            <span className={cn('inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-sm font-semibold shadow-edge ring-1 ring-inset [&_svg]:h-4 [&_svg]:w-4', VERDICT_TONES[verdict.tone])}>
              {verdict.icon}
              {verdict.label}
            </span>
            {status && <span className="text-sm text-muted">Sheet status: <span className="font-semibold text-ink-2">{status}</span></span>}
          </div>
          <p className="text-sm text-muted">{verdict.note}</p>

          <section
            aria-label="Wording check"
            className={cn('rounded-lg border px-4 py-3 transition-colors duration-base', flags.length > 0 && !wordingConfirmed ? 'border-warning/25 bg-warning-soft' : 'border-line bg-surface-2')}
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

          {preamble && sections.length > 0 && <p className="whitespace-pre-wrap text-sm text-muted">{preamble}</p>}
          {sections.length ? (
            <dl className="divide-y divide-line overflow-hidden rounded-lg border border-line">
              {sections.map((s) => (
                <div key={s.letter + s.title} className="grid gap-x-4 gap-y-1 px-4 py-3 [@container_audit_(min-width:32rem)]:grid-cols-[10rem_minmax(0,1fr)]">
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
            <div className="rounded-lg border border-line bg-surface-2 px-4 py-8 text-center">
              <CircleDashed className="mx-auto mb-2 h-5 w-5 text-muted" aria-hidden />
              <p className="text-base text-muted">No verification sheet for this case yet.</p>
            </div>
          )}
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

  // Never truncated: this is the moment the resident confirms the right patient and study.
  const rows: [string, string][] = [
    ['Patient', report.patientName.trim()],
    ['Token', report.tokenNumber.trim() && `#${report.tokenNumber.trim()}`],
    ['Age / sex', ageSex(report)],
    ['Study', report.modality.trim()],
    ['Exam date', longDate(report.studyDate)],
  ];
  const terms = new Set(flags.map((f) => f.term)).size;

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
              <Download className="h-4 w-4" />
              Approve & download
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          <span role="status" className="sr-only">
            {busy ? 'Generating PDF…' : ''}
          </span>
          <dl className="divide-y divide-line rounded-lg border border-line">
            {rows.map(([k, v]) => (
              <div key={k} className="flex items-baseline justify-between gap-4 px-3.5 py-2">
                <dt className="shrink-0 text-sm text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-right text-base font-medium tabular-nums text-ink [overflow-wrap:anywhere]">
                  {v || <span className="font-normal italic text-muted">Not stated</span>}
                </dd>
              </div>
            ))}
          </dl>
          {flags.length > 0 && (
            <div className={cn('rounded-lg border px-3.5 py-3 transition-colors duration-base', needsWording ? 'border-warning/25 bg-warning-soft' : 'border-line bg-surface-2')}>
              <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                <TriangleAlert className={cn('h-4 w-4', needsWording ? 'text-warning' : 'text-muted')} aria-hidden />
                {needsWording ? `Not in the senior’s note: ${terms} term${terms === 1 ? '' : 's'}` : 'You already confirmed these terms'}
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

/** The handler accepts ⌘ as well as Ctrl; Mac keyboards are shown their own key. */
const MOD = typeof navigator !== 'undefined' && /Mac|iP/.test(navigator.platform) ? '⌘' : 'Ctrl';

/* ---------- AI settings ---------- */

const ENGINE_OPTIONS = [
  { value: 'antigravity', label: 'Antigravity (agy CLI)' },
  { value: 'opencode', label: 'OpenCode gateway' },
] as const;

type LoadState = 'loading' | 'ready' | 'error';

/**
 * An engine's own live list (`agy models` for Antigravity, the gateway for OpenCode). Only when the worker has
 * reported nothing yet does Antigravity fall back to its default model.
 */
const engineModels = (byEngine: Record<string, string[]>, engine: string) => {
  const reported = byEngine[engine] ?? [];
  return reported.length ? reported : engine === 'antigravity' ? [ENGINE_DEFAULT_LABEL.antigravity] : [];
};

/** Inline failure line for a dialog whose saved values could not be read; Save stays locked until they load. */
function LoadError({ what, onRetry }: { what: string; onRetry: () => void }) {
  return (
    <div role="alert" className="flex flex-wrap items-center gap-x-2 gap-y-1 rounded-md border border-danger/25 bg-danger-soft px-3 py-2 text-sm text-ink-2">
      <TriangleAlert className="h-4 w-4 shrink-0 text-danger" aria-hidden />
      <span className="min-w-0 flex-1">Couldn’t load {what}.</span>
      <Button variant="ghost" size="sm" onClick={onRetry} className="-my-1">
        <RefreshCw className="h-3.5 w-3.5" />
        Retry
      </Button>
    </div>
  );
}

export function SettingsDialog({
  open,
  onOpenChange,
  onOpenSignOff,
  workerModelsByEngine,
  workerModelLabels,
  workerVariants,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onOpenSignOff: () => void;
  /** Every model each engine reports (antigravity from `agy models`, opencode from the gateway). */
  workerModelsByEngine: Record<string, string[]>;
  workerModelLabels: Record<string, Record<string, string>>;
  workerVariants: Record<string, string[]>;
  workerEngine?: string | null;
  workerModel?: string | null;
}) {
  const id = useId();
  const [engine, setEngine] = useState('antigravity');
  const [model, setModel] = useState('');
  const [variant, setVariant] = useState('');
  const [load, setLoad] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  const [fetching, setFetching] = useState(false);
  const [fetchNote, setFetchNote] = useState('');
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ ok: boolean; detail: string } | null>(null);
  // Bumped when the dialog closes, so a connection test still polling gives up instead of running on unseen.
  const testRun = useRef(0);

  // Until the saved settings arrive the fields are locked: a quick Save must never write the defaults over them.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoad('loading');
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((s) => {
        if (cancelled) return;
        setEngine(typeof s.engine === 'string' ? s.engine : 'antigravity');
        setModel(typeof s.model === 'string' ? s.model : '');
        setVariant(typeof s.variant === 'string' ? s.variant : '');
        setLoad('ready');
      })
      .catch(() => !cancelled && setLoad('error'));
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setTestResult(null);
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
      testRun.current++;
      setTesting(false);
    };
  }, [open]);

  // When a fresh model list arrives, the placeholder note and the fetching state clear (the 3s timer is only a fallback).
  const engineCatalog = workerModelsByEngine[engine] ?? [];
  const engineLabels = workerModelLabels[engine] ?? {};
  useEffect(() => {
    if (engineCatalog.length > 0) {
      setFetchNote('');
      setFetching(false);
    }
  }, [engineCatalog]);

  const engineName = (e: string) => ENGINE_OPTIONS.find((o) => o.value === e)?.label ?? e;

  const fetchModels = async () => {
    setFetching(true);
    setFetchNote('Fetching the latest models from the worker…');
    try {
      await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'fetch_models' }) });
      setFetchNote(`The worker re-asks the ${engineName(engine)} for its models; the list updates within a few seconds. Is the worker online? If it stays empty, start it.`);
    } catch {
      setFetchNote('Could not reach the app server.');
    } finally {
      setTimeout(() => setFetching(false), 3000);
    }
  };

  const testConnection = async () => {
    const run = ++testRun.current;
    setTesting(true);
    setTestResult(null);
    const startedAt = Date.now();
    try {
      await fetch('/api/queue', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'request_test', engine, model: model.trim(), variant: effectiveVariant }) });
      for (;;) {
        await new Promise((r) => setTimeout(r, 2000));
        if (testRun.current !== run) return;
        const q = await fetch('/api/queue').then((r) => r.json()).catch(() => null);
        const t = q?.lastTest;
        if (t && t.at >= startedAt && t.engine === engine && t.model === model.trim() && String(t.variant ?? '') === effectiveVariant) {
          setTestResult({ ok: Boolean(t.ok), detail: String(t.detail ?? '') });
          break;
        }
        if (Date.now() - startedAt > 150_000) {
          setTestResult({ ok: false, detail: 'No response from the worker. Make sure it is running and the selected engine is installed.' });
          break;
        }
      }
    } catch (error) {
      if (testRun.current === run) setTestResult({ ok: false, detail: (error as Error).message });
    } finally {
      if (testRun.current === run) setTesting(false);
    }
  };

  // The saved model is always kept visible even if the list is stale.
  const modelOptions = useMemo(() => {
    const opts = engineModels(workerModelsByEngine, engine);
    return model && !opts.includes(model) ? [...opts, model] : [...opts];
  }, [engine, workerModelsByEngine, model]);

  // The effort options follow the selected model in real time; an effort that does not exist for the new model is treated as unset.
  const variantOptions = useMemo(() => workerVariants[model] ?? [], [workerVariants, model]);
  const effectiveVariant = variantOptions.includes(variant) ? variant : '';

  const save = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ engine, model: model.trim(), variant: effectiveVariant }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save settings');
      toast.success('AI settings saved', { description: `${engine} · ${model.trim()}${effectiveVariant ? ` · ${effectiveVariant}` : ''}. The worker picks it up on the next case.` });
      onOpenChange(false);
    } catch (error) {
      toast.error('Could not save settings', { description: (error as Error).message });
    } finally {
      setBusy(false);
    }
  };

  const ready = load === 'ready';
  const field = (control: ReactNode) => (ready ? control : <Skeleton className="h-9 coarse:h-11" />);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        size="sm"
        title="AI engine settings"
        description="Which CLI drafts the reports, and which model it runs."
        footer={
          <>
            <Button variant="ghost" onClick={onOpenSignOff} className="mr-auto">
              Letterhead and sign-off…
            </Button>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={save} loading={busy} disabled={!ready}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          {load === 'error' && <LoadError what="the saved AI settings" onRetry={() => setAttempt((a) => a + 1)} />}
          <fieldset disabled={!ready} aria-busy={load === 'loading'} className="min-w-0 space-y-4">
            <div className="space-y-1.5">
              <label htmlFor={`${id}-engine`} className="block text-sm font-medium text-ink">
                Engine
              </label>
              {field(
                <select
                  id={`${id}-engine`}
                  value={engine}
                  onChange={(e) => {
                    const next = e.target.value;
                    setEngine(next);
                    // The previous engine's model would otherwise be saved against this one.
                    setModel(engineModels(workerModelsByEngine, next)[0] ?? '');
                    setVariant('');
                  }}
                  className={fieldClass}
                >
                  {ENGINE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>,
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${id}-model`} className="block text-sm font-medium text-ink">
                Model
              </label>
              {field(
                modelOptions.length > 0 ? (
                  <select id={`${id}-model`} value={model} onChange={(e) => setModel(e.target.value)} aria-describedby={`${id}-model-help`} data-model-select className={fieldClass}>
                    {modelOptions.map((m) => (
                      <option key={m} value={m}>
                        {engineLabels[m] ?? modelLabel(m)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    id={`${id}-model`}
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    placeholder="e.g. deepseek-v4.1-flash"
                    aria-describedby={`${id}-model-help`}
                    className={fieldClass}
                  />
                ),
              )}
              <div className="flex items-start justify-between gap-2">
                <div id={`${id}-model-help`} role="status" className="min-w-0 space-y-1 pt-1.5 text-sm text-muted">
                  <p>
                    {fetching
                      ? 'Fetching models…'
                      : engineCatalog.length > 0
                        ? `${engineCatalog.length} model${engineCatalog.length === 1 ? '' : 's'} reported for ${engineName(engine)}.`
                        : 'No models reported. Start the worker or fetch again.'}
                  </p>
                  {fetchNote && <p>{fetchNote}</p>}
                </div>
                <Button variant="ghost" size="sm" onClick={fetchModels} loading={fetching} className="-mr-2 text-accent hover:text-accent">
                  <RefreshCw className="h-3.5 w-3.5" />
                  Fetch latest
                </Button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor={`${id}-effort`} className="block text-sm font-medium text-ink">
                Reasoning effort
              </label>
              {field(
                variantOptions.length > 0 ? (
                  <select id={`${id}-effort`} value={effectiveVariant} onChange={(e) => setVariant(e.target.value)} aria-describedby={`${id}-effort-help`} className={fieldClass}>
                    <option value="">Default (whatever the model uses)</option>
                    {variantOptions.map((v) => (
                      <option key={v} value={v}>
                        {v}
                      </option>
                    ))}
                  </select>
                ) : (
                  <p className="text-sm text-muted">No selectable reasoning effort for this model.</p>
                ),
              )}
              <p id={`${id}-effort-help`} className="text-sm text-muted">
                Updates from the selected model above; saved per engine and model.
              </p>
            </div>

            <div className="rounded-md border border-line bg-surface-2 px-3 py-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink">Connection test</span>
                <Button variant="secondary" size="sm" onClick={testConnection} loading={testing}>
                  Test connection
                </Button>
              </div>
              {/* The result can arrive minutes later, so it is announced. */}
              <div role="status" className="mt-1.5 break-words text-sm [overflow-wrap:anywhere]">
                {testing ? (
                  <p className="text-muted">
                    Asking the {engine} worker to run {model}
                    {effectiveVariant ? ` (${effectiveVariant})` : ''} on a one-word prompt…
                  </p>
                ) : testResult ? (
                  <p className="flex items-start gap-1.5 text-ink-2">
                    {testResult.ok ? (
                      <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden />
                    ) : (
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-danger" aria-hidden />
                    )}
                    <span className="min-w-0">
                      {testResult.ok ? (
                        <>
                          <span className="font-medium text-success">Connected</span> · {engine} responded{testResult.detail ? `: ${testResult.detail}` : ''}
                        </>
                      ) : (
                        <>
                          <span className="font-medium text-danger">Failed</span> · {testResult.detail}
                        </>
                      )}
                    </span>
                  </p>
                ) : (
                  <p className="text-muted">Asks the AI worker to run the selected engine and model once, then shows the reply or the error.</p>
                )}
              </div>
            </div>
          </fieldset>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ---------- Letterhead & sign-off ---------- */

// In printed order: the government line heads the letterhead.
const PROFILE_TEXT_FIELDS: [keyof Omit<InstitutionProfile, 'reportingRadiologists'>, string][] = [
  ['government', 'Government line'],
  ['department', 'Department (letterhead)'],
  ['hospital', 'Hospital (letterhead)'],
  ['hod', 'Head of Department'],
  ['hodQualification', 'Head of Department qualification'],
  ['seniorRegistrars', 'Senior Registrars'],
  ['footer', 'Footer line'],
];

/**
 * The printed letterhead and sign-off. Edits are saved as the profile every case created from now on
 * prints with; cases that already exist keep the profile they were issued with.
 */
export function SignOffSettings({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const [profile, setProfile] = useState<InstitutionProfile>(() => defaultProfile());
  const [saving, setSaving] = useState(false);
  const [load, setLoad] = useState<LoadState>('loading');
  const [attempt, setAttempt] = useState(0);
  // The row just added takes focus; after a removal focus returns to Add.
  const [focusRow, setFocusRow] = useState<number | null>(null);
  const addRef = useRef<HTMLButtonElement>(null);

  // Locked until the saved profile arrives, so nothing typed into the defaults is overwritten when it lands.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoad('loading');
    setFocusRow(null);
    fetch('/api/settings')
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((s) => {
        if (cancelled) return;
        setProfile(sanitizeProfile(s.institution));
        setLoad('ready');
      })
      .catch(() => !cancelled && setLoad('error'));
    return () => {
      cancelled = true;
    };
  }, [open, attempt]);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ institution: profile }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Could not save the letterhead');
      setProfile(sanitizeProfile(data.institution ?? profile));
      toast.success('Letterhead and sign-off saved · every new report prints this');
    } catch (error) {
      toast.error('Could not save the letterhead', { description: (error as Error).message });
    } finally {
      setSaving(false);
    }
  };

  // Local only: Save stays the single write, and Cancel still leaves the stored letterhead untouched.
  const reset = () => {
    setProfile(defaultProfile());
    setFocusRow(null);
    toast('GMCTH defaults filled in', { description: 'Save to keep them; Cancel leaves the letterhead as it was.' });
  };

  const setField = (key: keyof InstitutionProfile, value: string) => setProfile((p) => ({ ...p, [key]: value }));
  const setRadiologist = (index: number, patch: Partial<Radiologist>) =>
    setProfile((p) => ({
      ...p,
      reportingRadiologists: p.reportingRadiologists.map((doc, i) => (i === index ? { ...doc, ...patch } : doc)),
    }));

  const ready = load === 'ready';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* A large form: a stray click outside must not throw the edits away. */}
      <DialogContent
        size="lg"
        title="Letterhead and sign-off"
        description="The fixed parts printed on every report. Also editable in place on the report sheet."
        onInteractOutside={(e) => e.preventDefault()}
        footer={
          <>
            <Button variant="ghost" onClick={reset} disabled={!ready || saving} className="mr-auto">
              Reset to GMCTH defaults
            </Button>
            <DialogClose asChild>
              <Button>Cancel</Button>
            </DialogClose>
            <Button variant="primary" onClick={() => void save()} loading={saving} disabled={!ready}>
              Save
            </Button>
          </>
        }
      >
        <div className="space-y-4 px-5 py-4">
          {load === 'error' && <LoadError what="the saved letterhead" onRetry={() => setAttempt((a) => a + 1)} />}
          <fieldset disabled={!ready || saving} aria-busy={load === 'loading'} className="min-w-0 space-y-4">
            <section aria-label="Reporting radiologists" className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-ink">Primary reporting radiologists</h3>
                <Button
                  ref={addRef}
                  variant="subtle"
                  size="sm"
                  onClick={() => {
                    setFocusRow(profile.reportingRadiologists.length);
                    setProfile((p) => ({
                      ...p,
                      reportingRadiologists: [...p.reportingRadiologists, { name: '', qualification: '' }],
                    }));
                  }}
                  disabled={profile.reportingRadiologists.length >= MAX_REPORTERS}
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add radiologist
                </Button>
              </div>
              {!ready ? (
                <Skeleton className="h-9 coarse:h-11" />
              ) : profile.reportingRadiologists.length === 0 ? (
                <p className="text-sm text-muted">No radiologists listed; the block prints empty.</p>
              ) : (
                <ul className="space-y-2">
                  {profile.reportingRadiologists.map((doc, index) => (
                    // Phones: name and remove on one row, the qualification beneath.
                    <li key={index} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                      <input
                        value={doc.name}
                        onChange={(e) => setRadiologist(index, { name: e.target.value })}
                        placeholder="Name"
                        aria-label={`Radiologist ${index + 1} name`}
                        autoFocus={index === focusRow}
                        className={fieldClass}
                      />
                      <input
                        value={doc.qualification}
                        onChange={(e) => setRadiologist(index, { qualification: e.target.value })}
                        placeholder="Qualification"
                        aria-label={`Radiologist ${index + 1} qualification`}
                        className={cn(fieldClass, 'max-sm:col-start-1 max-sm:row-start-2')}
                      />
                      <IconButton
                        label={`Remove ${doc.name || `radiologist ${index + 1}`}`}
                        variant="ghost"
                        onClick={() => {
                          setFocusRow(null);
                          setProfile((p) => ({ ...p, reportingRadiologists: p.reportingRadiologists.filter((_, i) => i !== index) }));
                          requestAnimationFrame(() => addRef.current?.focus());
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </IconButton>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-label="Letterhead and footer text" className="grid gap-3 sm:grid-cols-2">
              {PROFILE_TEXT_FIELDS.map(([key, label]) => (
                <label key={key} className={cn('block space-y-1.5', key === 'footer' && 'sm:col-span-2')}>
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  {ready ? (
                    <input value={profile[key] as string} onChange={(e) => setField(key, e.target.value)} className={fieldClass} />
                  ) : (
                    <Skeleton className="h-9 coarse:h-11" />
                  )}
                </label>
              ))}
            </section>

            <p className="text-sm text-muted">
              Reports already issued keep the letterhead they were printed with. The document reference is generated per case.
            </p>
          </fieldset>
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
                  <Fragment key={k}>
                    {/* A chord reads as one combination, not a sequence. */}
                    {i > 0 && keys[0] === 'Ctrl' && (
                      <span className="text-xs text-muted" aria-hidden>
                        +
                      </span>
                    )}
                    <Kbd className={cn(i > 0 && keys[0] !== 'Ctrl' && 'ml-1')}>{k === 'Ctrl' ? MOD : k}</Kbd>
                  </Fragment>
                ))}
              </span>
            </li>
          ))}
        </ul>
      </DialogContent>
    </Dialog>
  );
}
