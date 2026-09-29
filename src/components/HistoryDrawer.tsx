import React, { useState } from 'react';
import {
  X,
  History,
  Trash2,
  Download,
  Copy,
  Check,
  Search,
  FileVideo,
  FileAudio,
  FileArchive,
  FileText,
  File,
} from 'lucide-react';
import { HistoryItem } from '../types/terabox';
import { formatDate, clearHistory, removeHistoryItem } from '../utils/formatter';

interface HistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: HistoryItem[];
  setHistory: React.Dispatch<React.SetStateAction<HistoryItem[]>>;
  onSelectDownload: (item: HistoryItem) => void;
}

export const HistoryDrawer: React.FC<HistoryDrawerProps> = ({
  isOpen,
  onClose,
  history,
  setHistory,
  onSelectDownload,
}) => {
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleClearAll = () => {
    if (window.confirm('Are you sure you want to clear your download history?')) {
      clearHistory();
      setHistory([]);
    }
  };

  const handleRemove = (id: string) => {
    const updated = removeHistoryItem(id);
    setHistory(updated);
  };

  const handleCopyLink = async (item: HistoryItem) => {
    const link = item.directDlink || item.downloadUrl;
    const fullUrl = link.startsWith('/') ? `${window.location.origin}${link}` : link;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      //
    }
  };

  const filteredHistory = history.filter((item) => {
    const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'all' || item.type === filterType;
    return matchesSearch && matchesType;
  });

  const getIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <FileVideo className="h-4 w-4 text-cyan-400" />;
      case 'audio':
        return <FileAudio className="h-4 w-4 text-emerald-400" />;
      case 'archive':
        return <FileArchive className="h-4 w-4 text-amber-400" />;
      case 'document':
        return <FileText className="h-4 w-4 text-blue-400" />;
      default:
        return <File className="h-4 w-4 text-slate-400" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm">
      <div className="absolute inset-y-0 right-0 flex max-w-full pl-10">
        <div className="w-screen max-w-md border-l border-slate-800 bg-slate-950 p-6 flex flex-col shadow-2xl">
          {/* Top Bar */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <div className="flex items-center gap-2">
              <History className="h-5 w-5 text-cyan-400" />
              <h2 className="text-base font-semibold text-slate-100">Download History</h2>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                ({history.length})
              </span>
            </div>

            <div className="flex items-center gap-2">
              {history.length > 0 && (
                <button
                  onClick={handleClearAll}
                  className="rounded-lg p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                  title="Clear all history"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search & Filter Bar */}
          {history.length > 0 && (
            <div className="mt-4 space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search previously downloaded files..."
                  className="w-full rounded-lg border border-slate-800 bg-slate-900/90 pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                />
              </div>

              {/* Type selector */}
              <div className="flex items-center gap-1 overflow-x-auto pb-1 text-xs">
                {['all', 'video', 'archive', 'audio', 'document'].map((t) => (
                  <button
                    key={t}
                    onClick={() => setFilterType(t)}
                    className={`rounded-md px-2.5 py-1 capitalize transition-colors ${
                      filterType === t
                        ? 'bg-slate-800 text-cyan-400 font-semibold border border-slate-700'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* History List */}
          <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
            {filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-center text-slate-500">
                <History className="h-10 w-10 stroke-1 text-slate-700 mb-2" />
                <p className="text-sm font-medium text-slate-400">No downloads recorded yet</p>
                <p className="text-xs text-slate-600 mt-1 max-w-xs">
                  Files you extract and download will appear here with instant resume and re-download links.
                </p>
              </div>
            ) : (
              filteredHistory.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-800/80 bg-slate-900/60 p-3 hover:border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0 flex-1">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-800/70 border border-slate-700/50">
                      {getIcon(item.type)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium text-slate-200" title={item.name}>
                        {item.name}
                      </p>
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 font-mono mt-0.5">
                        <span className="tabular-nums text-slate-400">{item.formattedSize}</span>
                        <span>·</span>
                        <span>{formatDate(item.downloadedAt)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleCopyLink(item)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                      title="Copy link"
                    >
                      {copiedId === item.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <button
                      onClick={() => onSelectDownload(item)}
                      className="rounded p-1.5 text-slate-400 hover:bg-slate-800 hover:text-cyan-400 transition-colors"
                      title="Download again"
                    >
                      <Download className="h-3.5 w-3.5" />
                    </button>

                    <button
                      onClick={() => handleRemove(item.id)}
                      className="rounded p-1.5 text-slate-600 hover:text-red-400 transition-colors"
                      title="Remove from history"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
