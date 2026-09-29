import React from 'react';
import { History, Settings, Zap } from 'lucide-react';

interface NavbarProps {
  activeTab: 'downloader' | 'batch' | 'telegram' | 'guide';
  setActiveTab: (tab: 'downloader' | 'batch' | 'telegram' | 'guide') => void;
  onOpenHistory: () => void;
  onOpenSettings: () => void;
  historyCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  setActiveTab,
  onOpenHistory,
  onOpenSettings,
  historyCount,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('downloader');
          }}
          className="flex items-center gap-2 text-xl font-bold tracking-tight text-white transition-opacity hover:opacity-90"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
            <Zap className="h-4 w-4" />
          </span>
          <span className="bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            TeraFetch
          </span>
        </a>

        {/* Zone 2: Clean text navigation links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium">
          <button
            onClick={() => setActiveTab('downloader')}
            className={`transition-colors py-1 ${
              activeTab === 'downloader'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Direct Downloader
          </button>
          <button
            onClick={() => setActiveTab('batch')}
            className={`transition-colors py-1 ${
              activeTab === 'batch'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Batch Links
          </button>
          <button
            onClick={() => setActiveTab('telegram')}
            className={`transition-colors py-1 flex items-center gap-1.5 ${
              activeTab === 'telegram'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Telegram Bot</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`transition-colors py-1 ${
              activeTab === 'guide'
                ? 'text-cyan-400 border-b-2 border-cyan-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Guide & Mirrors
          </button>
        </nav>

        {/* Zone 3: 1-2 primary actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={onOpenHistory}
            className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/80 px-3.5 py-1.5 text-xs font-medium text-slate-200 hover:border-slate-700 hover:bg-slate-800 transition-colors"
            title="Download History"
          >
            <History className="h-3.5 w-3.5 text-slate-400" />
            <span className="hidden sm:inline">History</span>
            {historyCount > 0 && (
              <span className="font-mono text-xs tabular-nums text-cyan-400">
                ({historyCount})
              </span>
            )}
          </button>

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900/80 p-2 text-slate-300 hover:border-slate-700 hover:bg-slate-800 transition-colors"
            title="Configuration & Account Cookie"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
