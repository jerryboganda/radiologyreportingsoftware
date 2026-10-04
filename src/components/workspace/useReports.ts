import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { EDITABLE_FIELDS, isLocked, type ReportItem, type ReportPatch } from '../../lib/report';
import { profileFromSnapshot, sanitizeProfile, type InstitutionProfile } from '../../lib/institution';

export type SaveState = 'idle' | 'dirty' | 'saving' | 'saved' | 'error';
export type CaseAction = 'archive' | 'restore' | 'reopen' | 'dequeue' | 'ack_wording';

type ApiError = Error & { status?: number; data?: Record<string, unknown> };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.error || (Array.isArray(data.errors) ? data.errors.join('; ') : `Request failed (${res.status})`);
    throw Object.assign(new Error(message), { status: res.status, data }) as ApiError;
  }
  return data as T;
}

const postJson = <T,>(url: string, body: unknown) =>
  api<T>(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

/** Editable fields that differ between the last server copy and the local draft. */
function diffEditable(base: ReportItem, draft: ReportItem): ReportPatch {
  const patch: Record<string, unknown> = {};
  for (const key of EDITABLE_FIELDS) {
    if (draft[key] !== base[key]) patch[key] = draft[key];
  }
  return patch as ReportPatch;
}

const AUTOSAVE_MS = 900;
const ENGINE_FRESH_MS = 15_000;

/**
 * All case data and mutations. The selected case lives in a local draft:
 * polls never overwrite unsaved edits, autosave sends only changed editable fields,
 * and every status-changing action flushes pending edits first.
 */
export function useReports() {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ReportItem | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [engine, setEngine] = useState<{
    lastSeen: number | null;
    busy: boolean;
    engine: string | null;
    model: string | null;
    models: string[];
    modelVariants: Record<string, string[]>;
    /** Everything each engine offers, and its display labels (Settings → Model). */
    modelsByEngine: Record<string, string[]>;
    labelsByEngine: Record<string, Record<string, string>>;
  }>({
    lastSeen: null,
    busy: false,
    engine: null,
    model: null,
    models: [],
    modelVariants: {},
    modelsByEngine: {},
    labelsByEngine: {},
  });

  // Refs mirror state for async work (poll, debounced save) so callbacks never act on stale values.
  const reportsRef = useRef<ReportItem[]>([]);
  const selectedRef = useRef<string | null>(null);
  const draftRef = useRef<ReportItem | null>(null);
  const baseRef = useRef<ReportItem | null>(null);
  const dirtyRef = useRef(false);
  const editSeq = useRef(0);
  const inFlight = useRef<Promise<void> | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const setDraftBoth = (next: ReportItem | null) => {
    draftRef.current = next;
    setDraft(next);
  };

  const setReportsBoth = (updater: (list: ReportItem[]) => ReportItem[]) => {
    reportsRef.current = updater(reportsRef.current);
    setReports(reportsRef.current);
  };

  /** Takes a fresh server copy of the selected case without discarding local edits. */
  const adopt = useCallback((server: ReportItem) => {
    if (server.id !== selectedRef.current) return;
    baseRef.current = server;
    const local = draftRef.current;
    if (dirtyRef.current && local && local.id === server.id) {
      const edits = diffEditable(server, local);
      setDraftBoth({ ...server, ...edits });
    } else {
      setDraftBoth(server);
    }
  }, []);

  const upsert = useCallback(
    (row: ReportItem) => {
      setReportsBoth((list) => (list.some((r) => r.id === row.id) ? list.map((r) => (r.id === row.id ? row : r)) : [row, ...list]));
      adopt(row);
    },
    [adopt],
  );

  const refresh = useCallback(async () => {
    try {
      const [list, queue] = await Promise.all([
        api<ReportItem[]>('/api/reports'),
        api<{ workerLastSeen: number | null; workerBusy: boolean; workerEngine: string | null; workerModel: string | null; workerModels: string[]; workerModelVariants?: Record<string, string[]>; workerEngineModels?: Record<string, string[]>; workerEngineLabels?: Record<string, Record<string, string>> }>('/api/queue').catch(() => null),
      ]);
      reportsRef.current = list;
      setReports(list);
      setLoaded(true);
      setLoadError(null);
      if (queue)
        setEngine({
          lastSeen: queue.workerLastSeen,
          busy: queue.workerBusy,
          engine: queue.workerEngine,
          model: queue.workerModel,
          models: queue.workerModels ?? [],
          modelVariants: queue.workerModelVariants ?? {},
          modelsByEngine: queue.workerEngineModels ?? {},
          labelsByEngine: queue.workerEngineLabels ?? {},
        });
      const current = list.find((r) => r.id === selectedRef.current);
      if (current) adopt(current);
    } catch (error) {
      setLoadError((error as Error).message);
      setLoaded(true);
    }
  }, [adopt]);

  /* ---------- saving ---------- */

  const save = useCallback(async (): Promise<void> => {
    window.clearTimeout(timer.current);
    if (inFlight.current) await inFlight.current;
    const local = draftRef.current;
    const base = baseRef.current;
    if (!local || !base || local.id !== base.id || !dirtyRef.current) return;

    const patch = diffEditable(base, local);
    if (Object.keys(patch).length === 0) {
      dirtyRef.current = false;
      setSaveState('saved');
      return;
    }

    const seqAtStart = editSeq.current;
    setSaveState('saving');
    const run = (async () => {
      try {
        const row = await postJson<ReportItem>('/api/reports', { id: local.id, ...patch });
        setReportsBoth((list) => list.map((r) => (r.id === row.id ? row : r)));
        if (row.id !== selectedRef.current) return;
        baseRef.current = row;
        if (editSeq.current === seqAtStart) {
          dirtyRef.current = false;
          setDraftBoth(row);
          setSaveState('saved');
        } else {
          setDraftBoth({ ...row, ...diffEditable(row, draftRef.current ?? row) });
          setSaveState('dirty');
          timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
        }
      } catch (error) {
        const err = error as ApiError;
        if (err.status === 409) {
          dirtyRef.current = false;
          setSaveState('idle');
          toast.error('This case is locked', { description: `${err.message}. Your last edit was not saved.` });
          await refresh();
        } else {
          setSaveState('error');
          toast.error('Couldn’t save your changes', {
            description: `${err.message}. Your edits are still here; retry now or press Ctrl+S.`,
            duration: Infinity,
            closeButton: true,
            action: { label: 'Retry', onClick: () => void save() },
          });
        }
      }
    })();
    inFlight.current = run;
    await run;
    inFlight.current = null;
  }, [refresh]);

  /** Writes any pending edit before an action that depends on the stored report. */
  const flush = useCallback(async () => {
    if (dirtyRef.current) await save();
    else if (inFlight.current) await inFlight.current;
  }, [save]);

  const update = useCallback(
    (patch: ReportPatch) => {
      const local = draftRef.current;
      if (!local || isLocked(local.status)) return;
      setDraftBoth({ ...local, ...patch });
      dirtyRef.current = true;
      editSeq.current += 1;
      setSaveState('dirty');
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void save(), AUTOSAVE_MS);
    },
    [save],
  );

  /**
   * Letterhead / sign-off edit: autosaved onto the open case and, at the same time, into the stored
   * profile every case created from now on prints with. Two writes, one debounce; the case wins.
   */
  const profileTimer = useRef<number | undefined>(undefined);
  const pendingProfile = useRef<InstitutionProfile | null>(null);
  const profileSeq = useRef(0);

  const writeProfile = useCallback(async (profile: InstitutionProfile) => {
    const local = draftRef.current;
    const encoded = JSON.stringify(profile);
    const caseWrite = local && !isLocked(local.status)
      ? postJson<ReportItem>('/api/reports', { id: local.id, institutionJson: encoded }).catch((error) => {
          toast.error('Couldn’t save the sign-off', { description: (error as Error).message });
          return null;
        })
      : Promise.resolve(null);
    const settingWrite = postJson<{ institution: InstitutionProfile }>('/api/settings', { institution: profile }).catch((error) => {
      toast.error('Couldn’t save the sign-off profile', { description: (error as Error).message });
    });
    const [row] = await Promise.all([caseWrite, settingWrite]);
    if (row) {
      setReportsBoth((list) => list.map((r) => (r.id === row.id ? row : r)));
      if (row.id === selectedRef.current) {
        baseRef.current = row;
        // A poll may have replaced the draft meanwhile; only the profile half is adopted.
        setDraftBoth({ ...(draftRef.current ?? row), institutionJson: row.institutionJson });
      }
    }
  }, []);

  const updateInstitution = useCallback(
    (patch: Partial<InstitutionProfile>) => {
      const local = draftRef.current;
      if (!local || isLocked(local.status)) return;
      const current = pendingProfile.current ?? profileFromSnapshot(local.institutionJson);
      const next = sanitizeProfile({ ...current, ...patch });
      pendingProfile.current = next;
      setDraftBoth({ ...local, institutionJson: JSON.stringify(next) });
      const seq = ++profileSeq.current;
      window.clearTimeout(profileTimer.current);
      profileTimer.current = window.setTimeout(() => {
        pendingProfile.current = null;
        if (profileSeq.current === seq) void writeProfile(next);
      }, AUTOSAVE_MS);
    },
    [writeProfile],
  );

  /* ---------- selection ---------- */

  const select = useCallback(
    async (id: string | null) => {
      if (id === selectedRef.current) return;
      await flush();
      selectedRef.current = id;
      setSelectedId(id);
      const row = reportsRef.current.find((r) => r.id === id) ?? null;
      baseRef.current = row;
      dirtyRef.current = false;
      setDraftBoth(row);
      setSaveState('idle');
    },
    [flush],
  );

  // Initial load, then pick the newest active case.
  useEffect(() => {
    void refresh().then(() => {
      if (selectedRef.current) return;
      const first = reportsRef.current.find((r) => !r.isArchived);
      if (first) void select(first.id);
    });
  }, [refresh, select]);

  // Poll: brisk while the AI is working, relaxed otherwise, paused in background tabs.
  const hasActiveJobs = reports.some((r) => !r.isArchived && (r.status === 'QUEUED' || r.status === 'PROCESSING'));
  useEffect(() => {
    const every = hasActiveJobs ? 3000 : 10_000;
    const id = window.setInterval(() => {
      if (!document.hidden) void refresh();
    }, every);
    return () => window.clearInterval(id);
  }, [hasActiveJobs, refresh]);

  // Leaving the tab: push pending edits with keepalive; coming back: refresh at once.
  useEffect(() => {
    const onVisibility = () => {
      if (document.hidden) {
        const local = draftRef.current;
        const base = baseRef.current;
        if (dirtyRef.current && local && base) {
          void fetch('/api/reports', {
            method: 'POST',
            keepalive: true,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: local.id, ...diffEditable(base, local) }),
          }).catch(() => {});
        }
      } else {
        void refresh();
      }
    };
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) e.preventDefault();
    };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [refresh]);

  /* ---------- actions ---------- */

  const ingest = useCallback(
    async (files: File[]) => {
      const created: ReportItem[] = [];
      for (const file of files) {
        const form = new FormData();
        form.append('image', file);
        try {
          created.push(await api<ReportItem>('/api/ingest', { method: 'POST', body: form }));
        } catch (error) {
          toast.error(`Couldn’t add ${file.name}`, { description: (error as Error).message, duration: Infinity, closeButton: true });
        }
      }
      if (!created.length) return;
      setReportsBoth((list) => [...created.reverse(), ...list]);
      await select(created[0].id);
      toast.success(created.length === 1 ? 'Note added and queued for the AI' : `${created.length} notes added and queued for the AI`);
    },
    [select],
  );

  /** Returns 'needsConfirm' when the draft has content that regenerating would replace. */
  const enqueue = useCallback(
    async (id: string, force = false): Promise<'ok' | 'needsConfirm' | 'error'> => {
      await flush();
      try {
        upsert(await postJson<ReportItem>('/api/queue', { action: 'enqueue', reportId: id, force }));
        toast.success('Queued for the AI');
        return 'ok';
      } catch (error) {
        const err = error as ApiError;
        if (err.data?.needsConfirm) return 'needsConfirm';
        toast.error('Couldn’t queue this case', { description: err.message });
        return 'error';
      }
    },
    [flush, upsert],
  );

  const retryFailed = useCallback(async () => {
    try {
      const { count } = await postJson<{ count: number }>('/api/queue', { action: 'retry_failed' });
      toast.success(count ? `${count} case${count === 1 ? '' : 's'} sent back to the AI` : 'Nothing to retry');
      await refresh();
    } catch (error) {
      toast.error('Couldn’t retry', { description: (error as Error).message });
    }
  }, [refresh]);

  const syncInput = useCallback(async () => {
    try {
      const { message, importedCount } = await postJson<{ message: string; importedCount: number }>('/api/sync-input', {});
      (importedCount ? toast.success : toast.info)(message);
      await refresh();
    } catch (error) {
      toast.error('Couldn’t sync the input folder', { description: (error as Error).message });
    }
  }, [refresh]);

  const act = useCallback(
    async (id: string, action: CaseAction) => {
      await flush();
      try {
        const row = await postJson<ReportItem>('/api/reports', { id, action });
        upsert(row);
        return row;
      } catch (error) {
        toast.error('That didn’t work', { description: (error as Error).message });
        return null;
      }
    },
    [flush, upsert],
  );

  const replaceImage = useCallback(
    async (file: File) => {
      const local = draftRef.current;
      if (!local) return;
      const form = new FormData();
      form.append('image', file);
      try {
        const { url } = await api<{ url: string }>('/api/upload', { method: 'POST', body: form });
        update({ imagePath: url });
        await save();
        toast.success('Source note photo replaced');
      } catch (error) {
        toast.error('Couldn’t replace the photo', { description: (error as Error).message });
      }
    },
    [save, update],
  );

  /** Generates the PDF, downloads it and marks the case FINALIZED (server-side). */
  const downloadPdf = useCallback(
    async (report: ReportItem) => {
      await flush();
      const res = await fetch(`/api/pdf/${report.id}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `PDF generation failed (${res.status})`);
      }
      const blob = await res.blob();
      const clean = (s: string, fallback: string) => s.trim().replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || fallback;
      const name = `${clean(report.patientName, 'Report')}_${clean(report.age, 'NA')}_${clean(report.tokenNumber, 'NA')}.pdf`;
      const url = URL.createObjectURL(blob);
      const a = Object.assign(document.createElement('a'), { href: url, download: name });
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
      await refresh();
      return name;
    },
    [flush, refresh],
  );

  const engineOnline = engine.lastSeen !== null && Date.now() - engine.lastSeen < ENGINE_FRESH_MS;

  const counts = useMemo(() => {
    const active = reports.filter((r) => !r.isArchived);
    return {
      active: active.length,
      archived: reports.length - active.length,
      failed: active.filter((r) => r.status === 'FAILED').length,
    };
  }, [reports]);

  return {
    reports,
    loaded,
    loadError,
    selectedId,
    draft,
    saveState,
    engineOnline,
    engineBusy: engine.busy,
    engineEngine: engine.engine,
    engineModel: engine.model,
    engineModels: engine.models,
    engineModelVariants: engine.modelVariants,
    engineModelsByEngine: engine.modelsByEngine,
    engineModelLabels: engine.labelsByEngine,
    counts,
    refresh,
    select,
    update,
    updateInstitution,
    save,
    flush,
    ingest,
    enqueue,
    retryFailed,
    syncInput,
    act,
    replaceImage,
    downloadPdf,
  };
}

export type ReportsApi = ReturnType<typeof useReports>;
