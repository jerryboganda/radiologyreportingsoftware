import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { MotionConfig, motion } from 'motion/react';
import { Toaster, toast } from 'sonner';
import { Group, Panel, Separator, useDefaultLayout, usePanelRef, type LayoutStorage } from 'react-resizable-panels';
import { Download, FileText, Image as ImageIcon, Menu as MenuIcon, PanelLeftOpen, RefreshCw, TriangleAlert } from 'lucide-react';
import { hasReportBody, isLocked, type ReportItem, type ReportStatus } from '../../lib/report';
import { checkWording, wordingSignature } from '../../lib/wording';
import { aiCopy, aiModelLabel } from '../../lib/aiModel';
import { cn } from '../../lib/cn';
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
          toastOptions={{
            classNames: {
              toast: '!rounded-lg !border !border-line !bg-surface !text-ink !shadow-lg !font-sans',
              title: '!text-base !font-semibold',
              description: '!text-sm !text-muted',
              actionButton: '!rounded-md !bg-brand !px-2.5 !font-medium !text-on-accent',
              closeButton: '!border-line !bg-surface !text-muted',
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
  const { reports, draft, selectedId } = api;
  // What the reporting PC is really running: the worker heartbeat, so no model name is hardcoded here.
  const aiState = useMemo(
    () => ({ engineOnline: api.engineOnline, engineBusy: api.engineBusy, engineEngine: api.engineEngine, engineModel: api.engineModel }),
    [api.engineOnline, api.engineBusy, api.engineEngine, api.engineModel],
  );
  const aiLabel = aiModelLabel(aiState);
  const aiReading = aiCopy(aiLabel).named.reading;

  const [view, setView] = useState<QueueView>('active');
  const [query, setQuery] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(() => safeStorage.getItem('sidebar-open') !== 'false');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [mobileTab, setMobileTab] = useState<'report' | 'note'>('report');
  const [focusMode, setFocusMode] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [approveOpen, setApproveOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [signOffOpen, setSignOffOpen] = useState(false);
  const [regenerateId, setRegenerateId] = useState<string | null>(null);
  const [regenerating, setRegenerating] = useState(false);
  const [develop, setDevelop] = useState<{ id: string; n: number; live: boolean }>({ id: '', n: 0, live: false });

  const searchRef = useRef<HTMLInputElement>(null);
  const notePanel = usePanelRef();
  const layout = useDefaultLayout({ id: 'workspace-split', storage: safeStorage, onlySaveAfterUserInteractions: true });

  useEffect(() => safeStorage.setItem('sidebar-open', String(sidebarOpen)), [sidebarOpen]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return reports
      .filter((r) => (view === 'archived' ? r.isArchived : !r.isArchived))
      .filter((r) => !q || [r.patientName, r.tokenNumber, r.modality, r.mrNumber ?? ''].some((v) => v.toLowerCase().includes(q)));
  }, [reports, view, query]);

  /* Status transitions → toasts (polite live region) and the "developing" reveal for the open case. */
  const seen = useRef<Map<string, ReportStatus> | null>(null);
  useEffect(() => {
    const before = seen.current;
    seen.current = new Map(reports.map((r) => [r.id, r.status]));
    if (!before) return;
    for (const r of reports) {
      if (before.get(r.id) !== 'PROCESSING' || r.status === 'PROCESSING') continue;
      const open = r.id === selectedId;
      const name = displayName(r);
      const action = open ? undefined : { label: 'Open', onClick: () => void api.select(r.id) };
      if (open && (r.status === 'DRAFT' || r.status === 'BLOCKED')) setDevelop((d) => ({ id: r.id, n: d.n + 1, live: true }));
      if (r.status === 'DRAFT') toast.success(`Draft ready · ${name}`, { description: 'Check it against the note, then issue the PDF.', action });
      else if (r.status === 'BLOCKED') toast.warning(`${name} needs a clarification`, { description: 'The AI stopped instead of guessing.', action });
      else if (r.status === 'FAILED') toast.error(`Generation failed · ${name}`, { description: r.lastError ?? undefined, action, duration: Infinity, closeButton: true });
    }
  }, [reports, selectedId, api]);

  useEffect(() => {
    if (!develop.live) return;
    const t = window.setTimeout(() => setDevelop((d) => ({ ...d, live: false })), 1400);
    return () => window.clearTimeout(t);
  }, [develop]);

  /* ---------- actions ---------- */

  const selectCase = useCallback(
    (id: string) => {
      void api.select(id);
      setDrawerOpen(false);
      setMobileTab('report');
    },
    [api],
  );

  const move = useCallback(
    (step: 1 | -1) => {
      if (!filtered.length) return;
      const index = filtered.findIndex((r) => r.id === selectedId);
      const next = filtered[Math.min(filtered.length - 1, Math.max(0, index === -1 ? 0 : index + step))];
      if (next && next.id !== selectedId) void api.select(next.id);
    },
    [api, filtered, selectedId],
  );

  const runAi = useCallback(
    async (id: string, force = false) => {
      if ((await api.enqueue(id, force)) === 'needsConfirm') setRegenerateId(id);
    },
    [api],
  );

  const archive = useCallback(
    async (id: string) => {
      const index = filtered.findIndex((r) => r.id === id);
      const row = await api.act(id, 'archive');
      if (!row) return;
      if (id === selectedId && view === 'active') {
        const next = filtered[index + 1] ?? filtered[index - 1];
        void api.select(next && next.id !== id ? next.id : null);
      }
      toast(`Archived ${displayName(row)}`, { description: 'Kept in the database.', action: { label: 'Undo', onClick: () => void api.act(id, 'restore') } });
    },
    [api, filtered, selectedId, view],
  );

  const onAction = useCallback(
    async (action: CaseAction) => {
      if (!draft) return;
      if (action === 'archive') return archive(draft.id);
      const row = await api.act(draft.id, action);
      if (row && action === 'reopen') toast.success('Reopened for editing');
      if (row && action === 'restore') toast.success('Restored to the active list');
      if (row && action === 'dequeue') toast('Taken off the AI queue', { description: 'You can write the report yourself now.' });
    },
    [api, archive, draft],
  );

  const downloadAgain = useCallback(async () => {
    if (!draft) return;
    const id = toast.loading('Generating PDF…');
    try {
      const name = await api.downloadPdf(draft);
      toast.success('PDF downloaded', { id, description: name });
    } catch (error) {
      toast.error('Couldn’t generate the PDF', { id, description: (error as Error).message, duration: Infinity, closeButton: true });
    }
  }, [api, draft]);

  const onApprove = useCallback(() => {
    if (!draft) return;
    if (draft.status === 'FINALIZED') void downloadAgain();
    else setApproveOpen(true);
  }, [downloadAgain, draft]);

  const toggleFocus = useCallback(() => {
    const panel = notePanel.current;
    if (!panel) return;
    if (panel.isCollapsed()) panel.expand();
    else panel.collapse();
  }, [notePanel]);

  /* ---------- keyboard ---------- */

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 's') {
        e.preventDefault();
        void api.save();
        return;
      }
      const target = e.target as HTMLElement | null;
      if (mod || e.altKey || target?.closest('input, textarea, select, [contenteditable="true"], [role="dialog"], [role="menu"]')) return;
      switch (e.key) {
        case '/':
          e.preventDefault();
          if (!isDesktop) setDrawerOpen(true);
          else setSidebarOpen(true);
          window.setTimeout(() => searchRef.current?.focus(), 60);
          break;
        case 'j':
          move(1);
          break;
        case 'k':
          move(-1);
          break;
        case 'f':
          if (isDesktop && draft) toggleFocus();
          break;
        case '[':
          if (isDesktop) setSidebarOpen((o) => !o);
          break;
        case '?':
          setShortcutsOpen(true);
          break;
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [api, draft, isDesktop, move, toggleFocus]);

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

  const sidebarProps = {
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
    engineOnline: api.engineOnline,
    engineBusy: api.engineBusy,
    engineEngine: api.engineEngine,
    engineModel: api.engineModel,
    onOpenSettings: () => setSettingsOpen(true),
    onIngest: api.ingest,
    onSyncInput: api.syncInput,
    onRetryFailed: api.retryFailed,
    onArchive: (id: string) => void archive(id),
    onRestore: (id: string) => void api.act(id, 'restore').then((row) => row && toast.success(`Restored ${displayName(row)}`)),
    theme,
    onShowShortcuts: () => setShortcutsOpen(true),
  };

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
      <IconButton label="Show case list" shortcut="[" onClick={() => setSidebarOpen(true)}>
        <PanelLeftOpen className="h-[18px] w-[18px]" />
      </IconButton>
    )
  ) : (
    <IconButton label="Open case list" onClick={() => setDrawerOpen(true)}>
      <MenuIcon className="h-5 w-5" />
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
      onPatch={api.update}
      onProfile={api.updateInstitution}
      onAi={() => void runAi(draft.id)}
      onDequeue={() => void onAction('dequeue')}
      onReopen={() => void onAction('reopen')}
      onDownload={() => void downloadAgain()}
    />
  );

  const noteViewer = draft && (
    <NoteViewer report={draft} reading={reading} readingLabel={!isDesktop} readingModel={aiReading} onReplace={api.replaceImage} className={isDesktop ? undefined : 'absolute inset-0'} />
  );

  // Phones/tablets keep a top bar (brand + case list) even when no case is open.
  const mobileBar = !isDesktop && (
    <header className="flex h-14 shrink-0 items-center gap-2.5 border-b border-line bg-surface px-2.5">
      <IconButton label="Open case list" onClick={() => setDrawerOpen(true)}>
        <MenuIcon className="h-5 w-5" />
      </IconButton>
      <BrandMark className="h-7 w-7" />
      <span className="text-md font-semibold tracking-[-0.01em] text-ink">PolytronX</span>
    </header>
  );

  let main;
  if (!api.loaded) {
    main = <LoadingShell />;
  } else if (api.loadError && reports.length === 0) {
    main = <LoadFailed message={api.loadError} onRetry={() => void api.refresh()} />;
  } else if (!draft) {
    main = (
      <>
        {mobileBar}
        <div className="min-h-0 flex-1">
          {reports.length === 0 ? <EmptyState onFiles={api.ingest} onSyncInput={api.syncInput} aiLabel={aiLabel} /> : <NoSelection onOpenList={isDesktop ? undefined : () => setDrawerOpen(true)} />}
        </div>
      </>
    );
  } else {
    main = (
      <>
        <CaseHeader
          report={draft}
          saveState={api.saveState}
          wordingPending={wordingPending}
          onSaveNow={() => void api.save()}
          leading={leading}
          focusMode={focusMode}
          onToggleFocus={isDesktop ? toggleFocus : undefined}
          canApprove={approve.can}
          approveHint={approve.hint}
          onApprove={onApprove}
          onAi={() => void runAi(draft.id)}
          onAudit={() => setAuditOpen(true)}
          onAction={(a) => void onAction(a)}
          aiLabel={aiLabel}
        />
        {isDesktop ? (
          <Group id="workspace-split" orientation="horizontal" defaultLayout={layout.defaultLayout} onLayoutChanged={layout.onLayoutChanged} className="min-h-0 flex-1">
            <Panel
              id="note"
              panelRef={notePanel}
              defaultSize="42"
              minSize="26"
              collapsible
              collapsedSize="0"
              onResize={() => setFocusMode(!!notePanel.current?.isCollapsed())}
            >
              {noteViewer}
            </Panel>
            <Separator className="group relative z-10 w-px bg-line outline-none transition-colors duration-fast hover:bg-accent/60 focus-visible:bg-accent data-[separator-state=drag]:bg-accent">
              <span className="absolute inset-y-0 -left-1.5 -right-1.5 cursor-col-resize" aria-hidden />
              <span className="absolute left-1/2 top-1/2 h-8 w-1 -translate-x-1/2 -translate-y-1/2 rounded-full bg-line-strong opacity-0 transition-opacity duration-fast group-hover:opacity-100" aria-hidden />
            </Separator>
            <Panel id="report" minSize="34">
              {reportPane}
            </Panel>
          </Group>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col">
            <div className="flex h-12 shrink-0 items-center justify-center border-b border-line bg-surface px-3">
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
            <div className="relative min-h-0 flex-1">{mobileTab === 'note' ? noteViewer : reportPane}</div>
            <div className="flex shrink-0 items-center gap-2 border-t border-line bg-surface px-3 pt-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] sm:hidden">
              {aiAction && (
                <Button size="lg" className="flex-1 px-3" onClick={() => void runAi(draft.id)}>
                  {aiAction.icon}
                  {aiAction.label}
                </Button>
              )}
              <Button size="lg" variant="primary" className="flex-[1.6] px-3" disabled={!approve.can} onClick={onApprove}>
                <Download className="h-4 w-4" />
                {draft.status === 'FINALIZED' ? 'Download PDF' : 'Approve & download'}
              </Button>
            </div>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-canvas text-ink">
      {isDesktop ? (
        <motion.div
          initial={false}
          animate={{ width: sidebarOpen ? 304 : 0 }}
          transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          className={cn('shrink-0 overflow-hidden border-line', sidebarOpen && 'border-r')}
          inert={!sidebarOpen}
        >
          <div className="h-full w-[304px]">
            <QueueSidebar {...sidebarProps} onCollapse={() => setSidebarOpen(false)} />
          </div>
        </motion.div>
      ) : (
        <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent label="Cases">
            <QueueSidebar {...sidebarProps} />
          </SheetContent>
        </Dialog>
      )}

      <main className="flex min-w-0 flex-1 flex-col">{main}</main>

      <DropOverlay onFiles={api.ingest} />
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
            if (wordingPending && !(await api.act(draft.id, 'ack_wording'))) return;
            const name = await api.downloadPdf(draft);
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
            await runAi(regenerateId, true);
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
    <div className="flex h-full flex-col" aria-busy aria-label="Loading cases">
      <div className="flex h-14 items-center gap-3 border-b border-line bg-surface px-4">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
      <div className="min-h-0 flex-1 overflow-hidden px-6 pt-6">
        <SheetSkeleton />
      </div>
    </div>
  );
}

function LoadFailed({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="grid h-full place-items-center bg-canvas px-6 text-center">
      <div className="max-w-sm">
        <span className="mx-auto mb-3 grid h-11 w-11 place-items-center rounded-full bg-danger-soft text-danger">
          <TriangleAlert className="h-5 w-5" />
        </span>
        <p className="text-lg font-semibold text-ink">Couldn’t load the cases</p>
        <p className="mt-1 text-base text-muted">{message}. Check that the reporting server is running, then try again.</p>
        <Button className="mt-4" onClick={onRetry}>
          <RefreshCw className="h-4 w-4" />
          Try again
        </Button>
      </div>
    </div>
  );
}
