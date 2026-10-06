import { lazy, Suspense, useId, useMemo, useRef, useState, type ReactNode } from 'react';
import { Check, ChevronsUpDown, FilePlus2, Search, Send } from 'lucide-react';
import { Popover } from 'radix-ui';
import { MODALITIES, searchRegions } from '../../lib/studies';
import { cn } from '../../lib/cn';
import { Button, fieldClass } from '../ui/button';
import { ConfirmDialog, Dialog, DialogContent, FLOAT_MOTION } from '../ui/overlay';

// Tiptap stays out of the main bundle: it downloads the first time Create Report opens.
const FindingsEditor = lazy(() => import('./CreateReportEditor'));

export interface CreateReportInput {
  patientName: string;
  age: string;
  gender: string;
  modality: string;
  region: string;
  sourceText: string;
}

/** Create Report: optional biodata + the senior's positive findings (typed or dictated) → a queued case. */
export function CreateReportDialog({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (input: CreateReportInput) => Promise<boolean> }) {
  // A fresh form each time it opens; the closing form stays mounted so its exit animation plays.
  const [session, setSession] = useState(0);
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) setSession((s) => s + 1);
  }
  return <CreateForm key={session} open={open} onOpenChange={onOpenChange} onCreate={onCreate} />;
}

function CreateForm({ open, onOpenChange, onCreate }: { open: boolean; onOpenChange: (o: boolean) => void; onCreate: (input: CreateReportInput) => Promise<boolean> }) {
  const id = useId();
  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [unit, setUnit] = useState('Years');
  const [gender, setGender] = useState('');
  const [modality, setModality] = useState('');
  const [region, setRegion] = useState('');
  // The findings text lives in a ref; only "is there any" re-renders the form, not every keystroke.
  const text = useRef('');
  const [hasText, setHasText] = useState(false);
  const [sending, setSending] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [root, setRoot] = useState<HTMLDivElement | null>(null);
  const nameRef = useRef<HTMLInputElement>(null);

  // Outside clicks never close it; Esc, the X and Cancel ask before typed or dictated findings are thrown away.
  const requestOpen = (o: boolean) => {
    if (o) return onOpenChange(true);
    if (sending) return;
    if (text.current) setConfirmDiscard(true);
    else onOpenChange(false);
  };

  const send = async () => {
    setSending(true);
    const ok = await onCreate({
      patientName: name.trim(),
      age: age.trim() ? `${age.trim()} ${unit}` : '',
      gender,
      modality,
      region,
      sourceText: text.current,
    });
    setSending(false);
    if (ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={requestOpen}>
      <DialogContent
        size="lg"
        title="Create Report"
        description="Every field is optional except the findings. Everything here goes to the AI with your findings."
        leading={
          <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
            <FilePlus2 className="h-[18px] w-[18px]" />
          </span>
        }
        onInteractOutside={(e) => e.preventDefault()}
        // Start in the first field, not on the close button.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          nameRef.current?.focus();
        }}
        footer={
          <>
            {!hasText && (
              <p id={`${id}-why`} className="mr-auto text-sm text-muted max-sm:text-center">
                Add the positive findings to send.
              </p>
            )}
            <Button onClick={() => requestOpen(false)} disabled={sending}>
              Cancel
            </Button>
            <Button variant="primary" loading={sending} disabled={!hasText} aria-describedby={hasText ? undefined : `${id}-why`} onClick={() => void send()}>
              <Send className="h-4 w-4" />
              Send to AI
            </Button>
          </>
        }
      >
        <div ref={setRoot} className="px-5 py-4">
          {/* Locked while sending. */}
          <fieldset disabled={sending} className="min-w-0 space-y-5">
            {/* One column until md: two columns crushed the Age field on phones and small tablets. */}
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Patient name">
                <input ref={nameRef} value={name} onChange={(e) => setName(e.target.value)} placeholder="Optional" autoComplete="off" className={fieldClass} />
              </Field>
              <div className="grid grid-cols-1 gap-3 min-[400px]:grid-cols-2">
                <Field label="Age">
                  <div className="flex gap-1.5">
                    <input
                      value={age}
                      onChange={(e) => setAge(e.target.value.replace(/[^\d.]/g, '').slice(0, 5))}
                      inputMode="decimal"
                      placeholder="e.g. 52"
                      className={cn(fieldClass, 'min-w-0')}
                    />
                    <select value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Age unit" className={cn(fieldClass, 'w-[5.5rem] shrink-0 px-2')}>
                      <option>Years</option>
                      <option>Months</option>
                      <option>Days</option>
                    </select>
                  </div>
                </Field>
                <Field label="Gender">
                  <select value={gender} onChange={(e) => setGender(e.target.value)} className={fieldClass}>
                    <option value="">Not stated</option>
                    <option>Male</option>
                    <option>Female</option>
                  </select>
                </Field>
              </div>
              <Field label="Modality">
                <select
                  value={modality}
                  onChange={(e) => {
                    setModality(e.target.value);
                    setRegion('');
                  }}
                  className={fieldClass}
                >
                  <option value="">Not stated</option>
                  {MODALITIES.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </Field>
              <Field label="Region">
                <RegionPicker modality={modality} value={region} onChange={setRegion} container={root} />
              </Field>
            </div>

            <div>
              <span id={`${id}-findings`} className="block text-sm font-medium text-ink">
                Positive findings <span className="font-normal text-muted">(required)</span>
              </span>
              <p id={`${id}-hint`} className="mb-1.5 mt-0.5 text-sm text-muted">
                Only what the senior listed; the AI completes the normals.
              </p>
              <div className="overflow-hidden rounded-md border border-line bg-surface transition-[border-color,box-shadow] duration-fast hover:border-line-strong focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                <Suspense fallback={<EditorPlaceholder />}>
                  <FindingsEditor
                    labelledBy={`${id}-findings`}
                    describedBy={`${id}-hint`}
                    disabled={sending}
                    onChange={(t) => {
                      text.current = t;
                      setHasText(Boolean(t));
                    }}
                  />
                </Suspense>
              </div>
            </div>
          </fieldset>
        </div>
        <ConfirmDialog
          open={confirmDiscard}
          onOpenChange={setConfirmDiscard}
          title="Discard these findings?"
          description="The findings you typed or dictated have not been sent and will be lost."
          confirmLabel="Discard"
          onConfirm={() => {
            setConfirmDiscard(false);
            onOpenChange(false);
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

/** Same footprint as the editor (toolbar + 200px box), so nothing jumps when Tiptap arrives. */
function EditorPlaceholder() {
  return (
    <div aria-hidden>
      <div className="h-10 border-b border-line bg-surface-2 coarse:h-[3.25rem]" />
      <div className="min-h-[200px]" />
    </div>
  );
}

/** A real <label>: its first control (input, select or the Region button) takes the name, and clicking it focuses the control. */
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block min-w-0">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </label>
  );
}

/** Searchable, grouped region list for the chosen modality. Anything typed that isn't listed can be used as written. */
/** `container` keeps the list inside the dialog, so the dialog's scroll lock lets the mouse wheel scroll it. */
function RegionPicker({ modality, value, onChange, container }: { modality: string; value: string; onChange: (v: string) => void; container: HTMLElement | null }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const groups = useMemo(() => searchRegions(modality, query), [modality, query]);
  const typed = query.trim();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const pick = (r: string) => {
    onChange(r);
    setOpen(false);
  };
  // Arrow keys walk the list; Up from the first item returns to the search box.
  const step = (from: Element | null, delta: 1 | -1) => {
    const items = Array.from(listRef.current?.querySelectorAll('button') ?? []);
    const i = items.indexOf(from as HTMLButtonElement);
    if (delta < 0 && i <= 0) return inputRef.current?.focus();
    items[(i + delta) % items.length]?.focus();
  };
  const option = 'w-full px-3 py-1.5 text-left transition-colors duration-fast hover:bg-surface-3/80 focus-visible:bg-surface-3/80 focus-visible:outline-none coarse:py-3';

  return (
    <Popover.Root open={open} onOpenChange={(o) => { setOpen(o); if (!o) setQuery(''); }}>
      <Popover.Trigger asChild>
        <button type="button" disabled={!modality} className={cn(fieldClass, 'flex items-center justify-between gap-2 text-left')}>
          <span className={cn('truncate', !value && 'text-muted')}>{value || (modality ? 'Search regions…' : 'Pick a modality first')}</span>
          <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted" />
        </button>
      </Popover.Trigger>
      <Popover.Portal container={container}>
        <Popover.Content
          align="start"
          sideOffset={4}
          // Above the dialog's overlay; grows from the trigger. Frosted glass: the scrim is its backdrop root, so it blurs the dialog beneath.
          className={cn(
            'z-[60] flex max-h-[min(22rem,var(--radix-popover-content-available-height))] w-[var(--radix-popover-trigger-width)] min-w-64 flex-col overflow-hidden rounded-lg border border-line/70 glass-float shadow-lg',
            'origin-[var(--radix-popover-content-transform-origin)]',
            FLOAT_MOTION,
          )}
          onOpenAutoFocus={(e) => {
            e.preventDefault();
            inputRef.current?.focus();
          }}
        >
          <div className="flex items-center gap-2 border-b border-line/70 px-3">
            <Search className="h-4 w-4 shrink-0 text-muted" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  const first = groups[0]?.regions[0] ?? typed;
                  if (first) pick(first);
                } else if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  step(null, 1);
                }
              }}
              placeholder="Search regions…"
              aria-label="Search regions"
              className="h-10 w-full bg-transparent text-base text-ink outline-none placeholder:text-muted coarse:h-11 coarse:text-lg"
            />
          </div>
          <div
            ref={listRef}
            role="group"
            aria-label="Regions"
            className="min-h-0 flex-1 overflow-y-auto py-1"
            onKeyDown={(e) => {
              if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
              e.preventDefault();
              step(document.activeElement, e.key === 'ArrowDown' ? 1 : -1);
            }}
          >
            {value && (
              <button type="button" onClick={() => pick('')} className={cn(option, 'text-sm text-muted')}>
                Clear region
              </button>
            )}
            {groups.map((g) => (
              <div key={g.group} role="group" aria-label={g.group}>
                <p aria-hidden className="px-3 pb-1 pt-2 text-xs font-medium text-muted">
                  {g.group}
                </p>
                {g.regions.map((r) => (
                  <button
                    key={r}
                    type="button"
                    aria-current={r === value || undefined}
                    onClick={() => pick(r)}
                    className={cn(option, 'flex items-center justify-between gap-2 text-base text-ink')}
                  >
                    {r}
                    {r === value && <Check className="h-4 w-4 text-accent" aria-hidden />}
                  </button>
                ))}
              </div>
            ))}
            {typed && !groups.some((g) => g.regions.some((r) => r.toLowerCase() === typed.toLowerCase())) && (
              <button type="button" onClick={() => pick(typed)} className={cn(option, 'border-t border-line/70 py-2 text-base text-ink')}>
                Other: use “{typed}”
              </button>
            )}
            {!groups.length && !typed && <p className="px-3 py-4 text-sm text-muted">No regions for this modality.</p>}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
