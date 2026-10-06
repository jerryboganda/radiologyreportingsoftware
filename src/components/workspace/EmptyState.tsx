import { useEffect, useId, useRef, useState, type ChangeEvent, type CSSProperties, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, FilePlus2, FolderSync, ImagePlus, List, LoaderCircle, MousePointerClick, Upload } from 'lucide-react';
import { cn } from '../../lib/cn';
import { spring, tween } from '../../lib/motion';
import { Button, Kbd, PRIMARY_FILL } from '../ui/button';

const imagesFrom = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

const PHOTO_LABEL = cn(
  'inline-flex h-11 shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-md font-medium',
  'press lift',
  'has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent has-[:focus-visible]:ring-offset-2 has-[:focus-visible]:ring-offset-canvas',
);
const SECONDARY_LABEL = 'border border-line-strong/80 bg-surface text-ink-2 shadow-xs hover:border-line-strong hover:bg-surface-2 hover:text-ink';
/** The cobalt halo behind the illustration, on the brand glow. */
const HALO =
  'relative isolate mx-auto before:pointer-events-none before:absolute before:-inset-x-[15%] before:-inset-y-[25%] before:-z-10 before:bg-[radial-gradient(closest-side,rgb(var(--accent)/0.16),transparent)]';
/** The page-load cascade (.intro in global.css): n-th block, 50ms apart. */
const intro = (i: number) => ({ 'data-intro': '', style: { '--i': i } as CSSProperties });

/** First run: what the product does, in its own pictures, and the three ways to start. */
export function EmptyState({ onFiles, onSyncInput, onCreate, aiLabel }: { onFiles: (files: File[]) => Promise<void>; onSyncInput: () => Promise<void>; onCreate: () => void; aiLabel: string }) {
  const [syncing, setSyncing] = useState(false);
  const [adding, setAdding] = useState(false);
  const pick = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = imagesFrom(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    setAdding(true);
    try {
      await onFiles(files);
    } finally {
      setAdding(false);
    }
  };
  const photoIcon = (icon: ReactNode) => (adding ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : icon);

  return (
    // Flex column + m-auto: centred when it fits, scrollable from the top when it does not (a centred grid clips the top).
    <div className="flex h-full flex-col overflow-y-auto px-6 py-10">
      <div className="m-auto w-full max-w-xl text-center">
        <div {...intro(1)} className={cn(HALO, 'mb-8 w-full max-w-[22rem] short:mb-5 short:max-w-[15rem]')}>
          <NoteToReport className="w-full" />
        </div>
        <h2 {...intro(2)} className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Start a report</h2>
        <p {...intro(2)} className="mx-auto mt-3 max-w-[34rem] text-md leading-relaxed text-muted">
          Photograph the senior’s note, type or dictate the positive findings, or sync the input folder. {aiLabel} drafts a complete report under AGENTS.md; you check it beside the source, then issue the PDF.
        </p>

        <ol {...intro(3)} className="mx-auto mt-7 flex max-w-[34rem] flex-col gap-3 text-left text-base text-ink-2 sm:flex-row sm:gap-6">
          {['Photograph, type or sync the note', 'The AI drafts the report', 'Verify and issue the PDF'].map((step, i) => (
            <li key={step} className="flex flex-1 items-start gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-gradient-to-b from-brand to-brand-lo text-xs font-bold text-on-accent shadow-primary">{i + 1}</span>
              <span className="pt-0.5 leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        <div {...intro(4)} className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
          {/* Mouse: one primary file picker. Touch: the camera is the primary, and the photo library stays one tap away. */}
          <label className={cn(PHOTO_LABEL, PRIMARY_FILL, 'coarse:hidden', adding && 'pointer-events-none opacity-60')}>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={pick} disabled={adding} />
            {photoIcon(<Upload className="h-4 w-4" />)}
            {adding ? 'Adding…' : 'Choose note photos'}
          </label>
          <label className={cn(PHOTO_LABEL, PRIMARY_FILL, 'hidden coarse:inline-flex', adding && 'pointer-events-none opacity-60')}>
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} disabled={adding} />
            {photoIcon(<Camera className="h-4 w-4" />)}
            {adding ? 'Adding…' : 'Take photo of note'}
          </label>
          <label className={cn(PHOTO_LABEL, SECONDARY_LABEL, 'hidden coarse:inline-flex', adding && 'pointer-events-none opacity-60')}>
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={pick} disabled={adding} />
            <ImagePlus className="h-4 w-4" />
            Choose from photos
          </label>
          <Button size="lg" onClick={onCreate}>
            <FilePlus2 className="h-4 w-4" />
            Create Report
          </Button>
          <Button
            size="lg"
            loading={syncing}
            onClick={async () => {
              setSyncing(true);
              try {
                await onSyncInput();
              } finally {
                setSyncing(false);
              }
            }}
          >
            {!syncing && <FolderSync className="h-4 w-4" />}
            Sync input folder
          </Button>
        </div>
        <p {...intro(4)} className="mt-4 hidden items-center justify-center gap-1.5 text-sm text-muted sm:flex coarse:!hidden">
          <MousePointerClick className="h-4 w-4" />
          Or drop photos anywhere on this window.
        </p>
      </div>
    </div>
  );
}

export function NoSelection({ onOpenList }: { onOpenList?: () => void }) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-10 text-center">
      <div {...intro(1)} className="m-auto">
        <div className={cn(HALO, 'mb-6 w-56 short:mb-4 short:w-44')}>
          <NoteToReport className="w-full opacity-80" />
        </div>
        <p className="text-lg font-semibold text-ink">Select a case</p>
        <p className="mt-1 text-base text-muted">Pick a note from the list to review its report.</p>
        {onOpenList && (
          <Button className="mt-4" onClick={onOpenList}>
            <List className="h-4 w-4" />
            Show case list
            <Kbd className="ml-0.5 hidden lg:inline-flex coarse:!hidden">[</Kbd>
          </Button>
        )}
      </div>
    </div>
  );
}

/** Authored illustration: a handwritten note becoming the structured, letter-headed report. */
function NoteToReport({ className }: { className?: string }) {
  const id = useId().replace(/[^\w-]/g, '');
  const shadow = `url(#${id}s)`;
  return (
    <svg viewBox="0 0 300 140" className={className} role="img" aria-label="A handwritten note turning into a structured report">
      <defs>
        {/* Both papers cast a soft shadow in the theme's shadow colour. */}
        <filter id={`${id}s`} x="-20%" y="-20%" width="140%" height="150%">
          <feDropShadow dx="0" dy="4" stdDeviation="5" style={{ floodColor: 'rgb(var(--shadow))', floodOpacity: 'var(--shadow-a3)' }} />
        </filter>
      </defs>
      <g transform="rotate(-6 60 74)" filter={shadow}>
        <rect x="16" y="22" width="88" height="104" rx="6" className="fill-note-paper stroke-line-strong" strokeWidth="1.2" />
        {[40, 54, 68, 82, 96, 110].map((y, i) => (
          <path
            key={y}
            d={`M28 ${y} q8 -5 16 0 t16 0 t16 0 ${i % 2 ? 't12 0' : 't16 0 t4 -2'}`}
            className="fill-none stroke-slate-500"
            strokeWidth="1.6"
            strokeLinecap="round"
            opacity={i === 5 ? 0.35 : 0.7}
          />
        ))}
        <circle cx="88" cy="40" r="6" className="fill-none stroke-slate-500" strokeWidth="1.4" opacity=".7" />
      </g>

      <g className="text-accent">
        <path d="M120 74 H170" className="stroke-current" strokeWidth="1.6" strokeDasharray="2 5" strokeLinecap="round" />
        <path d="M166 69 l7 5 -7 5" className="fill-none stroke-current" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M144 58 l1.6 4 4 1.6 -4 1.6 -1.6 4 -1.6 -4 -4 -1.6 4 -1.6 z" className="fill-current" />
      </g>

      <rect x="190" y="10" width="96" height="122" rx="5" className="fill-sheet stroke-sheet-line" strokeWidth="1.2" filter={shadow} />
      <circle cx="202" cy="23" r="4.5" className="fill-line-strong" />
      <circle cx="274" cy="23" r="4.5" className="fill-line-strong" />
      <rect x="214" y="19" width="48" height="4" rx="2" className="fill-brand" />
      <rect x="222" y="26" width="32" height="2.5" rx="1.25" className="fill-line-strong" />
      <rect x="198" y="34" width="56" height="2" className="fill-brand" />
      <rect x="254" y="34" width="24" height="2" className="fill-accent" />
      <rect x="198" y="43" width="34" height="3" rx="1.5" className="fill-brand" opacity=".85" />
      {[51, 57, 70, 76, 82].map((y, i) => (
        <rect key={y} x={i > 1 ? 204 : 198} y={y} width={i % 2 ? 60 : 74} height="2.5" rx="1.25" className="fill-line-strong" />
      ))}
      <rect x="198" y="64" width="26" height="3" rx="1.5" className="fill-brand" opacity=".85" />
      <circle cx="200" cy="71.2" r="1.4" className="fill-accent" />
      <circle cx="200" cy="77.2" r="1.4" className="fill-warning" />
      <circle cx="200" cy="83.2" r="1.4" className="fill-accent" />
      <rect x="198" y="94" width="80" height="30" rx="2.5" className="fill-sheet-tint stroke-line" strokeWidth="1" />
      <rect x="198" y="94" width="3" height="30" className="fill-brand" />
      <rect x="206" y="100" width="28" height="3" rx="1.5" className="fill-brand" opacity=".85" />
      <rect x="206" y="108" width="62" height="2.5" rx="1.25" className="fill-line-strong" />
      <rect x="206" y="114" width="48" height="2.5" rx="1.25" className="fill-line-strong" />
    </svg>
  );
}

/** Drag a photo anywhere over the window to start a case. Disabled while a dialog is open, so a drop never lands behind it. */
export function DropOverlay({ onFiles, disabled }: { onFiles: (files: File[]) => Promise<void>; disabled?: boolean }) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e) || disabled) return;
      e.preventDefault();
      depth.current += 1;
      setActive(true);
    };
    // Always claim file drags, even when disabled: an unclaimed drop makes the browser navigate away to the file.
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e) || disabled) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = 0;
      setActive(false);
      // Something on the page (an editor, say) already handled this drop.
      if (e.defaultPrevented) return;
      e.preventDefault();
      if (disabled) return;
      const files = imagesFrom(e.dataTransfer?.files);
      if (files.length) void onFiles(files);
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
      depth.current = 0;
      setActive(false);
    };
  }, [onFiles, disabled]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: tween.enter }}
          exit={{ opacity: 0, transition: tween.exit }}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-canvas/85 p-6"
        >
          {/* The card springs up with a slight overshoot and shrinks away in 150ms; no blur over the whole window. */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, transition: tween.exit }}
            transition={spring.pop}
            className="glass-panel flex w-full max-w-md flex-col items-center rounded-xl border border-dashed border-accent/60 px-8 py-12 text-center shadow-lg"
          >
            <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-accent-soft text-accent">
              <Upload className="h-6 w-6 motion-safe:animate-float" />
            </span>
            <p className="text-xl font-semibold text-ink">Drop to add the note</p>
            <p className="mt-1 text-base text-muted">Each photo becomes a case and goes straight to the AI queue.</p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
