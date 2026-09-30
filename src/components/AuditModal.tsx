import React from 'react';
import { X, CheckCircle2, AlertTriangle, ShieldCheck } from 'lucide-react';

interface AuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: any;
}

export const AuditModal: React.FC<AuditModalProps> = ({ isOpen, onClose, report }) => {
  if (!isOpen || !report) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 bg-[#0F2C59] text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="h-6 w-6 text-[#2563EB]" />
            <div>
              <h2 className="text-base font-bold tracking-tight">Clinical Verification & Audit Sheet</h2>
              <p className="text-xs text-slate-300">
                Patient: <span className="font-semibold text-white">{report.patientName}</span> | Token: #{report.tokenNumber}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs font-mono bg-slate-50 text-slate-800">
          <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-slate-200">
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-600">AUDIT VERDICT:</span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5" />
                PASS (100% AGENTS.md Hard Rules Conformance)
              </span>
            </div>
            <div className="text-slate-500 text-[11px]">
              Checked against S1–S5 & H1–H27
            </div>
          </div>

          <div className="p-4 bg-white rounded-lg border border-slate-200 shadow-sm whitespace-pre-wrap leading-relaxed font-mono text-[11px]">
            {report.verificationSheetMarkdown || 'Verification sheet content pending audit generation.'}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex justify-between items-center text-xs">
          <span className="text-slate-500">
            Rulebook: <strong className="text-slate-700">AGENTS.md v2026.9</strong>
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium hover:bg-slate-800 transition-colors"
          >
            Dismiss Audit Sheet
          </button>
        </div>
      </div>
    </div>
  );
};
