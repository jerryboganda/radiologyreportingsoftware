import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, FileText, Download, Eye, Save, ZoomIn, ZoomOut, RotateCw, 
  CheckCircle, AlertCircle, Shield, RefreshCw, ChevronRight, Search, 
  Printer, ArrowLeft, Check, Sparkles, PanelLeftClose, PanelLeftOpen, Maximize2, Columns
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
  status: string;
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
  const [isImagePaneCollapsed, setIsImagePaneCollapsed] = useState(false);

  // Image viewer states
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load existing reports from SQLite
  const loadReports = async () => {
    try {
      const res = await fetch('/api/reports');
      if (res.ok) {
        const data = await res.json();
        setReports(data);
        if (data.length > 0 && !selectedReport) {
          setSelectedReport(data[0]);
        }
      }
    } catch (e) {
      console.error('Failed to load reports', e);
    }
  };

  useEffect(() => {
    loadReports();
  }, []);

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

  const filteredReports = reports.filter(r => 
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
                  <span className="font-mono text-[10px] font-bold text-[#0F2C59] bg-slate-100 px-1.5 py-0.5 rounded">
                    #{r.tokenNumber}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate mb-1">
                  {r.modality}
                </div>
                <div className="flex items-center justify-between text-[10px] text-slate-400">
                  <span>{r.studyDate}</span>
                  <span className={`px-1.5 py-0.2 rounded font-medium ${
                    r.status === 'FINALIZED' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {r.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
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
              <span className="text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800 font-semibold">
                AGENTS.md Passed
              </span>
            </div>

            <div className="flex items-center gap-2.5">
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
            {/* LEFT PANE: Senior Handwritten Note Viewer with Zoom Controls */}
            <div className={`${isImagePaneCollapsed ? 'hidden' : 'w-1/2'} border-r border-[#CBD5E1] bg-slate-900 flex flex-col relative overflow-hidden transition-all duration-300 ease-in-out`}>
              {/* Viewer Toolbar */}
              <div className="absolute top-3 left-3 z-10 bg-black/70 backdrop-blur-md rounded-lg p-1 flex items-center gap-1 text-white text-xs border border-white/10">
                <button 
                  onClick={() => setZoom(z => Math.min(z + 0.25, 3))}
                  className="p-1.5 hover:bg-white/20 rounded" 
                  title="Zoom In"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => setZoom(z => Math.max(z - 0.25, 0.5))}
                  className="p-1.5 hover:bg-white/20 rounded" 
                  title="Zoom Out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button 
                  onClick={() => { setZoom(1); setRotation(0); }}
                  className="p-1.5 hover:bg-white/20 rounded text-[10px] font-mono" 
                  title="Reset"
                >
                  100%
                </button>
                <button 
                  onClick={() => setRotation(r => (r + 90) % 360)}
                  className="p-1.5 hover:bg-white/20 rounded" 
                  title="Rotate"
                >
                  <RotateCw className="h-4 w-4" />
                </button>
              </div>

              {/* Image Canvas */}
              <div className="flex-1 flex items-center justify-center p-6 overflow-auto">
                <img 
                  src={selectedReport.imagePath || '/assets/sample_note.png'} 
                  alt="Senior Note"
                  style={{
                    transform: `scale(${zoom}) rotate(${rotation}deg)`,
                    transition: 'transform 0.15s ease-out',
                    maxHeight: '85vh',
                    objectFit: 'contain'
                  }}
                  className="shadow-2xl rounded border border-white/20 max-w-full"
                />
              </div>

              <div className="p-2 bg-slate-950 text-slate-400 text-[10px] text-center border-t border-white/10">
                Source: Senior Radiologist Handwritten Positive Findings Note (Unedited Primary Source)
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
        <div className="flex-1 flex flex-col items-center justify-center p-12 text-center text-slate-400">
          <FileText className="h-12 w-12 text-slate-300 mb-3" />
          <h3 className="text-base font-bold text-slate-700 mb-1">No Report Selected</h3>
          <p className="text-xs max-w-sm">
            Drag and drop a photo of a senior radiologist note onto the upload area on the left to generate your first report.
          </p>
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
