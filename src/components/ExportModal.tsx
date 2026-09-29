import React, { useState } from 'react';
import { X, Copy, Check, Download, Terminal, FileDown } from 'lucide-react';
import { TeraFile } from '../types/terabox';
import {
  generateAria2Command,
  generateCurlCommand,
  generateWgetCommand,
  generateIdmExport,
} from '../utils/formatter';

interface ExportModalProps {
  files: TeraFile[];
  onClose: () => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({ files, onClose }) => {
  const [format, setFormat] = useState<'aria2' | 'curl' | 'wget' | 'idm' | 'links'>('aria2');
  const [threads, setThreads] = useState<number>(16);
  const [copied, setCopied] = useState(false);

  if (files.length === 0) return null;

  const getContent = (): string => {
    switch (format) {
      case 'aria2':
        return files.map((f) => generateAria2Command(f, threads)).join('\n\n');
      case 'curl':
        return files.map((f) => generateCurlCommand(f)).join('\n\n');
      case 'wget':
        return files.map((f) => generateWgetCommand(f)).join('\n\n');
      case 'idm':
        return generateIdmExport(files);
      case 'links':
        return files
          .map((f) => {
            const url = f.directDlink || f.downloadUrl;
            return url.startsWith('/') ? `${window.location.origin}${url}` : url;
          })
          .join('\n');
    }
  };

  const content = getContent();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      //
    }
  };

  const handleDownloadFile = () => {
    let filename = 'terafetch_download.txt';
    if (format === 'aria2') filename = 'aria2_download.sh';
    if (format === 'idm') filename = 'terafetch_export.ef2';

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-3xl rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/70">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Multi-Thread Acceleration Scripts
              </h3>
              <p className="text-xs text-slate-400">
                Download with 16x speed using external download managers (IDM, Aria2, Curl)
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Tab format selectors */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-3 bg-slate-900/40">
          <div className="flex items-center gap-1.5">
            {(
              [
                { id: 'aria2', label: 'Aria2 (Multi-Thread)' },
                { id: 'idm', label: 'IDM Batch (.ef2)' },
                { id: 'curl', label: 'cURL' },
                { id: 'wget', label: 'Wget' },
                { id: 'links', label: 'Plain URLs' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFormat(tab.id)}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  format === tab.id
                    ? 'bg-slate-800 text-cyan-400 border border-slate-700 font-semibold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {format === 'aria2' && (
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <span>Connections:</span>
              <select
                value={threads}
                onChange={(e) => setThreads(parseInt(e.target.value, 10))}
                className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-slate-200 text-xs font-mono"
              >
                <option value={8}>8 Threads</option>
                <option value={16}>16 Threads</option>
                <option value={32}>32 Threads</option>
              </select>
            </div>
          )}
        </div>

        {/* Code Content */}
        <div className="p-6">
          <div className="relative">
            <textarea
              readOnly
              value={content}
              rows={9}
              className="w-full rounded-xl border border-slate-800 bg-slate-900/90 p-4 font-mono text-xs text-slate-200 focus:outline-none selection:bg-cyan-500/20 resize-none"
            />
          </div>

          <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-slate-500">
              <span>Selected: {files.length} file{files.length === 1 ? '' : 's'}</span>
              <span className="mx-2">·</span>
              <span>All headers (User-Agent, Referer) automatically injected</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                onClick={handleDownloadFile}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3.5 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <FileDown className="h-4 w-4" />
                <span>Save as File</span>
              </button>

              <button
                onClick={handleCopy}
                className="flex flex-1 sm:flex-initial items-center justify-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    <span>Copy to Clipboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
