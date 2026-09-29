import React, { useState } from 'react';
import { X, Key, ShieldCheck, HelpCircle, Check, RotateCcw } from 'lucide-react';
import { UserSettings } from '../types/terabox';
import { DEFAULT_SETTINGS, saveSettings } from '../utils/formatter';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: UserSettings;
  onUpdateSettings: (settings: UserSettings) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
}) => {
  const [cookie, setCookie] = useState(settings.ndusCookie || '');
  const [useProxy, setUseProxy] = useState(settings.useProxyDownload);
  const [threads, setThreads] = useState(settings.preferredThreads || 16);
  const [showGuide, setShowGuide] = useState(false);
  const [saved, setSaved] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    const updated: UserSettings = {
      ...settings,
      ndusCookie: cookie.trim(),
      useProxyDownload: useProxy,
      preferredThreads: threads,
    };
    saveSettings(updated);
    onUpdateSettings(updated);

    // Sync cookie to server for both Web proxy and Telegram bot
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ndusCookie: cookie.trim() }),
      });
    } catch {
      //
    }

    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  const handleReset = async () => {
    setCookie('');
    setUseProxy(true);
    setThreads(16);
    saveSettings(DEFAULT_SETTINGS);
    onUpdateSettings(DEFAULT_SETTINGS);
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ndusCookie: '' }),
      });
    } catch {
      //
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="relative flex flex-col w-full max-w-lg rounded-2xl border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-6 py-4 bg-slate-900/80">
          <div className="flex items-center gap-2.5">
            <Key className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Configuration & Account Cookie
              </h3>
              <p className="text-xs text-slate-400">
                Optional credentials for higher bandwidth and private links
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

        {/* Form Body */}
        <div className="p-6 space-y-5">
          {/* Terabox ndus Cookie */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-200">
                Terabox <code className="text-cyan-400 font-mono">ndus</code> Cookie (Optional)
              </label>
              <button
                type="button"
                onClick={() => setShowGuide(!showGuide)}
                className="flex items-center gap-1 text-xs text-cyan-400 hover:underline cursor-pointer"
              >
                <HelpCircle className="h-3.5 w-3.5" />
                <span>How to get it?</span>
              </button>
            </div>

            <textarea
              rows={3}
              value={cookie}
              onChange={(e) => setCookie(e.target.value)}
              placeholder="Paste your 'ndus' cookie value (e.g. Y3Z...)"
              className="w-full rounded-xl border border-slate-700 bg-slate-900/90 p-3 text-xs text-slate-200 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
            />

            {showGuide && (
              <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3 text-xs text-slate-300 space-y-1.5 leading-relaxed">
                <p className="font-semibold text-cyan-300">How to extract your Terabox cookie:</p>
                <ol className="list-decimal list-inside space-y-1 text-slate-400">
                  <li>Log in to <strong className="text-slate-200">terabox.com</strong> in your browser.</li>
                  <li>Press <kbd className="px-1 rounded bg-slate-800 text-slate-300">F12</kbd> to open Developer Tools.</li>
                  <li>Go to the <strong className="text-slate-200">Application</strong> (or Storage) tab &gt; <strong className="text-slate-200">Cookies</strong> &gt; <strong className="text-slate-200">https://www.terabox.com</strong>.</li>
                  <li>Find the cookie named <strong className="text-cyan-400 font-mono">ndus</strong> and copy its value.</li>
                </ol>
                <p className="text-[11px] text-slate-500 pt-1">
                  Note: TeraFetch also works without an account for public files!
                </p>
              </div>
            )}
          </div>

          {/* Download Method */}
          <div className="space-y-3 pt-2 border-t border-slate-800/80">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-200">Accelerated Streaming Proxy</p>
                <p className="text-[11px] text-slate-500">
                  Routes through TeraFetch proxy to avoid CORS and 403 Forbidden errors
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={useProxy}
                  onChange={(e) => setUseProxy(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-10 h-5.5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4.5 after:w-4.5 after:transition-all peer-checked:bg-cyan-500"></div>
              </label>
            </div>

            {/* Default threads */}
            <div className="flex items-center justify-between pt-2">
              <div>
                <p className="text-xs font-semibold text-slate-200">Aria2 Multi-Thread Concurrency</p>
                <p className="text-[11px] text-slate-500">Default parallel chunk connections per file</p>
              </div>
              <select
                value={threads}
                onChange={(e) => setThreads(parseInt(e.target.value, 10))}
                className="rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 font-mono"
              >
                <option value={8}>8 Connections</option>
                <option value={16}>16 Connections (Recommended)</option>
                <option value={32}>32 Connections</option>
              </select>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between pt-4 border-t border-slate-800">
            <button
              type="button"
              onClick={handleReset}
              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg border border-slate-800 px-3.5 py-2 text-xs text-slate-400 hover:bg-slate-900 hover:text-slate-200 transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="flex items-center gap-1.5 rounded-lg bg-cyan-500 px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-cyan-400 transition-colors cursor-pointer"
              >
                {saved ? (
                  <>
                    <Check className="h-4 w-4" />
                    <span>Saved!</span>
                  </>
                ) : (
                  <span>Save Configuration</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
