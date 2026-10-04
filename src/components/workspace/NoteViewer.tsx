import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { TransformComponent, TransformWrapper, useControls, useTransformComponent } from 'react-zoom-pan-pinch';
import { FileText, ImageOff, ImageUp, Image as ImageIcon, LoaderCircle, RotateCw, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import type { ReportItem } from '../../lib/report';
import { cn } from '../../lib/cn';
import { Button } from '../ui/button';
import { IconButton, Tooltip } from '../ui/overlay';
import { Segmented } from '../ui/segmented';
import { fileName } from './format';

type Mode = 'scan' | 'text';

/** The reading-room light box: the senior's handwritten note, zoomable, with its verbatim transcript one tap away. */
export function NoteViewer({
  report,
  reading,
  readingLabel,
  readingModel,
  onReplace,
  className,
}: {
  report: ReportItem;
  /** The AI is reading this note right now (signature scan beam). */
  reading: boolean;
  /** Also say so in words (when the report pane's banner isn't on screen, i.e. the phone's Note tab). */
  readingLabel?: boolean;
  /** The model actually running, already phrased ("DeepSeek V4.1 Flash is reading the note"). */
  readingModel: string;
  onReplace: (file: File) => Promise<void>;
  className?: string;
}) {
  const [mode, setMode] = useState<Mode>('scan');
  const [broken, setBroken] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [replacing, setReplacing] = useState(false);
  const src = report.imagePath ? encodeURI(report.imagePath) : '';

  useEffect(() => {
    setBroken(false);
    setRotation(0);
  }, [report.id, report.imagePath]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReplacing(true);
    try {
      await onReplace(file);
      setMode('scan');
    } finally {
      setReplacing(false);
    }
  };

  return (
    <section aria-label="Source note" className={cn('lightbox-bg relative flex h-full min-h-0 flex-col text-slate-200', className)}>
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-white/[0.08] px-3">
        <Segmented
          label="Source view"
          tone="dark"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'scan', label: 'Scan', icon: <ImageIcon /> },
            { value: 'text', label: 'Transcript', icon: <FileText /> },
          ]}
        />
        <p className="min-w-0 flex-1 truncate text-center text-xs text-slate-400" title={report.imagePath}>
          {report.imagePath ? fileName(report.imagePath) : 'No source photo'}
        </p>
        <Tooltip content="Replace the note photo">
          <label
            aria-label="Replace the note photo"
            className={cn(
              'touch-target grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-slate-300 transition-colors duration-fast hover:bg-white/10 hover:text-white focus-within:ring-2 focus-within:ring-white/40',
              (replacing || report.status === 'PROCESSING') && 'pointer-events-none opacity-50',
            )}
          >
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} />
            {replacing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ImageUp className="h-4 w-4" />}
          </label>
        </Tooltip>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {mode === 'text' ? (
          <Transcript report={report} />
        ) : !src || broken ? (
          <MissingSource onPick={onPick} />
        ) : (
          <ZoomableNote key={src} src={src} reading={reading} rotation={rotation} onRotate={() => setRotation((r) => (r + 90) % 360)} onError={() => setBroken(true)} />
        )}
        {reading && readingLabel && <ReadingLabel label={readingModel} />}
      </div>
    </section>
  );
}

function ZoomableNote({ src, reading, rotation, onRotate, onError }: { src: string; reading: boolean; rotation: number; onRotate: () => void; onError: () => void }) {
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setSize({ w: entry.contentRect.width, h: entry.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // A quarter-turned image keeps its unrotated box, so fit it against the swapped pane dimensions.
  const sideways = rotation % 180 !== 0;
  const pad = 32;
  const maxW = Math.max(0, (sideways ? size.h : size.w) - pad);
  const maxH = Math.max(0, (sideways ? size.w : size.h) - pad);

  return (
    <div ref={box} className="absolute inset-0">
      <TransformWrapper minScale={0.6} maxScale={8} centerOnInit doubleClick={{ mode: 'toggle', step: 1.2 }} wheel={{ step: 0.12 }}>
        <TransformComponent wrapperStyle={{ width: '100%', height: '100%' }} contentStyle={{ width: '100%', height: '100%' }}>
          <div className="grid h-full w-full place-items-center">
            {/* The paper and its reading beam turn and zoom together. */}
            <div
              style={{ transform: `rotate(${rotation}deg)` }}
              className="relative overflow-hidden rounded-[3px] shadow-[0_24px_60px_-20px_rgb(0_0_0/0.8)] ring-1 ring-white/10 transition-transform duration-slow ease-out motion-reduce:transition-none"
            >
              <img
                src={src}
                alt="Senior radiologist's handwritten note"
                draggable={false}
                onError={onError}
                style={{ maxWidth: maxW || undefined, maxHeight: maxH || undefined }}
                className="block select-none bg-white object-contain"
              />
              {reading && (
                <div aria-hidden className="pointer-events-none absolute inset-0 motion-reduce:hidden">
                  <div className="scan-beam absolute inset-x-0 top-0 h-1/3 motion-safe:animate-scan-beam" />
                </div>
              )}
            </div>
          </div>
        </TransformComponent>
        <ZoomToolbar onRotate={onRotate} rotation={rotation} />
      </TransformWrapper>
    </div>
  );
}

function ZoomToolbar({ onRotate, rotation }: { onRotate: () => void; rotation: number }) {
  const { zoomIn, zoomOut, resetTransform, centerView } = useControls();
  const scale = useTransformComponent(({ state }) => state.scale);

  // Re-centre after a quarter turn so the note never drifts off-screen.
  useEffect(() => {
    centerView(1, 200);
  }, [rotation, centerView]);

  return (
    <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 bg-[#0c121c]/95 p-1 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.9)]">
      <IconButton label="Zoom out" variant="onDark" size="icon-sm" side="top" className="rounded-full" onClick={() => zoomOut(0.25)}>
        <ZoomOut className="h-4 w-4" />
      </IconButton>
      <Tooltip content="Fit to screen" side="top">
        <button
          type="button"
          onClick={() => resetTransform(250)}
          className="h-8 min-w-[3.25rem] rounded-full px-2 text-xs font-semibold tabular-nums text-slate-200 transition-colors hover:bg-white/10"
        >
          {Math.round(scale * 100)}%
        </button>
      </Tooltip>
      <IconButton label="Zoom in" variant="onDark" size="icon-sm" side="top" className="rounded-full" onClick={() => zoomIn(0.25)}>
        <ZoomIn className="h-4 w-4" />
      </IconButton>
      <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
      <IconButton label="Rotate 90°" variant="onDark" size="icon-sm" side="top" className="rounded-full" onClick={onRotate}>
        <RotateCw className="h-4 w-4" />
      </IconButton>
    </div>
  );
}

function Transcript({ report }: { report: ReportItem }) {
  const text = report.verbatimTranscription?.trim();
  return (
    <div className="absolute inset-0 overflow-y-auto p-4 sm:p-6">
      <article className="mx-auto max-w-xl rounded-md bg-[#FBFAF7] px-6 py-5 font-document text-slate-900 shadow-[0_24px_60px_-24px_rgb(0_0_0/0.85)]">
        <header className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2.5">
          <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#0F2C59]">Verbatim transcription</h2>
          {report.tokenNumber.trim() && <span className="text-sm font-bold tabular-nums text-slate-500">#{report.tokenNumber}</span>}
        </header>
        {text ? (
          <p className="whitespace-pre-wrap pt-3 text-md leading-relaxed tabular-nums">{text}</p>
        ) : (
          <div className="flex flex-col items-center py-10 text-center text-slate-500">
            <Scan className="mb-2 h-6 w-6 text-slate-400" />
            <p className="text-base font-medium text-slate-700">No transcription yet</p>
            <p className="mt-1 max-w-xs text-sm">The AI writes the line-by-line transcription when it reads the note.</p>
          </div>
        )}
      </article>
    </div>
  );
}

function MissingSource({ onPick }: { onPick: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6 text-center">
      <div className="max-w-xs">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-slate-400 ring-1 ring-white/10">
          <ImageOff className="h-5 w-5" />
        </span>
        <p className="text-base font-medium text-slate-100">Source photo missing</p>
        <p className="mt-1 text-sm text-slate-400">The photo for this case can’t be found. Attach the original note before you verify the report.</p>
        <label className="touch-target mt-4 inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3.5 text-base font-medium text-slate-100 transition-colors duration-fast hover:bg-white/10 focus-within:ring-2 focus-within:ring-white/40">
          <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} />
          <ImageUp className="h-4 w-4" />
          Attach note photo
        </label>
      </div>
    </div>
  );
}

/** Words for the reading state where the report pane's banner is out of view (phone Note tab). */
function ReadingLabel({ label }: { label: string }) {
  return (
    <div role="status" className="pointer-events-none absolute left-1/2 top-4 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white/10 bg-[#0c121c]/95 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-lg">
      <LoaderCircle className="h-3.5 w-3.5 animate-spin text-[#7da4fa]" aria-hidden />
      {label}
    </div>
  );
}
