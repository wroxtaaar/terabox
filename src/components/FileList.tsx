import React, { useState } from 'react';
import {
  Download,
  Play,
  Copy,
  Check,
  Terminal,
  FileVideo,
  FileAudio,
  FileArchive,
  FileText,
  FileCode,
  File,
  ExternalLink,
  Share2,
} from 'lucide-react';
import { TeraFile } from '../types/terabox';
import { saveToHistory, formatBytes } from '../utils/formatter';

interface FileListProps {
  files: TeraFile[];
  onOpenPlayer: (file: TeraFile) => void;
  onOpenExport: (files: TeraFile[]) => void;
  onClear: () => void;
}

export const FileList: React.FC<FileListProps> = ({
  files,
  onOpenPlayer,
  onOpenExport,
  onClear,
}) => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(files.map((f) => f.id)));
  const [filterQuery, setFilterQuery] = useState('');

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)));
    }
  };

  const handleCopyLink = async (file: TeraFile) => {
    const link = file.directDlink || file.downloadUrl;
    const fullUrl = link.startsWith('/') ? `${window.location.origin}${link}` : link;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(file.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // Fallback
    }
  };

  const handleDownload = (file: TeraFile) => {
    saveToHistory(file, 'completed');
    const targetUrl = file.downloadUrl || file.directDlink;
    if (targetUrl) {
      if (file.directDlink) {
        // Direct stream download
        const link = document.createElement('a');
        link.href = targetUrl;
        link.setAttribute('download', file.name);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        // Fallback to desktop web link (avoids downloading the 19.5 KB HTML as an MP4)
        window.open(targetUrl, '_blank', 'noopener,noreferrer');
      }
    }
  };

  const handleDownloadSelected = () => {
    const selectedFiles = files.filter((f) => selectedIds.has(f.id));
    selectedFiles.forEach((file, index) => {
      setTimeout(() => {
        handleDownload(file);
      }, index * 400);
    });
  };

  const filteredFiles = files.filter((f) =>
    f.name.toLowerCase().includes(filterQuery.toLowerCase())
  );

  const selectedCount = selectedIds.size;
  const totalSelectedSize = files
    .filter((f) => selectedIds.has(f.id))
    .reduce((acc, f) => acc + (f.size || 0), 0);

  const getFileIcon = (file: TeraFile) => {
    switch (file.type) {
      case 'video':
        return <FileVideo className="h-5 w-5 text-cyan-400" />;
      case 'audio':
        return <FileAudio className="h-5 w-5 text-emerald-400" />;
      case 'archive':
        return <FileArchive className="h-5 w-5 text-amber-400" />;
      case 'document':
        return <FileText className="h-5 w-5 text-blue-400" />;
      case 'application':
        return <FileCode className="h-5 w-5 text-violet-400" />;
      default:
        return <File className="h-5 w-5 text-slate-400" />;
    }
  };

  return (
    <div className="w-full space-y-4">
      {/* Batch toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-slate-300">
            <input
              type="checkbox"
              checked={selectedCount === files.length && files.length > 0}
              onChange={selectAll}
              className="h-4 w-4 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950"
            />
            <span>Select All</span>
          </label>

          <span className="text-slate-600">·</span>

          <div className="text-xs text-slate-400 font-mono tabular-nums">
            <span>{files.length} file{files.length === 1 ? '' : 's'}</span>
            <span className="mx-1.5 text-slate-600">·</span>
            <span>Total: {formatBytes(totalSelectedSize)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {files.length > 3 && (
            <input
              type="text"
              value={filterQuery}
              onChange={(e) => setFilterQuery(e.target.value)}
              placeholder="Filter files..."
              className="rounded-lg border border-slate-800 bg-slate-900/80 px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
            />
          )}

          <button
            onClick={() => onOpenExport(files.filter((f) => selectedIds.has(f.id)))}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/90 px-3 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition-colors disabled:opacity-40 cursor-pointer"
            title="Generate Aria2, cURL, Wget commands"
          >
            <Terminal className="h-3.5 w-3.5 text-cyan-400" />
            <span>Multi-Thread Scripts</span>
          </button>

          <button
            onClick={handleDownloadSelected}
            disabled={selectedCount === 0}
            className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-40 cursor-pointer"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Download Selected ({selectedCount})</span>
          </button>

          <button
            onClick={onClear}
            className="rounded-lg border border-slate-800 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            title="Clear list"
          >
            Clear
          </button>
        </div>
      </div>

      {/* List of files */}
      <div className="space-y-3">
        {filteredFiles.map((file) => {
          const isSelected = selectedIds.has(file.id);
          const isVideo = file.type === 'video';
          const isAudio = file.type === 'audio';

          return (
            <div
              key={file.id}
              className={`group flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border p-4 transition-all ${
                isSelected
                  ? 'border-slate-700/80 bg-slate-900/90 shadow-sm'
                  : 'border-slate-800/60 bg-slate-950/40 opacity-75'
              }`}
            >
              {/* Left zone: Checkbox, Thumbnail, File Information */}
              <div className="flex items-center gap-3.5 min-w-0 flex-1">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelect(file.id)}
                  className="h-4 w-4 shrink-0 rounded border-slate-700 bg-slate-900 text-cyan-500 focus:ring-cyan-500 focus:ring-offset-slate-950 cursor-pointer"
                />

                {/* Media thumbnail with styled fallback container */}
                <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-slate-800 bg-slate-800/50">
                  {file.thumb ? (
                    <img
                      src={file.thumb}
                      alt={file.name}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                      onError={(e) => {
                        // Fallback on error
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : null}
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none -z-0">
                    {getFileIcon(file)}
                  </div>
                </div>

                {/* File details */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className="truncate text-sm font-medium text-slate-100 group-hover:text-cyan-300 transition-colors"
                      title={file.name}
                    >
                      {file.name}
                    </h4>
                  </div>

                  {/* Clean unboxed metadata with typographic separators */}
                  <div className="mt-1 flex items-center gap-2 text-xs text-slate-400 font-mono">
                    <span className="tabular-nums font-semibold text-slate-300">
                      {file.formattedSize}
                    </span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className="capitalize">{file.type}</span>
                    <span aria-hidden="true" className="text-slate-600">·</span>
                    <span className={file.directDlink ? "text-emerald-400" : "text-cyan-400"}>
                      {file.directDlink ? 'Direct CDN Ready' : 'Web Download Ready'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Right zone: Action buttons */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                {/* Watch / Stream Video Preview */}
                {(isVideo || isAudio) && file.streamUrl && (
                  <button
                    onClick={() => onOpenPlayer(file)}
                    className="flex items-center gap-1.5 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-300 hover:bg-cyan-500/20 hover:border-cyan-500/50 transition-colors cursor-pointer"
                    title="Stream video or audio in browser player"
                  >
                    <Play className="h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
                    <span>Watch Preview</span>
                  </button>
                )}

                {/* Direct Download Button */}
                <button
                  onClick={() => handleDownload(file)}
                  className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-3.5 py-1.5 text-xs font-semibold text-slate-950 hover:bg-cyan-400 shadow-sm shadow-cyan-500/20 transition-colors cursor-pointer"
                  title={file.directDlink ? "Direct accelerated download" : "Open Terabox Web Download"}
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>{file.directDlink ? 'Direct Download' : 'Download on Web'}</span>
                </button>

                {/* Copy Direct Link */}
                <button
                  onClick={() => handleCopyLink(file)}
                  className="flex items-center gap-1 rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-white transition-colors cursor-pointer"
                  title="Copy high-speed direct download URL"
                >
                  {copiedId === file.id ? (
                    <Check className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>

                {/* Export Command */}
                <button
                  onClick={() => onOpenExport([file])}
                  className="rounded-lg border border-slate-800 bg-slate-900/80 p-1.5 text-slate-300 hover:bg-slate-800 hover:text-cyan-400 transition-colors cursor-pointer"
                  title="Generate Aria2 / IDM / cURL download script"
                >
                  <Terminal className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
