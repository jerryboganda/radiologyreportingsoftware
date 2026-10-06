import { Suspense, lazy, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from 'react';
import { MotionConfig } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef, type LayoutStorage } from 'react-resizable-panels';
import {
  ArchiveRestore,
  BadgeCheck,
  Download,
  FileText,
  Image as ImageIcon,
  Info,
  LoaderCircle,
  Menu as MenuIcon,
  MessageCircleQuestion,
  PanelLeftOpen,
  PenLine,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import { hasReportBody, isLocked, type ReportItem, type ReportStatus } from '../../lib/report';
import { checkWording, wordingSignature } from '../../lib/wording';
import { aiCopy, aiModelLabel } from '../../lib/aiModel';
import { cn } from '../../lib/cn';
import { viewTransition } from '../../lib/motion';
import { Button } from '../ui/button';
import { ConfirmDialog, Dialog, IconButton, SheetContent, TooltipProvider } from '../ui/overlay';
import { Segmented } from '../ui/segmented';
import { Skeleton } from '../ui/status';
import { CaseHeader, aiActionFor } from './CaseHeader';
import { ApproveDialog, AuditDialog, SettingsDialog, ShortcutsDialog, SignOffSettings } from './dialogs';
import { DropOverlay, EmptyState, NoSelection } from './EmptyState';
import { displayName } from './format';
import { NoteViewer } from './NoteViewer';
import { BrandMark, QueueSidebar, type QueueView } from './QueueSidebar';
import { ReportPane } from './ReportPane';
import { SheetSkeleton } from './ReportSheet';
import { useReports, type CaseAction } from './useReports';
import { useTheme, type ThemeApi } from './useTheme';

// Rarely opened, and it carries the Tiptap editor: loaded the first time it is needed.
const CreateReportDialog = lazy(() => import('./CreateReportDialog').then((m) => ({ default: m.CreateReportDialog })));

/** Per-viewer conveniences only (layout, sidebar); every read/write may throw in private modes. */
const safeStorage: LayoutStorage = {
  getItem: (key) => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem: (key, value) => {
    try {
      localStorage.setItem(key, value);
    } catch {}
  },
};

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    mq.addEventListener('change', onChange);
    onChange();
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

// One colour per state, the same icons as the status chips.
const TOAST_ICONS = {
  success: <BadgeCheck className="h-4 w-4 text-success" />,
  warning: <MessageCircleQuestion className="h-4 w-4 text-warning" />,
  error: <TriangleAlert className="h-4 w-4 text-danger" />,
  info: <Info className="h-4 w-4 text-accent" />,
  loading: <LoaderCircle className="h-4 w-4 text-accent motion-safe:animate-spin" />,
};

export default function ReportWorkspace() {
  const theme = useTheme();
  const isDesktop = useMediaQuery('(min-width: 1024px)');
  return (
    <MotionConfig reducedMotion="user">
      <TooltipProvider delayDuration={350} skipDelayDuration={200}>
        <Workspace theme={theme} isDesktop={isDesktop} />
        <Toaster
          theme={theme.resolved}
          position={isDesktop ? 'bottom-right' : 'top-center'}
          gap={8}
          icons={TOAST_ICONS}
          // Below the 56px header bar, so a toast never covers the patient name or the menu.
          offset={{ top: '4rem', bottom: '1rem', right: '1rem' }}
          mobileOffset={{ top: 'calc(4rem + env(safe-area-inset-top))' }}
          toastOptions={{
            classNames: {
              toast: '!rounded-lg !border !border-line/70 !glass-float !text-ink !shadow-lg !font-sans',
              title: '!text-base !font-semibold',
              description: '!text-sm !text-muted',
              actionButton: '!rounded-md !bg-brand !bg-gradient-to-b !from-brand !to-brand-lo !shadow-primary !px-2.5 !font-medium !text-on-accent',
              closeButton: '!border-line !bg-surface !text-muted',
              success: '[&_[data-icon]]:!text-success',
              warning: '[&_[data-icon]]:!text-warning',
              error: '[&_[data-icon]]:!text-danger',
              loading: '[&_[data-icon]]:!text-accent',
              info: '[&_[data-icon]]:!text-accent',
            },
          }}
        />
      </TooltipProvider>
    </MotionConfig>
  );
}

function approveState(r: ReportItem): { can: boolean; hint: string } {
  if (r.isArchived) return { can: false, hint: 'Restore the case before issuing it' };
  switch (r.status) {
    case 'FINALIZED':
      return { can: true, hint: '' };
    case 'QUEUED':
    case 'PROCESSING':
      return { can: false, hint: 'Available once the AI draft is ready' };
    case 'BLOCKED':
      return { can: false, hint: 'Answer the AI’s clarification first' };
    case 'FAILED':
      return { can: false, hint: 'Retry the AI or write the report first' };
    default:
      return hasReportBody(r) ? { can: true, hint: '' } : { can: false, hint: 'Add findings and an impression first' };
  }
}

function Workspace({ theme, isDesktop }: { theme: ThemeApi; isDesktop: boolean }) {
  const api = useReports();
  // Stable callbacks from useReports; the api object itself is new every render.
  const { reports, draft, selectedId, loaded, loadError, select, enqueue, act, save, flush, update, updateInstitution, ingest, syncInput, retryFailed, replaceImage, downloadPdf, refresh, createFromText } = api;
  // What the reporting PC is really running: the worker heartbeat, so no model name is hardcoded here.
  const aiState = useMemo(
    () => ({ engineOnline: api.engineOnline, engineBusy: api.engineBusy, engineEngine: api.engineEngine, engineModel: api.engineModel }),
    [api.engineOnline, api.engineBusy, api.engineEngine, api.engineModel],
  );
  const aiLabel = aiModelLabel(aiState);
  const aiReading = aiCopy(aiLabel).named.reading;

  const [view, setView] = useState<QueueView>('active');
  const [query, setQuery] = useState('');
  // Below 1280px the split is cramped with the list open, so a first visit starts with it closed; a stored choice wins.
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = safeStorage.getItem('sidebar-open');
    return saved === null ? window.innerWidth >= 1280 : saved !== 'false';
  });
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'report' | 'note'>('report');
  const [focusMode, setFocusMode] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [busy, setBusy] = useState<'ai' | 'pdf' | null>(null);
  const [develop, setDevelop] = useState<{ id: string; n: number; live: boolean }>({ id: '', n: 0, live: false });
  // Direction of travel through the list: the next sheet and header title arrive from that side (--dir on <main>).
  const [dir, setDir] = useState<1 | -1>(1);
  // Page-load choreography: .intro times the [data-intro] cascade, then goes so nothing replays.
  const [intro, setIntro] = useState(true);

  const searchRef = useRef<HTMLInputElement>(null);
  const showListRef = useRef<HTMLButtonElement>(null);
  const busyRef = useRef(false);
  const createUsed = useRef(false);
  if (createOpen) createUsed.current = true;
  const notePanel = usePanelRef();
  const layout = useDefaultLayout({ id: 'workspace-split', storage: safeStorage, onlySaveAfterUserInteractions: true });

  useEffect(() => {
    if (!loaded) return;
    const t = window.setTimeout(() => setIntro(false), 900);
    return () => window.clearTimeout(t);
  }, [loaded]);

  /** Only a choice the resident makes is stored, so the first-visit default keeps following the screen.
      A layout View Transition: the queue slides out while the workspace glides wider (instant without support). */
  const setSidebar = useCallback((open: boolean) => {
    viewTransition('layout', () => setSidebarOpen(open));
    safeStorage.setItem('sidebar-open', String(open));
  }, []);

  // The collapse commits a frame later (after the snapshot), so focus is restored once it has.
  const refocus = useRef(false);
  const collapseSidebar = useCallback(() => {
    refocus.current = true;
    setSidebar(false);
  }, [setSidebar]);
  useEffect(() => {
    if (sidebarOpen || !refocus.current) return;
    refocus.current = false;
    // If focus was in the list it just became inert; land on the way back instead of <body>.
    requestAnimationFrame(() => {
      if (document.activeElement === document.body) (showListRef.current ?? document.getElementById('workspace-main'))?.focus();
    });
  }, [sidebarOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => (view === 'archived' ? r.isArchived : !r.isArchived))
      .filter((r) => !q || [r.patientName, r.tokenNumber, r.modality, r.mrNumber ?? ''].some((v) => v.toLowerCase().includes(q)));
  }, [reports, view, query]);

  /* Status transitions → toasts (polite live region) and the "developing" reveal for the open case.
     A layout effect, so the remount into the developing sheet happens before the finished draft is painted. */
  const seen = useRef<Map<string, ReportStatus> | null>(null);
  useLayoutEffect(() => {
    const before = seen.current;
    seen.current = new Map(reports.map((r) => [r.id, r.status]));
    if (!before) return;
    for (const r of reports) {
      if (before.get(r.id) !== 'PROCESSING' || r.status === 'PROCESSING') continue;
      const open = r.id === selectedId;
      const name = displayName(r);
      const action = open ? undefined : { label: 'Open', onClick: () => void select(r.id) };
      if (open && (r.status === 'DRAFT' || r.status === 'BLOCKED')) setDevelop((d) => ({ id: r.id, n: d.n + 1, live: true }));
      if (r.status === 'DRAFT') toast(`Draft ready · ${name}`, { description: 'Check it against the note, then issue the PDF.', action, icon: <PenLine className="h-4 w-4 text-ink-2" /> });
      else if (r.status === 'BLOCKED') toast.warning(`${name} needs a clarification`, { description: 'The AI stopped instead of guessing.', action });
      else if (r.status === 'FAILED') toast.error(`Generation failed · ${name}`, { description: r.lastError ?? undefined, action, duration: Infinity, closeButton: true });
    }
  }, [reports, selectedId, select]);

  useEffect(() => {
    if (!develop.live) return;
    const t = window.setTimeout(() => setDevelop((d) => ({ ...d, live: false })), 1000);
    return () => window.clearTimeout(t);
  }, [develop]);

  // The server went away mid-session: say so (the list stays as last loaded) and clear it once a poll succeeds.
  useEffect(() => {
    if (loaded && loadError && reports.length) toast.error('Can’t reach the reporting server', { id: 'offline', duration: Infinity, description: 'Showing the last loaded cases. Retrying…' });
    else toast.dismiss('offline');
  }, [loaded, loadError, reports.length]);

  const title = draft ? `${displayName(draft)} · PolytronX` : 'PolytronX · Radiology Reporting';
  useEffect(() => {
    document.title = title;
  }, [title]);

  /* ---------- actions ---------- */

  /** One in-flight AI request or PDF at a time, so a double click never enqueues or generates twice. */
  const whileBusy = useCallback(async (kind: 'ai' | 'pdf', run: () => Promise<void>) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(kind);
    try {
      await run();
    } finally {
      busyRef.current = false;
      setBusy(null);
    }
  }, []);

  const selectCase = useCallback(
    (id: string) => {
      setDir(filtered.findIndex((r) => r.id === id) < filtered.findIndex((r) => r.id === selectedId) ? -1 : 1);
      void select(id);
      setDrawerOpen(false);
      setMobileTab('report');
    },
    [select, filtered, selectedId],
  );

  const move = useCallback(
    (step: 1 | -1) => {
      if (!filtered.length) return;
      const index = filtered.findIndex((r) => r.id === selectedId);
      const next = filtered[Math.min(filtered.length - 1, Math.max(0, index === -1 ? 0 : index + step))];
      if (next && next.id !== selectedId) {
        setDir(step);
        void select(next.id);
      }
    },
    [select, filtered, selectedId],
  );

  const runAi = useCallback(
    (id: string) =>
      whileBusy('ai', async () => {
        if ((await enqueue(id)) === 'needsConfirm') setRegenerateId(id);
      }),
    [enqueue, whileBusy],
  );

  const archive = useCallback(
    async (id: string) => {
      const index = filtered.findIndex((r) => r.id === id);
      const row = await act(id, 'archive');
      if (!row) return;
      if (id === selectedId && view === 'active') {
        const next = filtered[index + 1] ?? filtered[index - 1];
        void select(next && next.id !== id ? next.id : null);
      }
      toast(`Archived ${displayName(row)}`, { description: 'Kept in the database.', action: { label: 'Undo', onClick: () => void act(id, 'restore') } });
    },
    [act, select, filtered, selectedId, view],
  );

  const restore = useCallback((id: string) => void act(id, 'restore').then((row) => row && toast.success(`Restored ${displayName(row)}`)), [act]);

  const onAction = useCallback(
    async (action: CaseAction) => {
      if (!draft) return;
      if (action === 'archive') return archive(draft.id);
      const row = await act(draft.id, action);
      if (row && action === 'reopen') toast('Reopened for editing', { icon: <PenLine className="h-4 w-4 text-ink-2" /> });
      if (row && action === 'restore') toast.success('Restored to the active list');
      if (row && action === 'dequeue') toast('Taken off the AI queue', { description: 'You can write the report yourself now.' });
    },
    [act, archive, draft],
  );

  const downloadAgain = useCallback(
    () =>
      whileBusy('pdf', async () => {
        if (!draft) return;
        const id = toast.loading('Generating PDF…');
        try {
          const name = await downloadPdf(draft);
          toast.success('PDF downloaded', { id, description: name });
        } catch (error) {
          toast.error('Couldn’t generate the PDF', { id, description: (error as Error).message, duration: Infinity, closeButton: true });
        }
      }),
    [downloadPdf, draft, whileBusy],
  );

  const onApprove = useCallback(() => {
    if (!draft) return;
    if (draft.status === 'FINALIZED') void downloadAgain();
    else setApproveOpen(true);
  }, [downloadAgain, draft]);

  // The print page reads the stored report, so pending edits are saved first. The tab opens at once (popup blockers allow it).
  const draftId = draft?.id;
  const printPreview = useCallback(() => {
    if (!draftId) return;
    const w = window.open('about:blank', '_blank');
    if (w) w.opener = null;
    void flush().then(() => {
      if (w) w.location.href = `/print/${draftId}`;
    });
  }, [draftId, flush]);

  // A layout View Transition: the report widens over the light box and the sheet glides to centre.
  const toggleFocus = useCallback(() => {
    const p = notePanel.current;
    if (!p) return;
    viewTransition('layout', () => {
      const collapse = !p.isCollapsed();
      if (collapse) p.collapse();
      else p.expand();
      setFocusMode(collapse);
    });
  }, [notePanel]);

  /* ---------- keyboard ---------- */

  // The handler reads fresh state through a ref, so the listener is added once.
  const lastMove = useRef(0);
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  onKey.current = (e: KeyboardEvent) => {
    const mod = e.ctrlKey || e.metaKey;
    if (mod && e.key.toLowerCase() === 's') {
      e.preventDefault();
      void save();
      return;
    }
    const target = e.target as HTMLElement | null;
    if (mod || e.altKey || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
    // Caps Lock and Shift still work for letters.
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    if (key === 'j' || key === 'k') {
      // Key repeat walks the list at a readable pace instead of remounting the sheet on every repeat.
      if (e.repeat && e.timeStamp - lastMove.current < 120) return;
      lastMove.current = e.timeStamp;
      move(key === 'j' ? 1 : -1);
      return;
    }
    if (e.repeat) return;
    switch (key) {
      case '/':
        e.preventDefault();
        if (!isDesktop) setDrawerOpen(true);
        else if (!sidebarOpen) setSidebar(true);
        // A reopening queue commits after its View Transition snapshot, so the search is focusable a little later.
        window.setTimeout(() => searchRef.current?.focus({ preventScroll: true }), isDesktop && !sidebarOpen ? 120 : 60);
        break;
      case 'f':
        if (isDesktop && draft) toggleFocus();
        break;
      case '[':
        if (isDesktop) {
          if (sidebarOpen) collapseSidebar();
          else setSidebar(true);
        }
        break;
      case '?':
        setShortcutsOpen(true);
        break;
    }
  };
  useEffect(() => {
    const listener = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);

  /* ---------- layout ---------- */

  // Drafts whose wording the resident still has to check; the list shows them as "Check wording".
  const flaggedIds = useMemo(() => {
    const ids = new Set<string>();
    for (const r of reports) {
      if (r.isArchived || r.status !== 'DRAFT') continue;
      const found = checkWording(r);
      if (found.length > 0 && r.wordingAck !== wordingSignature(found)) ids.add(r.id);
    }
    return ids;
  }, [reports]);

  const openSettings = useCallback(() => setSettingsOpen(true), []);
  const showShortcuts = useCallback(() => setShortcutsOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);
  const openCreate = useCallback(() => {
    setDrawerOpen(false);
    setCreateOpen(true);
  }, []);
  const onArchive = useCallback((id: string) => void archive(id), [archive]);

  // Memoised so typing in the sheet (draft) does not re-render the case list.
  const sidebarProps = useMemo(
    () => ({
      reports: filtered,
      selectedId,
      onSelect: selectCase,
      view,
      onViewChange: setView,
      query,
      onQueryChange: setQuery,
      searchRef,
      counts: api.counts,
      flaggedIds,
      loading: !loaded,
      engineOnline: api.engineOnline,
      engineBusy: api.engineBusy,
      engineEngine: api.engineEngine,
      engineModel: api.engineModel,
      onOpenSettings: openSettings,
      onIngest: ingest,
      onSyncInput: syncInput,
      onRetryFailed: retryFailed,
      onArchive,
      onRestore: restore,
      onCreate: openCreate,
      theme,
      onShowShortcuts: showShortcuts,
    }),
    [filtered, selectedId, selectCase, view, query, api.counts, flaggedIds, loaded, api.engineOnline, api.engineBusy, api.engineEngine, api.engineModel, openSettings, ingest, syncInput, retryFailed, onArchive, restore, openCreate, theme, showShortcuts],
  );

  // Wording check (H28): serious terms and numbers the senior's note does not contain. Live as the resident edits.
  const flags = useMemo(() => (draft && draft.status === 'DRAFT' ? checkWording(draft) : []), [draft]);
  const wordingConfirmed = flags.length > 0 && draft?.wordingAck === wordingSignature(flags);
  const wordingPending = flags.length > 0 && !wordingConfirmed;

  const approve = draft ? approveState(draft) : { can: false, hint: '' };
  const readOnly = !draft || isLocked(draft.status) || !!draft.isArchived;
  const reading = draft?.status === 'PROCESSING';
  const aiAction = draft ? aiActionFor(draft, aiLabel) : null;

  const leading = isDesktop ? (
    !sidebarOpen && (
      <IconButton ref={showListRef} label="Show case list" shortcut="[" onClick={() => setSidebar(true)}>
        <PanelLeftOpen className="h-[18px] w-[18px]" />
      </IconButton>
    )
  ) : (
    <IconButton label="Open case list" onClick={() => setDrawerOpen(true)}>
      <MenuIcon className="h-[18px] w-[18px]" />
    </IconButton>
  );

  const reportPane = draft && (
    <ReportPane
      key={`${draft.id}:${develop.id === draft.id ? develop.n : 0}`}
      report={draft}
      readOnly={readOnly}
      ai={aiState}
      developing={develop.live && develop.id === draft.id}
      flags={flags}
      wordingConfirmed={wordingConfirmed}
      fallbackProfile={api.settingsProfile ?? undefined}
      onPatch={update}
      onProfile={updateInstitution}
      onAi={() => runAi(draft.id)}
      onDequeue={() => onAction('dequeue')}
      onReopen={() => onAction('reopen')}
      onDownload={downloadAgain}
    />
  );

  const noteViewer = draft && <NoteViewer report={draft} reading={reading} readingLabel={!isDesktop} readingModel={aiReading} readOnly={readOnly} onReplace={replaceImage} />;

  // Phones/tablets keep a top bar (brand + case list) even when no case is open.
  const mobileBar = !isDesktop && (
    <header className="relative flex h-14 shrink-0 items-center gap-2.5 border-b border-line/70 glass px-2.5 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:glow-rule">
      <IconButton label="Open case list" onClick={() => setDrawerOpen(true)}>
        <MenuIcon className="h-[18px] w-[18px]" />
      </IconButton>
      <BrandMark className="h-7 w-7" />
      <span className="text-md font-semibold tracking-[-0.01em] text-ink">PolytronX</span>
    </header>
  );

  // Tablets and phones keep both panes mounted (scroll, zoom and rotation survive a flip); the hidden one is inert.
  // Switching crossfades with a 16px slide toward the tab's side; visibility flips once the fade ends.
  const pane = 'absolute inset-0 transition-[opacity,transform,visibility] duration-enter ease-out motion-reduce:transform-none';

  let main;
  if (!loaded) {
    main = <LoadingShell />;
  } else if (loadError && reports.length === 0) {
    main = <LoadFailed message={loadError} onRetry={refresh} />;
  } else if (!draft) {
    main = (
      <>
        {mobileBar}
        <div className="min-h-0 flex-1">
          {reports.length === 0 ? (
            <EmptyState onFiles={ingest} onSyncInput={syncInput} onCreate={openCreate} aiLabel={aiLabel} />
          ) : (
            <>
              <h1 className="sr-only">PolytronX</h1>
              <NoSelection onOpenList={isDesktop ? (sidebarOpen ? undefined : () => setSidebar(true)) : () => setDrawerOpen(true)} />
            </>
          )}
        </div>
      </>
    );
  } else {
    /* Phone action bar (below 640px). On the Report tab it is frosted glass over the report (ReportPane's pb-24 clears it);
       on the Note tab it sits below the light box, so the zoom pill is never covered. */
    const bottomBar = (
      <div
        className={cn(
          'flex shrink-0 items-center gap-2 border-t border-line/70 px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] group-has-[input:focus]:hidden group-has-[textarea:focus]:hidden group-has-[[contenteditable=true]:focus]:hidden sm:hidden',
          mobileTab === 'report' ? 'glass-bar absolute inset-x-0 bottom-0 z-10' : 'bg-surface',
        )}
      >
        {aiAction && (
          <Button
            size="lg"
            aria-label={aiAction.label}
            loading={busy === 'ai'}
            className="min-w-0 flex-1 px-3 max-[399px]:w-11 max-[399px]:flex-none max-[399px]:px-0 [&_svg]:h-4 [&_svg]:w-4"
            onClick={() => void runAi(draft.id)}
          >
            {busy !== 'ai' && aiAction.icon}
            <span className="truncate max-[399px]:sr-only">{aiAction.label}</span>
          </Button>
        )}
        {draft.isArchived ? (
          <Button size="lg" className="min-w-0 flex-1 px-3" onClick={() => void onAction('restore')}>
            <ArchiveRestore className="h-4 w-4" />
            <span className="truncate">Restore to active</span>
          </Button>
        ) : (
          <Button
            size="lg"
            variant="primary"
            aria-disabled={!approve.can || undefined}
            aria-describedby={approve.can ? undefined : 'approve-hint'}
            loading={busy === 'pdf'}
            // The one shimmering control on phones while the case can be issued.
            shimmer={approve.can && draft.status !== 'FINALIZED'}
            className="min-w-0 flex-[1.6] px-3 aria-disabled:cursor-not-allowed aria-disabled:opacity-50 aria-disabled:[--press:1]"
            // Touch has no tooltips: a tap on the dimmed button says why.
            onClick={approve.can ? onApprove : () => toast(approve.hint, { id: 'approve-hint' })}
          >
            <Download className="h-4 w-4" />
            <span className="truncate">
              {draft.status === 'FINALIZED' ? (
                'Download PDF'
              ) : (
                <>
                  Approve<span className="max-[359px]:hidden"> & download</span>
                </>
              )}
            </span>
          </Button>
        )}
      </div>
    );
    main = (
      <>
        <CaseHeader
          report={draft}
          saveState={api.saveState}
          wordingPending={wordingPending}
          onSaveNow={() => void save()}
          leading={leading}
          focusMode={focusMode}
          onToggleFocus={isDesktop ? toggleFocus : undefined}
          canApprove={approve.can}
          approveHint={approve.hint}
          onApprove={onApprove}
          approveBusy={busy === 'pdf'}
          onAi={() => void runAi(draft.id)}
          aiBusy={busy === 'ai'}
          onCreate={openCreate}
          onAudit={() => setAuditOpen(true)}
          onPrint={printPreview}
          onShowShortcuts={showShortcuts}
          onAction={(a) => void onAction(a)}
          aiLabel={aiLabel}
        />
        {isDesktop ? (
          <Group
            id="workspace-split"
            orientation="horizontal"
            defaultLayout={layout.defaultLayout}
            onLayoutChanged={layout.onLayoutChanged}
            resizeTargetMinimumSize={{ fine: 12, coarse: 32 }}
            className="min-h-0 flex-1"
          >
            <Panel
              id="note"
              panelRef={notePanel}
              // The sheet is capped at 52rem, so very wide screens give the light box the room.
              defaultSize={window.innerWidth >= 1920 ? '52' : '42'}
              minSize="15rem"
              collapsible
              collapsedSize="0"
              onResize={() => setFocusMode(!!notePanel.current?.isCollapsed())}
            >
              <div className="h-full" inert={focusMode}>
                {noteViewer}
              </div>
            </Panel>
            <Separator
              aria-label="Resize the note and report panes"
              className="group relative z-10 w-px bg-line outline-none transition-colors duration-fast data-[separator=active]:bg-accent data-[separator=focus]:bg-accent data-[separator=hover]:bg-accent/60"
            >
              <span
                className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong opacity-0 transition-opacity duration-fast group-data-[separator=active]:bg-accent group-data-[separator=active]:opacity-100 group-data-[separator=focus]:opacity-100 group-data-[separator=hover]:opacity-100"
                aria-hidden
              />
            </Separator>
            <Panel id="report" minSize="26rem">
              {reportPane}
            </Panel>
          </Group>
        ) : (
          // The steps-aside rule (hidden while a sheet field has the keyboard) keys on the column, which holds the bar in both spots.
          <div className="group flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-center border-b border-line/70 glass px-3">
              <Segmented
                label="Show"
                value={mobileTab}
                onChange={setMobileTab}
                className="w-full max-w-sm"
                options={[
                  { value: 'report', label: 'Report', icon: <FileText /> },
                  { value: 'note', label: 'Note', icon: <ImageIcon /> },
                ]}
              />
            </div>
            <div className="relative min-h-0 flex-1 overflow-hidden">
              <div inert={mobileTab !== 'report'} className={cn(pane, mobileTab === 'report' ? 'opacity-100' : 'invisible -translate-x-4 opacity-0')}>
                {reportPane}
              </div>
              <div inert={mobileTab !== 'note'} className={cn(pane, mobileTab === 'note' ? 'opacity-100' : 'invisible translate-x-4 opacity-0')}>
                {noteViewer}
              </div>
              {mobileTab === 'report' && bottomBar}
            </div>
            {mobileTab === 'note' && bottomBar}
          </div>
        )}
      </>
    );
  }

  const anyDialogOpen = drawerOpen || createOpen || approveOpen || auditOpen || settingsOpen || signOffOpen || shortcutsOpen || regenerateId !== null;

  return (
    // No isolate on the root, so DropOverlay (z-70) still beats portaled dialogs. The body already carries the side safe areas.
    <div data-workspace className={cn('app-glow flex h-dvh overflow-hidden text-ink', intro && 'intro')}>
      <a
        href="#workspace-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[80] focus:rounded-md focus:bg-surface focus:px-3 focus:py-2 focus:text-base focus:font-medium focus:text-ink focus:shadow-lg"
      >
        Skip to report
      </a>
      {isDesktop ? (
        // The width snaps; setSidebar runs it as a View Transition (data-vt-name), so nothing reflows frame by frame.
        <div
          data-vt-name="queue"
          style={{ width: sidebarOpen ? 304 : 0 }}
          className={cn('glass shrink-0 overflow-hidden border-line/70 shadow-[inset_-1px_0_0_rgb(var(--glass-edge)/var(--glass-edge-a))]', sidebarOpen && 'border-r')}
          inert={!sidebarOpen}
        >
          <div className="h-full w-[304px]">
            <QueueSidebar {...sidebarProps} onCollapse={collapseSidebar} />
          </div>
        </div>
      ) : (
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent label="Cases">
            <QueueSidebar {...sidebarProps} onClose={closeDrawer} />
          </SheetContent>
        </Dialog>
      )}

      <main id="workspace-main" tabIndex={-1} className="flex min-w-0 flex-1 flex-col outline-none" style={{ '--dir': dir } as CSSProperties}>
        {main}
      </main>

      <DropOverlay disabled={anyDialogOpen} onFiles={ingest} />
      {createUsed.current && (
        <Suspense fallback={null}>
          <CreateReportDialog open={createOpen} onOpenChange={setCreateOpen} onCreate={createFromText} />
        </Suspense>
      )}
      <AuditDialog report={draft} open={auditOpen} onOpenChange={setAuditOpen} flags={flags} wordingConfirmed={wordingConfirmed} aiLabel={aiLabel} />
      <ApproveDialog
        report={draft}
        open={approveOpen}
        onOpenChange={setApproveOpen}
        flags={flags}
        wordingConfirmed={wordingConfirmed}
        onConfirm={async () => {
          if (!draft) return;
          try {
            // The server stores exactly the wording the resident confirmed; the PDF is refused without it.
            if (wordingPending && !(await act(draft.id, 'ack_wording'))) return;
            const name = await downloadPdf(draft);
            setApproveOpen(false);
            toast.success('Report issued', { description: `${name} downloaded · case finalized` });
          } catch (error) {
            toast.error('Couldn’t generate the PDF', { description: (error as Error).message, duration: Infinity, closeButton: true });
          }
        }}
      />
      <ConfirmDialog
        open={regenerateId !== null}
        onOpenChange={(o) => !o && setRegenerateId(null)}
        title="Regenerate this report?"
        description="The AI will draft it again from the note and replace the current findings, impression and recommendations. Your notes for the AI are kept."
        confirmLabel="Regenerate"
        busy={regenerating}
        onConfirm={async () => {
          if (!regenerateId) return;
          setRegenerating(true);
          try {
            await enqueue(regenerateId, true);
          } finally {
            setRegenerating(false);
            setRegenerateId(null);
          }
        }}
      />
      <ShortcutsDialog open={shortcutsOpen} onOpenChange={setShortcutsOpen} />
      <SettingsDialog
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        onOpenSignOff={() => {
          setSettingsOpen(false);
          setSignOffOpen(true);
        }}
        workerModelsByEngine={api.engineModelsByEngine}
        workerModelLabels={api.engineModelLabels}
        workerVariants={api.engineModelVariants}
        workerEngine={api.engineEngine}
        workerModel={api.engineModel}
      />
      <SignOffSettings open={signOffOpen} onOpenChange={setSignOffOpen} />
    </div>
  );
}

function LoadingShell() {
  return (
    <div className="flex h-full flex-col" role="status" aria-busy>
      <span className="sr-only">Loading cases…</span>
      <div className="relative flex h-14 items-center gap-3 border-b border-line/70 glass px-4 after:pointer-events-none after:absolute after:inset-x-0 after:-bottom-px after:h-px after:glow-rule">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-3 pt-4 sm:px-6 sm:pt-6">
        <SheetSkeleton />
      </div>
    </div>
  );
}

function LoadFailed({ message, onRetry }: { message: string; onRetry: () => Promise<void> }) {
  const [busy, setBusy] = useState(false);
  return (
    <div className="grid h-full place-items-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <p className="text-lg font-semibold text-ink">Couldn’t load the cases</p>
        <p className="mt-1 text-base text-muted">{message.replace(/\.$/, '')}. Check that the reporting server is running, then try again.</p>
        <Button
          variant="primary"
          className="mt-4"
          loading={busy}
          onClick={async () => {
            setBusy(true);
            try {
              await onRetry();
            } finally {
              setBusy(false);
            }
          }}
        >
          {!busy && <RefreshCw className="h-4 w-4" />}
          Try again
        </Button>
      </div>
    </div>
  );
}
