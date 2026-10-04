import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Camera, FolderSync, List, MousePointerClick, Upload } from 'lucide-react';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';

const imagesFrom = (list: FileList | null | undefined) => Array.from(list ?? []).filter((f) => f.type.startsWith('image/'));

/** First run: what the product does, in its own pictures, and the two ways to start. */
export function EmptyState({ onFiles, onSyncInput, aiLabel }: { onFiles: (files: File[]) => Promise<void>; onSyncInput: () => Promise<void>; aiLabel: string }) {
  const [syncing, setSyncing] = useState(false);
  const pick = (e: ChangeEvent<HTMLInputElement>) => {
    void onFiles(imagesFrom(e.target.files));
    e.target.value = '';
  };

  return (
    <div className="grid h-full place-items-center overflow-y-auto bg-canvas px-6 py-10">
      <div className="w-full max-w-xl text-center">
        <NoteToReport className="mx-auto mb-8 w-full max-w-[22rem]" />
        <h2 className="text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">Start with a photo of the senior’s note</h2>
        <p className="mx-auto mt-3 max-w-[34rem] text-md leading-relaxed text-muted">
          {aiLabel} reads the handwritten positives and drafts a complete report under AGENTS.md. You check it beside the note, then issue the PDF.
        </p>

        <ol className="mx-auto mt-7 flex max-w-lg flex-col gap-3 text-left text-base text-ink-2 sm:flex-row sm:gap-6">
          {['Photograph or drop the note', 'The AI drafts the report', 'Verify and issue the PDF'].map((step, i) => (
            <li key={step} className="flex flex-1 items-start gap-2.5">
              <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-brand text-xs font-bold text-on-accent">{i + 1}</span>
              <span className="pt-0.5 leading-snug">{step}</span>
            </li>
          ))}
        </ol>

        <div className="mt-8 flex flex-col items-stretch justify-center gap-2.5 sm:flex-row sm:items-center">
          <label className="touch-target inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-5 text-md font-medium text-on-accent shadow-sm transition-[background-color,transform] duration-fast hover:bg-brand/90 focus-within:ring-2 focus-within:ring-accent/40 active:scale-[0.98] [@media(pointer:coarse)]:hidden">
            <input type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" onChange={pick} />
            <Upload className="h-4 w-4" />
            Choose note photos
          </label>
          <label className="hidden h-11 cursor-pointer items-center justify-center gap-2 rounded-lg bg-brand px-5 text-md font-medium text-on-accent shadow-sm active:scale-[0.98] [@media(pointer:coarse)]:inline-flex">
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={pick} />
            <Camera className="h-4 w-4" />
            Take photo of note
          </label>
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
        <p className="mt-4 hidden items-center justify-center gap-1.5 text-sm text-muted sm:flex">
          <MousePointerClick className="h-4 w-4" />
          Or drop photos anywhere on this window.
        </p>
      </div>
    </div>
  );
}

export function NoSelection({ onOpenList }: { onOpenList?: () => void }) {
  return (
    <div className="grid h-full place-items-center bg-canvas px-6 text-center">
      <div>
        <NoteToReport className="mx-auto mb-6 w-56 opacity-80" />
        <p className="text-lg font-semibold text-ink">Select a case</p>
        <p className="mt-1 text-base text-muted">Pick a note from the list to review its report.</p>
        {onOpenList && (
          <Button className="mt-4" onClick={onOpenList}>
            <List className="h-4 w-4" />
            Open case list
          </Button>
        )}
      </div>
    </div>
  );
}

/** Authored illustration: a handwritten note becoming the structured, letter-headed report. */
function NoteToReport({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 300 140" className={className} role="img" aria-label="A handwritten note turning into a structured report">
      <g transform="rotate(-6 60 74)">
        <rect x="16" y="22" width="88" height="104" rx="6" className="fill-[#FBFAF7] stroke-line-strong" strokeWidth="1.2" />
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

      <rect x="190" y="10" width="96" height="122" rx="5" className="fill-surface stroke-line-strong" strokeWidth="1.2" />
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

/** Drag a photo anywhere over the window to start a case. */
export function DropOverlay({ onFiles }: { onFiles: (files: File[]) => Promise<void> }) {
  const [active, setActive] = useState(false);
  const depth = useRef(0);

  useEffect(() => {
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes('Files');
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth.current += 1;
      setActive(true);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = Math.max(0, depth.current - 1);
      if (depth.current === 0) setActive(false);
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth.current = 0;
      setActive(false);
      // The sidebar drop zone already took this drop (it calls preventDefault in React, before this window listener).
      if (e.defaultPrevented) return;
      e.preventDefault();
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
    };
  }, [onFiles]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none fixed inset-0 z-[70] grid place-items-center bg-canvas/85 p-6"
        >
          <motion.div
            initial={{ scale: 0.96, y: 6 }}
            animate={{ scale: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={cn('flex w-full max-w-md flex-col items-center rounded-2xl border-2 border-dashed border-accent/60 bg-surface px-8 py-12 text-center shadow-lg')}
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
