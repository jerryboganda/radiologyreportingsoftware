import { memo, useLayoutEffect, useRef, useState, type ChangeEvent, type ReactNode, type SyntheticEvent } from 'react';
import { AnimatePresence, motion, useReducedMotion, useSpring } from 'motion/react';
import { TransformComponent, TransformWrapper, useControls, useTransformComponent, type ReactZoomPanPinchContextState } from 'react-zoom-pan-pinch';
import { FileText, ImageOff, ImageUp, Image as ImageIcon, Keyboard, LoaderCircle, RotateCcw, RotateCw, Scan, ZoomIn, ZoomOut } from 'lucide-react';
import type { ReportItem } from '../../lib/report';
import { cn } from '../../lib/cn';
import { drift, ease } from '../../lib/motion';
import { Button } from '../ui/button';
import { IconButton, Tooltip } from '../ui/overlay';
import { Segmented } from '../ui/segmented';
import { fileName } from './format';

type Mode = 'scan' | 'text';

interface NoteViewerProps {
  report: ReportItem;
  /** The AI is reading this note right now (signature scan beam). */
  reading: boolean;
  /** Also say so in words (when the report pane's banner isn't on screen, i.e. the phone's Note tab). */
  readingLabel?: boolean;
  /** The model actually running, already phrased ("DeepSeek V4.1 Flash is reading the note"). */
  readingModel: string;
  onReplace: (file: File) => Promise<void>;
  /** Locked or archived case: the photo can be viewed but not replaced. */
  readOnly?: boolean;
  className?: string;
}

/** The reading-room light box: the senior's handwritten note, zoomable, with its verbatim transcript one tap away. */
export const NoteViewer = memo(function NoteViewer({ report, reading, readingLabel, readingModel, onReplace, readOnly, className }: NoteViewerProps) {
  const [mode, setMode] = useState<Mode>('scan');
  const [replacingId, setReplacingId] = useState<string | null>(null);
  const [brokenSrc, setBrokenSrc] = useState('');
  const [retry, setRetry] = useState(0);
  const typed = !!report.sourceText?.trim();
  const src = report.imagePath ? encodeURI(report.imagePath) + (retry ? `?r=${retry}` : '') : '';
  const broken = !!src && brokenSrc === src;
  // The spinner belongs to the case the upload started on, not whichever case is open now.
  const replacing = replacingId === report.id;
  const busy = replacing || report.status === 'PROCESSING';
  const canReplace = !readOnly && !typed;
  const labelled = reading && !!readingLabel;
  const showText = !typed && mode === 'text';
  // Parallax: the backlight drifts opposite a mouse pointer; never for touch or pen, while panning, or under reduced motion.
  const reduce = useReducedMotion();
  const gx = useSpring(0, drift);
  const gy = useSpring(0, drift);
  const box = useRef<DOMRect | null>(null);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setReplacingId(report.id);
    try {
      await onReplace(file);
      setMode('scan');
    } finally {
      setReplacingId(null);
    }
  };

  return (
    <section
      aria-label="Source note"
      data-vt-name="note"
      className={cn('lightbox-field relative isolate flex h-full min-h-0 flex-col overflow-hidden text-slate-200 [container:note/inline-size]', className)}
      onPointerEnter={
        reduce
          ? undefined
          : (e) => {
              box.current = e.currentTarget.getBoundingClientRect();
            }
      }
      onPointerMove={
        reduce
          ? undefined
          : (e) => {
              const b = box.current;
              if (!b || e.pointerType !== 'mouse' || e.buttons) return;
              gx.set(((e.clientX - b.left) / b.width - 0.5) * -28);
              gy.set(((e.clientY - b.top) / b.height - 0.5) * -20);
            }
      }
      onPointerLeave={() => {
        gx.set(0);
        gy.set(0);
      }}
    >
      {/* The cool backlight behind the paper; the field itself never animates. */}
      <motion.div aria-hidden className="lightbox-glow pointer-events-none absolute -inset-6 -z-10" style={{ x: gx, y: gy }} />
      {/* box-content h-11 + border = 45px, the same row as the report pane's section nav hairline. */}
      <div className="box-content flex h-11 shrink-0 items-center gap-3 border-b border-white/[0.08] px-3">
        {typed ? (
          <p className="flex min-w-0 items-center gap-2 text-sm font-medium text-slate-200">
            <Keyboard className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate">Typed findings</span>
          </p>
        ) : (
          <Segmented
            label="Source view"
            tone="dark"
            value={mode}
            onChange={setMode}
            className="shrink-0 [&_button>span]:sr-only note-wide:[&_button>span]:not-sr-only"
            options={[
              { value: 'scan', label: 'Scan', icon: <ImageIcon /> },
              { value: 'text', label: 'Transcript', icon: <FileText /> },
            ]}
          />
        )}
        {!typed && (
          <p className="hidden min-w-0 flex-1 truncate text-right text-xs text-slate-400 note-wide:block" title={report.imagePath || undefined}>
            {report.imagePath ? fileName(report.imagePath) : 'No source photo'}
          </p>
        )}
        {canReplace && (
          <Tooltip content="Replace the note photo">
            <label
              aria-busy={replacing || undefined}
              className={cn(
                'touch-target ml-auto grid h-8 w-8 shrink-0 cursor-pointer place-items-center rounded-md text-slate-300 transition-colors duration-fast hover:bg-white/10 hover:text-white',
                'has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#7DA4FA]',
                busy && 'pointer-events-none opacity-50',
              )}
            >
              <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Replace the note photo" disabled={busy} className="sr-only" onChange={onPick} />
              {replacing ? <LoaderCircle className="h-4 w-4 motion-safe:animate-spin" /> : <ImageUp className="h-4 w-4" />}
            </label>
          </Tooltip>
        )}
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden">
        {typed ? (
          <NotePage key={report.id} inset={labelled}>
            <TypedNote report={report} reading={reading} />
          </NotePage>
        ) : (
          <>
            {/* Stays mounted under the transcript so zoom, pan and rotation survive a Scan ↔ Transcript check. */}
            {src && !broken ? (
              <ZoomableNote key={src} src={src} reading={reading} labelled={labelled} hidden={showText} onError={() => setBrokenSrc(src)} />
            ) : (
              !showText && <MissingSource broken={broken} onRetry={() => setRetry((n) => n + 1)} onPick={canReplace ? onPick : undefined} />
            )}
            {showText && (
              <NotePage key={report.id} inset={labelled}>
                <Transcript report={report} />
              </NotePage>
            )}
          </>
        )}
        {/* Always mounted so screen readers announce the reading state when it appears. */}
        <div role="status" className="pointer-events-none absolute inset-x-0 top-4 z-20 flex justify-center px-4">
          {labelled && (
            <p className="glass-dark flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-slate-200 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_12px_32px_-12px_rgb(0_0_0/0.9)] animate-in fade-in-0 slide-in-from-top-1 duration-200">
              <LoaderCircle className="h-3.5 w-3.5 shrink-0 text-[#7da4fa] motion-safe:animate-spin" aria-hidden />
              <span className="truncate">{readingModel}</span>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}, sameNote);

/** Report fields the light box shows; the draft object changes on every keystroke and poll, these rarely do. */
const SHOWN = ['id', 'imagePath', 'sourceText', 'verbatimTranscription', 'tokenNumber', 'modality', 'patientName', 'age', 'gender', 'status'] as const;

function sameNote({ report: a, ...p }: NoteViewerProps, { report: b, ...q }: NoteViewerProps) {
  const keys = Object.keys(p) as (keyof typeof p)[];
  return SHOWN.every((k) => a[k] === b[k]) && keys.length === Object.keys(q).length && keys.every((k) => p[k] === q[k]);
}

// Hoisted so the zoom engine isn't reconfigured on every render.
const WHEEL = { step: 0.002 };
const KEYBOARD = { disabled: false, panStep: 64, zoomStep: 0.25, animationTime: 120, animationType: 'easeOutQuint' } as const;
const NO_OVERSHOOT = { size: 0 };
const ALIGN = { animationType: 'easeOutQuint' } as const;
const DOUBLE_ZOOM = { mode: 'zoomIn', step: 1.5, animationTime: 260, animationType: 'easeOutQuint' } as const;
const DOUBLE_RESET = { ...DOUBLE_ZOOM, mode: 'reset' } as const;
const WRAPPER_STYLE = { width: '100%', height: '100%', touchAction: 'none' } as const;
const CONTENT_STYLE = { width: '100%', height: '100%' };
const WRAPPER_PROPS = { role: 'group', 'aria-label': 'Note photo. Arrow keys pan, plus and minus zoom, 0 fits.' };

function ZoomableNote({ src, reading, labelled, hidden, onError }: { src: string; reading: boolean; labelled: boolean; hidden: boolean; onError: () => void }) {
  const area = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  // Lives here, keyed by src, so a case switch never inherits the last note's turn.
  const [rotation, setRotation] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  // Measure before first paint (layout size, unaffected by the zoom transform).
  useLayoutEffect(() => {
    const el = area.current;
    if (!el) return;
    const measure = () => setSize((s) => (s.w === el.clientWidth && s.h === el.clientHeight ? s : { w: el.clientWidth, h: el.clientHeight }));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const onLoad = (e: SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    img
      .decode()
      .catch(() => {})
      .then(() => setNat({ w: img.naturalWidth, h: img.naturalHeight }));
  };

  // Fit the unrotated paper to the free area; a quarter turn rescales in the same transform, so it turns and fits in one motion.
  const fit = nat && size.w && size.h ? Math.min(size.w / nat.w, size.h / nat.h) : 0;
  const sideways = (rotation / 90) % 2 === 1;
  const k = nat && fit && sideways ? Math.min(size.w / (nat.h * fit), size.h / (nat.w * fit)) : 1;
  // Arrives once decoded (not on every re-fit), so a focus-mode collapse and expand never replays it.
  const ready = !!nat;

  return (
    <div className={cn('absolute inset-0', hidden && 'invisible')} inert={hidden}>
      <TransformWrapper
        minScale={0.6}
        maxScale={8}
        smooth
        wheel={WHEEL}
        keyboard={KEYBOARD}
        zoomAnimation={NO_OVERSHOOT}
        autoAlignment={ALIGN}
        doubleClick={zoomed ? DOUBLE_RESET : DOUBLE_ZOOM}
        onTransform={(_, s) => setZoomed(s.scale > 1.02)}
      >
        <TransformComponent
          wrapperStyle={WRAPPER_STYLE}
          contentStyle={CONTENT_STYLE}
          wrapperProps={WRAPPER_PROPS}
          wrapperClass={cn('focus-visible:outline-offset-[-2px]', zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
        >
          <div className="relative h-full w-full">
            {/* The free area: clear of the zoom dock at the bottom (and the phone reading label at the top). */}
            <div
              ref={area}
              className={cn(
                'absolute inset-x-4 bottom-[max(84px,calc(env(safe-area-inset-bottom)+76px))] grid place-items-center transition-[opacity,transform] duration-slow ease-out motion-reduce:transform-none',
                labelled ? 'top-[60px]' : 'top-4',
                ready ? 'opacity-100' : 'scale-[0.985] opacity-0',
              )}
            >
              {/* The paper and its reading beam turn and zoom together. */}
              <div
                style={{ width: nat ? nat.w * fit : undefined, height: nat ? nat.h * fit : undefined, transform: `rotate(${rotation}deg) scale(${k})` }}
                className="relative max-h-full max-w-full overflow-hidden rounded-[3px] shadow-note transition-transform duration-slow ease-out motion-reduce:transition-none"
              >
                <img
                  src={src}
                  alt="Senior radiologist's handwritten note"
                  decoding="async"
                  draggable={false}
                  onLoad={onLoad}
                  onError={onError}
                  className="block h-full w-full select-none bg-white"
                />
                <ScanBeam reading={reading} />
              </div>
            </div>
          </div>
        </TransformComponent>
        <ZoomToolbar rotation={rotation} onRotate={() => setRotation((r) => r + 90)} />
      </TransformWrapper>
    </div>
  );
}

const selectPct = ({ state }: ReactZoomPanPinchContextState) => Math.round(state.scale * 100);

function ZoomToolbar({ rotation, onRotate }: { rotation: number; onRotate: () => void }) {
  const { zoomIn, zoomOut, resetTransform, instance } = useControls();
  const pct = useTransformComponent(selectPct);

  return (
    <div className="glass-dark absolute bottom-[max(1rem,calc(env(safe-area-inset-bottom)+0.5rem))] left-1/2 z-10 flex -translate-x-1/2 items-center gap-0.5 rounded-full border border-white/10 p-1 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_12px_32px_-12px_rgb(0_0_0/0.9)]">
      {/* Multiplicative steps: every click is the same visual change at any zoom. */}
      <IconButton
        label="Zoom out"
        variant="onDark"
        size="icon-sm"
        side="top"
        className="rounded-full"
        disabled={pct <= 60}
        onClick={() => zoomOut(instance.state.scale * 0.2, 180, 'easeOutQuint')}
      >
        <ZoomOut className="h-4 w-4" />
      </IconButton>
      <Tooltip content="Fit to screen" side="top">
        <Button
          variant="onDark"
          size="sm"
          aria-label={`Fit to screen, ${pct}%`}
          className="min-w-[3.25rem] rounded-full font-semibold tabular-nums text-slate-200"
          onClick={() => resetTransform(260, 'easeOutQuint')}
        >
          {pct}%
        </Button>
      </Tooltip>
      <IconButton
        label="Zoom in"
        variant="onDark"
        size="icon-sm"
        side="top"
        className="rounded-full"
        disabled={pct >= 800}
        onClick={() => zoomIn(instance.state.scale * 0.25, 180, 'easeOutQuint')}
      >
        <ZoomIn className="h-4 w-4" />
      </IconButton>
      <span className="mx-1 h-4 w-px bg-white/15" aria-hidden />
      <IconButton
        label="Rotate 90°"
        variant="onDark"
        size="icon-sm"
        side="top"
        className="rounded-full"
        onClick={() => {
          onRotate();
          resetTransform(260, 'easeOutQuint');
        }}
      >
        <RotateCw style={{ transform: `rotate(${rotation}deg)` }} className="h-4 w-4 transition-transform duration-slow ease-out motion-reduce:transition-none" />
      </IconButton>
    </div>
  );
}

/**
 * The AI reading the paper: a cobalt beam with carriage ticks and an afterglow (fades in 200ms, out 300ms).
 * Under reduced motion the beam is hidden and a static cobalt ring marks the paper being read instead.
 */
function ScanBeam({ reading }: { reading: boolean }) {
  return (
    <AnimatePresence>
      {reading && (
        <motion.div
          key="beam"
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1, transition: { duration: 0.2, ease: ease.out } }}
          exit={{ opacity: 0, transition: { duration: 0.3, ease: ease.out } }}
          className="pointer-events-none absolute inset-0"
        >
          <div className="scan-beam absolute inset-x-0 top-0 h-1/3 motion-safe:animate-scan-beam motion-reduce:hidden" />
          <div className="absolute inset-0 hidden rounded-[inherit] ring-2 ring-inset ring-[#7da4fa]/70 motion-reduce:block" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** A note-paper page centred in the light box, scrolling inside it when long. */
function NotePage({ inset, children }: { inset: boolean; children: ReactNode }) {
  return (
    <div className={cn('absolute inset-0 flex overflow-y-auto p-4 sm:p-6', inset && 'pt-14 sm:pt-14')}>
      <article className="relative m-auto w-full max-w-xl overflow-hidden rounded-[6px] bg-note-paper px-6 py-5 font-document text-slate-900 shadow-note animate-in fade-in-0 zoom-in-[0.985] duration-slow ease-out">
        {children}
      </article>
    </div>
  );
}

function Transcript({ report }: { report: ReportItem }) {
  const text = report.verbatimTranscription?.trim();
  return (
    <>
      <header className="flex items-baseline justify-between gap-3 border-b border-slate-200 pb-2.5">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#0F2C59]">Verbatim transcription</h2>
        {report.tokenNumber.trim() && <span className="text-sm font-bold tabular-nums text-slate-500">#{report.tokenNumber}</span>}
      </header>
      {text ? (
        <p className="whitespace-pre-wrap break-words pt-3 text-md leading-relaxed tabular-nums">{text}</p>
      ) : (
        <div className="flex flex-col items-center py-10 text-center font-sans text-slate-500">
          <Scan className="mb-2 h-6 w-6 text-slate-400" />
          <p className="text-base font-medium text-slate-700">No transcription yet</p>
          <p className="mt-1 max-w-xs text-sm">The AI writes the line-by-line transcription when it reads the note.</p>
        </div>
      )}
    </>
  );
}

/** The findings typed or dictated in Create Report: the senior's note when there is no photo. */
function TypedNote({ report, reading }: { report: ReportItem; reading: boolean }) {
  const biodata = [report.patientName, report.age, report.gender].map((s) => s?.trim()).filter(Boolean).join(' · ');
  return (
    <>
      <header className="border-b border-slate-200 pb-2.5">
        <h2 className="text-sm font-extrabold uppercase tracking-[0.08em] text-[#0F2C59]">Typed findings</h2>
        {report.modality.trim() && <p className="mt-0.5 text-sm font-medium text-slate-700">{report.modality}</p>}
        {biodata && <p className="text-sm text-slate-500">{biodata}</p>}
      </header>
      <p className="whitespace-pre-wrap break-words pt-3 text-md leading-relaxed">{report.sourceText}</p>
      <ScanBeam reading={reading} />
    </>
  );
}

/** No photo on file, or one that failed to load (often transient, so it offers a retry). */
function MissingSource({ broken, onRetry, onPick }: { broken: boolean; onRetry: () => void; onPick?: (e: ChangeEvent<HTMLInputElement>) => void }) {
  return (
    <div className="absolute inset-0 grid place-items-center p-6 text-center animate-in fade-in-0 duration-200">
      <div className="max-w-xs">
        <span className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-white/[0.06] text-slate-400 ring-1 ring-white/10">
          <ImageOff className="h-5 w-5" />
        </span>
        <p className="text-base font-medium text-slate-100">{broken ? 'Couldn’t load the note photo' : 'Source photo missing'}</p>
        <p className="mt-1 text-sm text-slate-400">
          {broken
            ? 'The photo didn’t load. Try again, or attach the original note if it keeps failing.'
            : onPick
              ? 'The photo for this case can’t be found. Attach the original note before you verify the report.'
              : 'The photo for this case can’t be found.'}
        </p>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
          {broken && (
            <Button variant="onDark" size="md" className="border border-white/15 text-slate-100" onClick={onRetry}>
              <RotateCcw className="h-4 w-4" />
              Try again
            </Button>
          )}
          {onPick && (
            <label className="touch-target inline-flex h-9 cursor-pointer items-center gap-2 rounded-md border border-white/15 px-3.5 text-base font-medium text-slate-100 transition-colors duration-fast hover:bg-white/10 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-[#7DA4FA]">
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={onPick} />
              <ImageUp className="h-4 w-4" />
              Attach note photo
            </label>
          )}
        </div>
      </div>
    </div>
  );
}
