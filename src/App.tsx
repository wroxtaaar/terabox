import React, { useState, useEffect } from 'react';
import {
  Zap,
  Download,
  Terminal,
  ShieldCheck,
  AlertCircle,
  Sparkles,
  ExternalLink,
  Layers,
  History,
  CheckCircle2,
} from 'lucide-react';
import heroBannerImg from './assets/images/terafetch_network_hero_1790502190571.jpg';
import { Navbar } from './components/Navbar';
import { LinkInputForm } from './components/LinkInputForm';
import { FileList } from './components/FileList';
import { VideoPlayerModal } from './components/VideoPlayerModal';
import { ExportModal } from './components/ExportModal';
import { HistoryDrawer } from './components/HistoryDrawer';
import { SettingsModal } from './components/SettingsModal';
import { HowToUseGuide } from './components/HowToUseGuide';
import { TelegramBotPanel } from './components/TelegramBotPanel';
import { TeraFile, HistoryItem, UserSettings, ResolveResponse } from './types/terabox';
import { getHistory, getSettings, saveToHistory } from './utils/formatter';

export default function App() {
  const [activeNavTab, setActiveNavTab] = useState<'downloader' | 'batch' | 'telegram' | 'guide'>('downloader');
  const [mode, setMode] = useState<'single' | 'batch'>('single');
  const [isLoading, setIsLoading] = useState(false);
  const [files, setFiles] = useState<TeraFile[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals & Drawers state
  const [activeVideoFile, setActiveVideoFile] = useState<TeraFile | null>(null);
  const [exportFiles, setExportFiles] = useState<TeraFile[] | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Local storage state
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [settings, setSettings] = useState<UserSettings>(getSettings());

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const handleResolve = async (input: string, password?: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const payload: { url?: string; urls?: string[]; password?: string; cookie?: string } = {
        password,
        cookie: settings.ndusCookie || undefined,
      };

      if (mode === 'single') {
        payload.url = input;
      } else {
        const lines = input
          .split(/[\r\n]+/)
          .map((l) => l.trim())
          .filter(Boolean);
        payload.urls = lines;
      }

      const res = await fetch('/api/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data: ResolveResponse = await res.json();

      if (!res.ok) {
        throw new Error((data as any).error || 'Failed to resolve link');
      }

      if (data.files && data.files.length > 0) {
        setFiles(data.files);
        // Automatically save initial items to history as discovered
        data.files.forEach((f) => saveToHistory(f, 'started'));
        setHistory(getHistory());
      } else {
        const errText =
          data.errors && data.errors.length > 0
            ? data.errors[0].error
            : 'No downloadable files could be found for this link. Verify that the link is valid and public.';
        setErrorMessage(errText);
      }
    } catch (err: any) {
      setErrorMessage(
        err.message || 'An error occurred while connecting to the resolver service. Please try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleRedownloadFromHistory = (item: HistoryItem) => {
    const file: TeraFile = {
      id: item.id,
      name: item.name,
      size: item.size,
      formattedSize: item.formattedSize,
      category: item.type === 'video' ? 1 : 0,
      type: item.type,
      thumb: item.thumb,
      downloadUrl: item.downloadUrl,
      directDlink: item.directDlink,
      sourceUrl: item.sourceUrl,
    };
    saveToHistory(file, 'completed');
    const targetUrl = file.downloadUrl || file.directDlink;
    if (targetUrl) {
      const link = document.createElement('a');
      link.href = targetUrl;
      link.setAttribute('download', file.name);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500/20 selection:text-cyan-300">
      {/* Top Bar Contract (3 zones) */}
      <Navbar
        activeTab={activeNavTab}
        setActiveTab={(tab) => {
          setActiveNavTab(tab);
          if (tab === 'batch') setMode('batch');
          if (tab === 'downloader') setMode('single');
        }}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        historyCount={history.length}
      />

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-12">
        {/* Hero Section */}
        {activeNavTab !== 'guide' && activeNavTab !== 'telegram' && (
          <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-b from-slate-900/90 to-slate-950 p-6 sm:p-10 shadow-2xl">
            {/* Visual backdrop */}
            <div className="absolute inset-0 -z-10 opacity-25 overflow-hidden">
              <img
                src={heroBannerImg}
                alt="High speed cloud data stream"
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover object-center filter blur-xs"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/70 to-transparent" />
            </div>

            <div className="max-w-3xl space-y-4">
              {/* Unboxed category metadata with clean separator */}
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <Zap className="h-3.5 w-3.5" /> High-Speed Bypass
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Zero Limits</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>1080p Video Preview</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Aria2 & IDM Export</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span>Telegram Bot Engine</span>
              </div>

              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight text-balance">
                Download Terabox Links Directly at Maximum Speed
              </h1>

              <p className="text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
                Bypass sluggish download limits, login walls, and popups. Paste any Terabox or mirror link to extract direct high-speed download links, stream HD videos, or generate 16-thread acceleration scripts.
              </p>
            </div>

            {/* Input Card Container */}
            <div className="mt-8 rounded-2xl border border-slate-700/60 bg-slate-950/90 p-5 sm:p-6 shadow-xl backdrop-blur-md">
              <LinkInputForm
                onResolve={handleResolve}
                isLoading={isLoading}
                mode={mode}
                setMode={(m) => {
                  setMode(m);
                  setActiveNavTab(m === 'batch' ? 'batch' : 'downloader');
                }}
              />
            </div>
          </section>
        )}

        {/* Error notification banner */}
        {errorMessage && activeNavTab !== 'telegram' && activeNavTab !== 'guide' && (
          <div className="rounded-xl border border-amber-500/40 bg-amber-500/10 p-4 text-xs sm:text-sm text-amber-300 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 shrink-0 text-amber-400 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold text-amber-200">Unable to resolve Terabox link</p>
              <p className="text-amber-300/90 leading-relaxed">{errorMessage}</p>
              <div className="pt-2 flex items-center gap-3">
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="font-medium underline hover:text-white transition-colors"
                >
                  Configure Terabox Account Cookie in Settings
                </button>
                <span className="text-amber-500/50">·</span>
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-amber-400 hover:text-white"
                >
                  Dismiss
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Resolved File List */}
        {files.length > 0 && activeNavTab !== 'guide' && activeNavTab !== 'telegram' && (
          <section className="space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-cyan-400" />
                <h2 className="text-lg font-bold text-slate-100">Ready for Download</h2>
              </div>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {files.length} Item{files.length === 1 ? '' : 's'}
              </span>
            </div>

            <FileList
              files={files}
              onOpenPlayer={(file) => setActiveVideoFile(file)}
              onOpenExport={(selected) => setExportFiles(selected)}
              onClear={() => setFiles([])}
            />
          </section>
        )}

        {/* Telegram Bot Panel Tab */}
        {activeNavTab === 'telegram' && <TelegramBotPanel />}

        {/* Guide / Documentation Tab */}
        {activeNavTab === 'guide' && <HowToUseGuide />}

        {/* Key Features Highlights Section (Claim-to-Proof Adjacency) */}
        {activeNavTab !== 'guide' && activeNavTab !== 'telegram' && (
          <section className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-800/80">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Zap className="h-4 w-4" />
                <span>Instant Direct Downloads</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Bypasses official web countdowns and throttled speeds. Direct CDN links give you your ISP&apos;s full downstream speed.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <Terminal className="h-4 w-4" />
                <span>Multi-Thread Acceleration</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Export 16-connection Aria2, IDM, and cURL commands. Split large multi-gigabyte files into simultaneous parallel chunks.
              </p>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
                <ShieldCheck className="h-4 w-4" />
                <span>Private & Safe</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Downloads stream cleanly without tracking cookies, malware, or popunder advertising scripts.
              </p>
            </div>
          </section>
        )}
      </main>

      {/* Video Player Modal */}
      {activeVideoFile && (
        <VideoPlayerModal file={activeVideoFile} onClose={() => setActiveVideoFile(null)} />
      )}

      {/* Multi-thread Export Script Modal */}
      {exportFiles && (
        <ExportModal files={exportFiles} onClose={() => setExportFiles(null)} />
      )}

      {/* Download History Drawer */}
      <HistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        history={history}
        setHistory={setHistory}
        onSelectDownload={handleRedownloadFromHistory}
      />

      {/* Account / Cookie Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={(newSettings) => setSettings(newSettings)}
      />

      {/* Footer */}
      <footer className="w-full border-t border-slate-900 bg-slate-950 py-8 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <span>TeraFetch Link Downloader</span>
            <span aria-hidden="true" className="text-slate-700">·</span>
            <span className="font-mono text-[11px] text-slate-500">High-Speed Gateway</span>
          </div>

          <div className="flex items-center gap-4 text-slate-500">
            <button
              onClick={() => setActiveNavTab('telegram')}
              className="hover:text-slate-300 transition-colors"
            >
              Telegram Bot
            </button>
            <button
              onClick={() => setActiveNavTab('guide')}
              className="hover:text-slate-300 transition-colors"
            >
              Supported Mirrors
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              Cookie Configuration
            </button>
            <button
              onClick={() => setIsHistoryOpen(true)}
              className="hover:text-slate-300 transition-colors"
            >
              History
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
