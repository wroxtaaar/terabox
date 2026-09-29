import React from 'react';
import { Download, Zap, Shield, Play, Terminal, HelpCircle, CheckCircle2 } from 'lucide-react';
import { SUPPORTED_DOMAINS } from '../utils/formatter';

export const HowToUseGuide: React.FC = () => {
  return (
    <div className="w-full space-y-12">
      {/* 3 Step workflow */}
      <section className="space-y-6">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="text-xl font-bold text-slate-100 tracking-tight">
            How to Download Terabox Links in 3 Simple Steps
          </h2>
          <p className="text-xs text-slate-400">
            No installation, no intrusive ads, and no mandatory registration required.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-sm font-bold">
              01
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Copy Share Link</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Copy any Terabox or affiliated mirror link (e.g. 1024tera, teraboxapp, nephobox, 4funbox) from your clipboard.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-sm font-bold">
              02
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Extract File Details</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Paste the link into TeraFetch and click <strong className="text-slate-200">Extract Download</strong>. Our multi-engine resolver fetches official direct CDN endpoints.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono text-sm font-bold">
              03
            </div>
            <h3 className="text-sm font-semibold text-slate-100">Download or Stream</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Click <strong className="text-slate-200">Download</strong> for immediate high-speed file saving, stream videos in HD with the built-in player, or export to IDM/Aria2.
            </p>
          </div>
        </div>
      </section>

      {/* Supported Mirrors */}
      <section className="rounded-2xl border border-slate-800/80 bg-slate-900/50 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-cyan-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Supported Terabox Mirrors & Domains
          </h3>
        </div>
        <p className="text-xs text-slate-400 leading-relaxed">
          TeraFetch automatically identifies and normalizes links from any of the official and secondary mirror networks:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2.5">
          {SUPPORTED_DOMAINS.map((domain) => (
            <div
              key={domain}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs font-mono text-slate-300"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
              <span className="truncate">{domain}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Frequently Asked Questions */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
          <HelpCircle className="h-5 w-5 text-cyan-400" />
          <h3 className="text-base font-semibold text-slate-100">Frequently Asked Questions</h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Do I need a Terabox account to download?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              No. Public shared links can be extracted and downloaded directly without logging in or installing the Terabox client.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Why do some links show 403 Forbidden when opened directly?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Terabox CDN servers require specific Referer and User-Agent headers. TeraFetch's streaming proxy handles this automatically so your download never fails.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-200">
              How do I get maximum download speeds?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the <strong className="text-slate-200">Multi-Thread Scripts</strong> option to export to IDM or Aria2 with 16 to 32 concurrent connections.
            </p>
          </div>

          <div className="rounded-xl border border-slate-800/80 bg-slate-900/40 p-4 space-y-1.5">
            <h4 className="text-xs font-semibold text-slate-200">
              Can I preview or watch videos before downloading?
            </h4>
            <p className="text-xs text-slate-400 leading-relaxed">
              Yes! Click <strong className="text-slate-200">Watch Preview</strong> on any video file to play it directly in the in-app HTML5 video player with speed and volume controls.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
};
