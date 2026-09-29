import React, { useState } from 'react';
import { Clipboard, ArrowRight, Lock, KeyRound, Sparkles, AlertCircle, RefreshCw } from 'lucide-react';
import { isValidTeraboxUrl, SUPPORTED_DOMAINS } from '../utils/formatter';

interface LinkInputFormProps {
  onResolve: (input: string, password?: string) => Promise<void>;
  isLoading: boolean;
  mode: 'single' | 'batch';
  setMode: (mode: 'single' | 'batch') => void;
}

export const LinkInputForm: React.FC<LinkInputFormProps> = ({
  onResolve,
  isLoading,
  mode,
  setMode,
}) => {
  const [url, setUrl] = useState('');
  const [batchText, setBatchText] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        if (mode === 'single') {
          setUrl(text.trim());
        } else {
          setBatchText((prev) => (prev ? `${prev}\n${text.trim()}` : text.trim()));
        }
        setErrorMsg('');
      }
    } catch {
      // Clipboard access denied
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = mode === 'single' ? url.trim() : batchText.trim();
    if (!target) {
      setErrorMsg('Please enter or paste a Terabox share link');
      return;
    }

    if (mode === 'single' && !isValidTeraboxUrl(target)) {
      setErrorMsg('Please enter a valid Terabox or mirror link (e.g., terabox.com/s/1...)');
      return;
    }

    setErrorMsg('');
    onResolve(target, password.trim() || undefined);
  };

  const handleLoadSample = (sampleUrl: string) => {
    if (mode === 'single') {
      setUrl(sampleUrl);
    } else {
      setBatchText((prev) => (prev ? `${prev}\n${sampleUrl}` : sampleUrl));
    }
    setErrorMsg('');
  };

  // Count links in batch mode
  const batchLinksCount = batchText
    .split(/[\r\n]+/)
    .map((l) => l.trim())
    .filter(Boolean).length;

  return (
    <div className="w-full">
      {/* Mode switcher tabs */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-5">
        <div className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => {
              setMode('single');
              setErrorMsg('');
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'single'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Single Link
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('batch');
              setErrorMsg('');
            }}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-all ${
              mode === 'batch'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Batch Downloader
          </button>
        </div>

        {/* Quick sample link loader */}
        <div className="flex items-center gap-2 text-xs text-slate-400">
          <button
            type="button"
            onClick={() => handleLoadSample('https://terabox.com/s/1sample-terafetch-archive')}
            className="flex items-center gap-1 hover:text-cyan-400 transition-colors"
          >
            <Sparkles className="h-3 w-3 text-cyan-400" />
            <span>Load Demo Link</span>
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {mode === 'single' ? (
          <div className="relative">
            <div className="flex flex-col sm:flex-row items-stretch gap-2">
              <div className="relative flex-1">
                <input
                  type="text"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    if (errorMsg) setErrorMsg('');
                  }}
                  placeholder="Paste Terabox link here (e.g. https://teraboxapp.com/s/1...)"
                  className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 px-4 py-3.5 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={handlePaste}
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
                  title="Paste from clipboard"
                >
                  <Clipboard className="h-4 w-4" />
                </button>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3.5 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 focus:ring-offset-slate-950 transition-all disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Resolving...</span>
                  </>
                ) : (
                  <>
                    <span>Extract Download</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="relative">
              <textarea
                value={batchText}
                onChange={(e) => {
                  setBatchText(e.target.value);
                  if (errorMsg) setErrorMsg('');
                }}
                rows={5}
                placeholder="Paste multiple Terabox links here, one link per line...&#10;https://teraboxapp.com/s/1xxxx&#10;https://1024tera.com/s/1yyyy"
                className="w-full rounded-xl border border-slate-700/80 bg-slate-900/90 p-4 text-sm text-slate-100 placeholder-slate-500 shadow-inner focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-mono resize-y"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={handlePaste}
                className="absolute right-3 bottom-3 rounded-lg border border-slate-800 bg-slate-800/80 px-2.5 py-1 text-xs text-slate-300 hover:bg-slate-700 transition-colors flex items-center gap-1.5"
              >
                <Clipboard className="h-3 w-3" />
                <span>Paste Links</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-xs text-slate-400 font-mono">
                {batchLinksCount > 0 ? (
                  <span>
                    Detected <strong className="text-cyan-400">{batchLinksCount}</strong> link
                    {batchLinksCount === 1 ? '' : 's'}
                  </span>
                ) : (
                  <span>Add links one per line</span>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading || batchLinksCount === 0}
                className="w-full sm:w-auto flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-sm font-semibold text-slate-950 shadow-md shadow-cyan-500/20 hover:bg-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin text-slate-950" />
                    <span>Processing Batch...</span>
                  </>
                ) : (
                  <>
                    <span>Extract All ({batchLinksCount})</span>
                    <ArrowRight className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Password field toggle for protected links */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs">
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="flex items-center gap-1.5 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-400" />
            <span>{showPassword ? 'Hide Share Password' : 'Link has a password? (Optional)'}</span>
          </button>

          {/* Supported domain indicators in zero-pill unboxed text */}
          <div className="hidden lg:flex items-center gap-2 text-slate-500 text-xs">
            <span>terabox.com</span>
            <span aria-hidden="true">·</span>
            <span>1024tera</span>
            <span aria-hidden="true">·</span>
            <span>teraboxapp</span>
            <span aria-hidden="true">·</span>
            <span>nephobox</span>
            <span aria-hidden="true">·</span>
            <span>4funbox</span>
          </div>
        </div>

        {showPassword && (
          <div className="flex items-center gap-2 max-w-sm">
            <div className="relative flex-1">
              <input
                type="text"
                maxLength={4}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="4-character password (e.g. 1a2b)"
                className="w-full rounded-lg border border-slate-700 bg-slate-900/80 px-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none font-mono"
              />
            </div>
            <span className="text-xs text-slate-500">4 chars</span>
          </div>
        )}

        {errorMsg && (
          <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-2.5 text-xs text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}
      </form>
    </div>
  );
};
