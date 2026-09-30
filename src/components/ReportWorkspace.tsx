import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Download, Eye, Save, ZoomIn, ZoomOut, RotateCw, 
  CheckCircle, AlertCircle, Shield, RefreshCw, ChevronRight, Search, 
  Printer, ArrowLeft, Check, Sparkles, PanelLeftClose, PanelLeftOpen, Maximize2, Columns,
  Image as ImageIcon, Camera, AlertTriangle, FolderDown, Move, Trash2, Archive, RotateCcw
} from 'lucide-react';
import { AuditModal } from './AuditModal';

interface ReportItem {
  id: string;
  tokenNumber: string;
  patientName: string;
  age: string;
  gender: string;
  mrNumber?: string;
  modality: string;
  studyDate: string;
  reportingDate: string;
  referringClinician?: string;
  clinicalHistory?: string;
  comparison?: string;
  technique: string;
  findingsJson: string;
  findingsMarkdown: string;
  impressionMarkdown: string;
  recommendationsMarkdown: string;
  isUrgent?: boolean;
  urgentFindings?: string;
  urgentCallLog?: string;
  imagePath: string;
  verbatimTranscription?: string;
  status: string;
  isArchived?: boolean;
  verificationSheetMarkdown?: string;
}

export const ReportWorkspace: React.FC = () => {
  const [reports, setReports] = useState<ReportItem[]>([]);
  const [selectedReport, setSelectedReport] = useState<ReportItem | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isAuditModalOpen, setIsAuditModalOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [isImagePaneCollapsed, setIsImagePaneCollapsed] = useState(false);

  // Image viewer states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [imageError, setImageError] = useState(false);
  const [viewMode, setViewMode] = useState<'image' | 'transcription'>('image');

  // Pan and drag states for large original photos
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Sync input folder states
  const [isSyncingInput, setIsSyncingInput] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);

  // AI Queue states
  const [isQueueing, setIsQueueing] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [queueMessage, setQueueMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const noteReplaceInputRef = useRef<HTMLInputElement>(null);

  // Image URL resolver helper
  const getDisplayImageUrl = (pathStr?: string) => {
    if (!pathStr) return '/assets/sample_note.png';
    if (pathStr.startsWith('http://') || pathStr.startsWith('https://')) return pathStr;
    if (pathStr.startsWith('/assets/')) return pathStr;
    if (pathStr.startsWith('/uploads/')) return pathStr;
    if (pathStr.startsWith('/api/image')) return pathStr;
    const filename = pathStr.split(/[/\\]/).pop() || pathStr;
    return `/api/image?file=${encodeURIComponent(filename)}`;
  };

  useEffect(() => {
    setImageError(false);
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  }, [selectedReport?.id]);

  // Load existing reports from SQLite
  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data: ReportItem[] = await res.json();
        setReports(data);
        const active = data.filter(r => !r.isArchived && r.status !== 'ARCHIVED');
        if (active.length > 0) {
          if (!selectedReport || selectedReport.isArchived || selectedReport.status === 'ARCHIVED') {
            setSelectedReport(active[0]);
          } else {
            // Keep updated state for selected report if changed by worker
            const updatedSelected = active.find(r => r.id === selectedReport.id);
            if (updatedSelected) {
              setSelectedReport(updatedSelected);
            }
          }
        } else {
          setSelectedReport(null);
        }
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

  // Smart Auto-Polling (Option A): Checks queue and auto-refreshes while jobs are queued or processing
  useEffect(() => {
    const hasActiveQueueJobs = reports.some(r => r.status === 'QUEUED' || r.status === 'PROCESSING');
    if (!hasActiveQueueJobs) return;

    const interval = setInterval(async () => {
      try {
        await loadReports();
      } catch (e) {
        console.error('Auto-poll error:', e);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [reports]);

  // Manual fallback refresh (Option B)
  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    try {
      await loadReports();
    } finally {
      setTimeout(() => setIsRefreshing(false), 500);
    }
  };

  // Enqueue all unprocessed / draft notes
  const handleEnqueueAll = async () => {
    setIsQueueing(true);
    setQueueMessage(null);
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue_all' })
      });
      const data = await res.json();
      if (res.ok) {
        setQueueMessage(data.message);
        setTimeout(() => setQueueMessage(null), 4000);
        await loadReports();
      } else {
        alert(data.error || 'Failed to queue reports');
      }
    } catch (e: any) {
      alert('Error queueing reports: ' + e.message);
    } finally {
      setIsQueueing(false);
    }
  };

  // Enqueue single report
  const handleEnqueueSingle = async (reportId: string) => {
    setIsQueueing(true);
    try {
      const res = await fetch('/api/queue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'enqueue_single', reportId })
      });
      const data = await res.json();
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, status: 'QUEUED' } : r));
        if (selectedReport?.id === reportId) {
          setSelectedReport(prev => prev ? { ...prev, status: 'QUEUED' } : null);
        }
      } else {
        alert(data.error || 'Failed to queue report');
      }
    } catch (e: any) {
      alert('Error queueing report: ' + e.message);
    } finally {
      setIsQueueing(false);
    }
  };

  // Handle Drag & Drop / File Upload
  const handleFileUpload = async (file: File) => {
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      // Trigger AI transcription engine
      const transcribeRes = await fetch('/api/transcribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imagePath: uploadData.url,
          manualData: {
            patientName: file.name.replace(/\.[^/.]+$/, '').replace(/[^a-zA-Z\s]/g, ' ').trim() || 'Patient',
            tokenNumber: (Math.floor(7000 + Math.random() * 900)).toString()
          }
        }),
      });

      if (!transcribeRes.ok) throw new Error('Transcription failed');
      const newReport = await transcribeRes.json();

      setReports(prev => [newReport, ...prev]);
      setSelectedReport(newReport);
    } catch (err: any) {
      alert('Error processing note: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // 1-Click PDF Download
  const handleDownloadPdf = async () => {
    if (!selectedReport) return;
    setIsDownloading(true);
    try {
      const cleanName = (selectedReport.patientName || 'Patient').trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanAge = (selectedReport.age || 'Age').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const cleanToken = (selectedReport.tokenNumber || 'Token').trim().replace(/[^a-zA-Z0-9_-]/g, '');
      const filename = `${cleanName}_${cleanAge}_${cleanToken}.pdf`;

      const res = await fetch(`/api/pdf/${selectedReport.id}`);
      if (!res.ok) throw new Error('Failed to generate PDF');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      // Refresh list to show FINALIZED status
      loadReports();
    } catch (e: any) {
      alert('Download error: ' + e.message);
    } finally {
      setIsDownloading(false);
    }
  };

  // Save changes to current report
  const handleSaveChanges = async () => {
    if (!selectedReport) return;
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(selectedReport)
      });
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
        loadReports();
      }
    } catch (e) {
      alert('Failed to save changes');
    }
  };

  // Replace or attach note image
  const handleReplaceImage = async (file: File) => {
    if (!selectedReport) return;
    setIsLoading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);

      const uploadRes = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) throw new Error('Upload failed');
      const uploadData = await uploadRes.json();

      const updated = { ...selectedReport, imagePath: uploadData.url };
      setSelectedReport(updated);
      setImageError(false);
      setViewMode('image');

      await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updated),
      });

      setReports(prev => prev.map(r => r.id === updated.id ? updated : r));
    } catch (err: any) {
      alert('Failed to attach note image: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Sync images directly from input/ folder
  const handleSyncInput = async () => {
    setIsSyncingInput(true);
    setSyncMessage(null);
    try {
      const res = await fetch('/api/sync-input', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setSyncMessage(data.message);
        setTimeout(() => setSyncMessage(null), 5000);
        await loadReports();
      } else {
        alert(data.error || 'Failed to sync input folder');
      }
    } catch (e: any) {
      alert('Error syncing input folder: ' + e.message);
    } finally {
      setIsSyncingInput(false);
    }
  };

  // Smooth drag to pan high-resolution original photos
  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 1) {
      setIsDragging(true);
      setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging && zoom > 1) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Soft-delete: removes from dashboard UI queue while safely preserving row in database
  const handleDeleteReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    if (!confirm('Remove this case from the active queue? (All clinical data & original scan photos will remain preserved safely in the database archive)')) {
      return;
    }

    try {
      const res = await fetch(`/api/reports?id=${reportId}`, { method: 'DELETE' });
      if (res.ok) {
        setReports(prev => prev.map(r => r.id === reportId ? { ...r, isArchived: true, status: 'ARCHIVED' } : r));
        if (selectedReport?.id === reportId) {
          const remaining = reports.filter(r => r.id !== reportId && !r.isArchived && r.status !== 'ARCHIVED');
          setSelectedReport(remaining.length > 0 ? remaining[0] : null);
        }
      } else {
        alert('Failed to remove report from queue');
      }
    } catch (err: any) {
      alert('Error removing report: ' + err.message);
    }
  };

  // Restore archived report back to active queue
  const handleRestoreReport = async (e: React.MouseEvent, reportId: string) => {
    e.stopPropagation();
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: reportId, isArchived: false, status: 'DRAFT' })
      });
      if (res.ok) {
        const updated = await res.json();
        setReports(prev => prev.map(r => r.id === reportId ? updated : r));
        setSelectedReport(updated);
      }
    } catch (err: any) {
      alert('Failed to restore report: ' + err.message);
    }
  };

  const activeReports = reports.filter(r => !r.isArchived && r.status !== 'ARCHIVED');
  const archivedCount = reports.filter(r => r.isArchived || r.status === 'ARCHIVED').length;

  const filteredReports = (showArchived ? reports : activeReports).filter(r => 
    r.patientName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.tokenNumber.includes(searchQuery) ||
    r.modality.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen bg-[#F8FAFC] text-[#0F172A] font-sans overflow-hidden">
      {/* LEFT SIDEBAR: Report Queue & Ingestion */}
      <div className={`${isSidebarCollapsed ? 'w-0 overflow-hidden border-none opacity-0' : 'w-80 border-r border-[#CBD5E1] opacity-100'} bg-white flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
        {/* App Title & Brand with Collapse Button */}
        <div className="p-4 border-b border-[#CBD5E1] bg-[#0F2C59] text-white flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-[#2563EB]" />
              <span className="font-black text-sm tracking-wider uppercase">PolytronX</span>
            </div>
            <p className="text-[11px] text-slate-300 font-medium tracking-wide">
              Radiology Reporting AI Assistant
            </p>
          </div>
          <button
            onClick={() => setIsSidebarCollapsed(true)}
            className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Collapse Sidebar"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        </div>

        {/* Drag & Drop Upload Zone */}
        <div className="p-3 border-b border-slate-200 bg-slate-50">
          <div 
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              if (e.dataTransfer.files?.[0]) handleFileUpload(e.dataTransfer.files[0]);
            }}
            className="border-2 border-dashed border-[#2563EB]/40 hover:border-[#2563EB] rounded-lg p-3 text-center cursor-pointer transition-all bg-white hover:bg-blue-50/50 group"
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*"
              onChange={(e) => {
                if (e.target.files?.[0]) handleFileUpload(e.target.files[0]);
              }} 
            />
            <div className="flex flex-col items-center gap-1.5">
              <Upload className="h-6 w-6 text-[#2563EB] group-hover:scale-110 transition-transform" />
              <div className="text-xs font-bold text-slate-700">
                {isLoading ? 'Deciphering Note...' : 'Drop Senior Note Image'}
              </div>
              <p className="text-[10px] text-slate-500">
                1-Click auto-transcription & structured report
              </p>
            </div>
          </div>

          {/* Sync input/ folder button */}
          <div className="mt-2.5 pt-2 border-t border-slate-200/80">
            <button
              onClick={handleSyncInput}
              disabled={isSyncingInput}
              className="w-full py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-300 text-xs font-semibold text-slate-700 hover:text-[#0F2C59] flex items-center justify-center gap-1.5 shadow-xs transition-all active:scale-[0.98]"
              title="Batch import all handwritten photos placed in c:\Users\Admin\Desktop\CT SCAN GMCTH SEPTEMBER 2026\input\"
            >
              <FolderDown className={`h-3.5 w-3.5 text-[#2563EB] ${isSyncingInput ? 'animate-bounce' : ''}`} />
              <span>{isSyncingInput ? 'Scanning input/ Folder...' : 'Sync `input/` Folder'}</span>
            </button>
            {syncMessage && (
              <p className="mt-1.5 text-[10px] text-emerald-800 font-medium text-center bg-emerald-50 py-1 px-1.5 rounded border border-emerald-200">
                {syncMessage}
              </p>
            )}
          </div>

          {/* Master Queue for AI - Generation Button */}
          <div className="mt-2 pt-2 border-t border-slate-200/80">
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleEnqueueAll}
                disabled={isQueueing}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-[#0F2C59] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all active:scale-[0.98] disabled:opacity-50"
                title="Queue all unprocessed notes into the AI - Generation pipeline"
              >
                <Sparkles className={`h-3.5 w-3.5 text-amber-400 ${isQueueing ? 'animate-spin' : ''}`} />
                <span>{isQueueing ? 'Queueing...' : 'Queue for AI - Generation'}</span>
              </button>
              <button
                onClick={handleManualRefresh}
                disabled={isRefreshing}
                className="p-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-xs"
                title="Refresh queue and report status"
              >
                <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-[#2563EB]' : ''}`} />
              </button>
            </div>
            {queueMessage && (
              <p className="mt-1.5 text-[10px] text-blue-800 font-medium text-center bg-blue-50 py-1 px-1.5 rounded border border-blue-200">
                {queueMessage}
              </p>
            )}
          </div>
        </div>

        {/* Search Bar */}
        <div className="p-2 border-b border-slate-200">
          <div className="relative">
            <Search className="h-3.5 w-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search patient, token, modality..." 
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-slate-200 focus:outline-none focus:border-[#2563EB]"
            />
          </div>
        </div>

        {/* Report Queue List */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
          {filteredReports.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No reports found. Drop a handwritten note to begin.
            </div>
          ) : (
            filteredReports.map((r) => (
              <div
                key={r.id}
                onClick={() => setSelectedReport(r)}
                className={`p-3 cursor-pointer transition-colors text-xs ${
                  selectedReport?.id === r.id 
                    ? 'bg-blue-50/70 border-l-4 border-l-[#2563EB]' 
                    : 'hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 truncate uppercase">
                    {r.patientName}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-bold text-[#0F2C59] bg-slate-100 px-1.5 py-0.5 rounded">
                      #{r.tokenNumber}
                    </span>
                    {r.isArchived || r.status === 'ARCHIVED' ? (
                      <button
                        onClick={(e) => handleRestoreReport(e, r.id)}
                        className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                        title="Restore to active queue"
                      >
                        <RotateCcw className="h-3 w-3" />
                      </button>
                    ) : (
                      <button
                        onClick={(e) => handleDeleteReport(e, r.id)}
                        className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                        title="Remove from queue (Preserved in database)"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="text-[11px] text-slate-500 truncate mb-1">
                  {r.modality}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{r.studyDate}</span>
                  <div className="flex items-center gap-1">
                    {r.status === 'QUEUED' ? (
                      <span className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                        <Sparkles className="h-2.5 w-2.5 text-blue-600" />
                        Queued for AI
                      </span>
                    ) : r.status === 'PROCESSING' ? (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-bold flex items-center gap-1 animate-pulse">
                        <RefreshCw className="h-2.5 w-2.5 animate-spin text-amber-600" />
                        Generating...
                      </span>
                    ) : (
                      <>
                        <span className={`px-1.5 py-0.5 rounded font-medium ${
                          r.isArchived || r.status === 'ARCHIVED'
                            ? 'bg-slate-100 text-slate-600'
                            : r.status === 'FINALIZED' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-slate-100 text-slate-700'
                        }`}>
                          {r.isArchived || r.status === 'ARCHIVED' ? 'ARCHIVED' : r.status}
                        </span>
                        {!r.isArchived && r.status !== 'ARCHIVED' && r.status !== 'FINALIZED' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEnqueueSingle(r.id);
                            }}
                            className="p-1 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors"
                            title="Queue for AI - Generation"
                          >
                            <Sparkles className="h-3 w-3" />
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Archive toggle footer */}
        {archivedCount > 0 && (
          <div className="p-2 border-t border-slate-200 bg-slate-50 text-center shrink-0">
            <button
              onClick={() => setShowArchived(!showArchived)}
              className="text-[11px] text-slate-500 hover:text-slate-800 font-medium flex items-center justify-center gap-1.5 mx-auto transition-colors"
            >
              <Archive className="h-3 w-3 text-slate-400" />
              <span>{showArchived ? 'Hide Archived' : `Show Archived (${archivedCount})`}</span>
            </button>
          </div>
        )}
      </div>

      {/* MAIN SIDE-BY-SIDE REVIEW WORKSPACE */}
      {selectedReport ? (
        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Top Bar with 1-Click Action Buttons */}
          <div className="h-14 px-6 bg-white border-b border-[#CBD5E1] flex items-center justify-between shrink-0 shadow-sm">
            <div className="flex items-center gap-3">
              {isSidebarCollapsed && (
                <button
                  onClick={() => setIsSidebarCollapsed(false)}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-1.5 shadow-sm transition-colors mr-1"
                  title="Expand Queue Sidebar"
                >
                  <PanelLeftOpen className="h-4 w-4 text-[#2563EB]" />
                  <span>Queue</span>
                </button>
              )}
              <span className="text-sm font-extrabold text-[#0F2C59] tracking-tight uppercase">
                {selectedReport.patientName}
              </span>
              <span className="text-xs font-mono font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-700">
                Token #{selectedReport.tokenNumber}
              </span>
              <span className="text-xs text-slate-500">
                {selectedReport.age} / {selectedReport.gender}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {(!selectedReport.isArchived && selectedReport.status !== 'FINALIZED') && (
                <button
                  onClick={() => handleEnqueueSingle(selectedReport.id)}
                  disabled={isQueueing || selectedReport.status === 'QUEUED' || selectedReport.status === 'PROCESSING'}
                  className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs ${
                    selectedReport.status === 'QUEUED'
                      ? 'border-blue-300 bg-blue-50 text-blue-700 animate-pulse'
                      : selectedReport.status === 'PROCESSING'
                      ? 'border-amber-300 bg-amber-50 text-amber-700 animate-pulse'
                      : 'border-slate-300 bg-white hover:bg-amber-50/50 hover:border-amber-300 text-slate-700 hover:text-amber-900'
                  }`}
                  title="Queue this case for AI consultant report generation"
                >
                  <Sparkles className={`h-3.5 w-3.5 ${selectedReport.status === 'QUEUED' || selectedReport.status === 'PROCESSING' ? 'text-blue-600 animate-spin' : 'text-amber-500'}`} />
                  <span>
                    {selectedReport.status === 'QUEUED'
                      ? 'In AI Queue...'
                      : selectedReport.status === 'PROCESSING'
                      ? 'AI Generating...'
                      : 'Queue for AI - Generation'}
                  </span>
                </button>
              )}

              <button
                onClick={() => setIsAuditModalOpen(true)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Eye className="h-3.5 w-3.5 text-slate-500" />
                View Audit Sheet
              </button>

              <button
                onClick={handleSaveChanges}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                {saveSuccess ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Save className="h-3.5 w-3.5 text-slate-500" />}
                {saveSuccess ? 'Saved' : 'Save Draft'}
              </button>

              <button
                onClick={() => setIsImagePaneCollapsed(!isImagePaneCollapsed)}
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
                title={isImagePaneCollapsed ? "Show Source Note" : "Maximize Report Editor"}
              >
                {isImagePaneCollapsed ? <Columns className="h-3.5 w-3.5 text-[#2563EB]" /> : <Maximize2 className="h-3.5 w-3.5 text-slate-500" />}
                <span>{isImagePaneCollapsed ? 'Split View' : 'Focus Mode'}</span>
              </button>

              <a
                href={`/print/${selectedReport.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-1.5 transition-colors"
              >
                <Printer className="h-3.5 w-3.5 text-slate-500" />
                Print Preview
              </a>

              {/* THE 1-CLICK EASY DOWNLOAD BUTTON */}
              <button
                onClick={handleDownloadPdf}
                disabled={isDownloading}
                className="px-4 py-1.5 rounded-lg bg-[#0F2C59] hover:bg-[#1E3A8A] text-white text-xs font-bold flex items-center gap-2 shadow-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download className="h-4 w-4 text-[#2563EB]" />
                {isDownloading ? 'Generating PDF...' : 'Approve & Download PDF'}
              </button>
            </div>
          </div>

          {/* SPLIT VIEW WORKSPACE: Image on Left, Structured Editor on Right */}
          <div className="flex-1 flex overflow-hidden">
            {/* LEFT PANE: Senior Handwritten Note Viewer with Zoom Controls & Verbatim Transcript */}
            <div className={`${isImagePaneCollapsed ? 'hidden' : 'w-1/2'} border-r border-[#CBD5E1] bg-slate-900 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out`}>
              {/* Hidden file input for replacing/attaching note */}
              <input 
                type="file" 
                ref={noteReplaceInputRef} 
                className="hidden" 
                accept="image/*"
                onChange={(e) => {
                  if (e.target.files?.[0]) handleReplaceImage(e.target.files[0]);
                }} 
              />

              {/* Viewer Toolbar */}
              <div className="p-2.5 bg-slate-950/95 border-b border-white/10 flex items-center justify-between z-10">
                {/* View Switcher Tabs */}
                <div className="flex items-center gap-1 bg-slate-800/90 p-0.5 rounded-lg border border-white/10">
                  <button
                    onClick={() => { setViewMode('image'); setImageError(false); }}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'image' 
                        ? 'bg-[#2563EB] text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <ImageIcon className="h-3.5 w-3.5" />
                    <span>Note Scan</span>
                  </button>
                  <button
                    onClick={() => setViewMode('transcription')}
                    className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                      viewMode === 'transcription' 
                        ? 'bg-[#2563EB] text-white shadow-sm' 
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    <FileText className="h-3.5 w-3.5" />
                    <span>Verbatim Text</span>
                  </button>
                </div>

                {/* Provenance Badge */}
                <div className="hidden sm:flex items-center">
                  {selectedReport.imagePath && selectedReport.imagePath.includes('sample_note.png') ? (
                    <span className="text-[10px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded flex items-center gap-1 shadow-xs">
                      <span>ℹ️ Sample Tutorial Record</span>
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-xs truncate max-w-[220px]" title={selectedReport.imagePath}>
                      <Camera className="h-3 w-3 text-emerald-400 shrink-0" />
                      <span className="truncate">Original Note: {(selectedReport.imagePath || '').split(/[/\\]/).pop()}</span>
                    </span>
                  )}
                </div>

                {/* Controls */}
                <div className="flex items-center gap-1.5 text-white text-xs">
                  {viewMode === 'image' && (
                    <div className="flex items-center gap-1 bg-slate-800/90 rounded-lg p-0.5 border border-white/10">
                      <button 
                        onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                        className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors" 
                        title="Zoom In"
                      >
                        <ZoomIn className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                        className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors" 
                        title="Zoom Out"
                      >
                        <ZoomOut className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={() => { setZoom(1); setRotation(0); setPan({ x: 0, y: 0 }); }}
                        className="px-1.5 py-0.5 hover:bg-white/20 rounded text-[10px] font-mono text-slate-300 hover:text-white transition-colors" 
                        title="Reset 100%"
                      >
                        100%
                      </button>
                      <button 
                        onClick={() => setRotation(r => (r + 90) % 360)}
                        className="p-1 hover:bg-white/20 rounded text-slate-300 hover:text-white transition-colors" 
                        title="Rotate"
                      >
                        <RotateCw className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}

                  <button
                    onClick={() => noteReplaceInputRef.current?.click()}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors shadow-sm"
                    title="Upload or replace note image"
                  >
                    <Camera className="h-3.5 w-3.5 text-amber-400" />
                    <span className="hidden sm:inline">Attach Scan</span>
                  </button>
                </div>
              </div>

              {/* Canvas Area with Smooth Pan & Drag for High-Res Photos */}
              <div 
                className="flex-1 flex items-center justify-center p-4 overflow-hidden bg-slate-900 select-none relative"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {/* Pan Hint when zoomed in */}
                {zoom > 1 && viewMode === 'image' && !imageError && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 z-10 bg-black/60 backdrop-blur-sm text-slate-300 text-[10px] px-2.5 py-0.5 rounded-full border border-white/10 pointer-events-none flex items-center gap-1">
                    <Move className="h-2.5 w-2.5 text-amber-400" />
                    <span>Drag to pan & inspect handwriting</span>
                  </div>
                )}

                {viewMode === 'image' && !imageError ? (
                  <div 
                    className="relative flex items-center justify-center"
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px)`,
                      cursor: zoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default'
                    }}
                    onMouseDown={handleMouseDown}
                  >
                    <img 
                      src={getDisplayImageUrl(selectedReport.imagePath)} 
                      alt="Senior Radiologist Handwritten Note"
                      draggable={false}
                      onError={() => setImageError(true)}
                      style={{
                        transform: `scale(${zoom}) rotate(${rotation}deg)`,
                        transition: isDragging ? 'none' : 'transform 0.15s ease-out',
                        maxHeight: '82vh',
                        maxWidth: '90vw',
                        objectFit: 'contain'
                      }}
                      className="shadow-2xl rounded-md border border-white/20 select-none"
                    />
                  </div>
                ) : (
                  <div className="w-full max-w-md bg-[#FDFBF7] text-[#0F172A] rounded-lg shadow-2xl p-6 border-l-4 border-l-red-400 border border-slate-300 relative animate-in fade-in duration-200">
                    <div className="border-b border-slate-300 pb-3 mb-4 flex items-center justify-between">
                      <div>
                        <div className="text-[11px] font-extrabold uppercase text-[#0F2C59] tracking-wider">
                          Gujranwala Teaching Hospital
                        </div>
                        <div className="text-[10px] text-slate-500 font-semibold">
                          Department of Diagnostic Radiology — Consultant Findings
                        </div>
                      </div>
                      <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-red-100 text-red-700 rounded border border-red-200">
                        Token #{selectedReport.tokenNumber}
                      </span>
                    </div>

                    <div className="space-y-3 font-mono text-xs leading-relaxed text-blue-950 bg-blue-50/50 p-4 rounded border border-blue-100">
                      <div className="font-bold text-sm text-[#0F2C59] border-b border-blue-200 pb-1.5 flex justify-between items-center font-sans">
                        <span>Pt: {selectedReport.patientName} ({selectedReport.age} / {selectedReport.gender})</span>
                        <span className="text-xs text-slate-500">{selectedReport.studyDate}</span>
                      </div>
                      <div className="whitespace-pre-wrap font-sans text-xs text-slate-800 leading-relaxed pt-1">
                        {selectedReport.verbatimTranscription || (
                          <span className="italic text-slate-400">
                            {selectedReport.clinicalHistory || 'Primary handwritten findings transcribed and formatted into the clinical report on the right.'}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-200 flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 italic">
                        Senior Radiologist Primary Positive Findings
                      </span>
                      <button
                        onClick={() => noteReplaceInputRef.current?.click()}
                        className="text-[#2563EB] hover:underline font-semibold flex items-center gap-1"
                      >
                        <Camera className="h-3 w-3" />
                        Attach Original Photo
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-2 bg-slate-950 text-slate-400 text-[10px] text-center border-t border-white/10 flex items-center justify-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>Source: Senior Radiologist Handwritten Positive Findings Note (Unedited Primary Source)</span>
              </div>
            </div>

            {/* RIGHT PANE: Structured Consultant Report Editor */}
            <div className={`${isImagePaneCollapsed ? 'w-full max-w-5xl mx-auto' : 'w-1/2'} bg-white flex flex-col overflow-y-auto p-6 space-y-4 transition-all duration-300 ease-in-out`}>
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase text-[#0F2C59] tracking-wider">
                  Report Editor (RadLex Consultant Standard)
                </span>
                <span className="text-[10px] text-slate-400 font-mono">
                  Auto-formatted per AGENTS.md
                </span>
              </div>

              {/* Demographics Form Grid */}
              <div className="grid grid-cols-3 gap-3 p-3 bg-[#F8FAFC] border border-[#CBD5E1] rounded-lg text-xs">
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Patient Name</label>
                  <input 
                    type="text" 
                    value={selectedReport.patientName} 
                    onChange={e => setSelectedReport({...selectedReport, patientName: e.target.value})}
                    className="w-full p-1.5 rounded border border-slate-200 font-bold bg-white text-slate-900"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Token Number (4-digit)</label>
                  <input 
                    type="text" 
                    value={selectedReport.tokenNumber} 
                    onChange={e => setSelectedReport({...selectedReport, tokenNumber: e.target.value})}
                    className="w-full p-1.5 rounded border border-slate-200 font-mono font-bold bg-white text-[#0F2C59]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Age / Gender</label>
                  <div className="flex gap-1.5">
                    <input 
                      type="text" 
                      value={selectedReport.age} 
                      onChange={e => setSelectedReport({...selectedReport, age: e.target.value})}
                      className="w-1/2 p-1.5 rounded border border-slate-200 bg-white text-slate-900"
                    />
                    <input 
                      type="text" 
                      value={selectedReport.gender} 
                      onChange={e => setSelectedReport({...selectedReport, gender: e.target.value})}
                      className="w-1/2 p-1.5 rounded border border-slate-200 bg-white text-slate-900"
                    />
                  </div>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Modality Protocol</label>
                  <input 
                    type="text" 
                    value={selectedReport.modality} 
                    onChange={e => setSelectedReport({...selectedReport, modality: e.target.value})}
                    className="w-full p-1.5 rounded border border-slate-200 bg-white text-slate-900 font-medium"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Exam Date</label>
                  <input 
                    type="text" 
                    value={selectedReport.studyDate} 
                    onChange={e => setSelectedReport({...selectedReport, studyDate: e.target.value})}
                    className="w-full p-1.5 rounded border border-slate-200 bg-white text-slate-900"
                  />
                </div>
              </div>

              {/* Technique */}
              <div>
                <label className="text-[10px] font-bold text-[#0F2C59] uppercase tracking-wider block mb-1">Technique</label>
                <textarea 
                  rows={2}
                  value={selectedReport.technique} 
                  onChange={e => setSelectedReport({...selectedReport, technique: e.target.value})}
                  className="w-full p-2 text-xs rounded border border-slate-200 font-sans leading-relaxed focus:outline-none focus:border-[#2563EB]"
                />
              </div>

              {/* Impression (Numbered List) */}
              <div>
                <label className="text-[10px] font-bold text-[#0F2C59] uppercase tracking-wider block mb-1">Impression</label>
                <textarea 
                  rows={4}
                  value={selectedReport.impressionMarkdown} 
                  onChange={e => setSelectedReport({...selectedReport, impressionMarkdown: e.target.value})}
                  className="w-full p-2 text-xs rounded border border-slate-200 font-sans leading-relaxed focus:outline-none focus:border-[#2563EB] bg-slate-50/50"
                />
              </div>

              {/* Recommendations */}
              <div>
                <label className="text-[10px] font-bold text-[#2563EB] uppercase tracking-wider block mb-1">Recommendations</label>
                <textarea 
                  rows={2}
                  value={selectedReport.recommendationsMarkdown} 
                  onChange={e => setSelectedReport({...selectedReport, recommendationsMarkdown: e.target.value})}
                  className="w-full p-2 text-xs rounded border border-slate-200 font-sans leading-relaxed focus:outline-none focus:border-[#2563EB]"
                />
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center bg-slate-50">
          <div className="max-w-md p-8 bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col items-center">
            <div className="h-12 w-12 rounded-full bg-blue-50 text-[#2563EB] flex items-center justify-center mb-3">
              <Upload className="h-6 w-6" />
            </div>
            <h3 className="text-base font-extrabold text-[#0F2C59] mb-1">Queue Ready for Live Notes</h3>
            <p className="text-xs text-slate-500 mb-6 leading-relaxed">
              The previous test entries have been archived. Place your 5 real handwritten note photos into the <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded font-mono text-[11px]">input/</code> folder and click <strong>Sync `input/` Folder</strong>, or drag & drop them directly onto the upload box on the left!
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2 bg-[#0F2C59] hover:bg-[#1E3A8A] text-white rounded-lg text-xs font-bold flex items-center gap-2 shadow-sm transition-all"
            >
              <Upload className="h-4 w-4 text-[#2563EB]" />
              <span>Select Note Image</span>
            </button>
          </div>
        </div>
      )}

      {/* Audit Modal */}
      <AuditModal 
        isOpen={isAuditModalOpen} 
        onClose={() => setIsAuditModalOpen(false)} 
        report={selectedReport} 
      />
    </div>
  );
};
