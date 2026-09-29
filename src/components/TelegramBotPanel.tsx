import React, { useState, useEffect } from 'react';
import {
  Send,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Bot,
  Power,
  PowerOff,
  Terminal,
  FileCode,
  HelpCircle,
  MessageSquare,
  ShieldAlert,
} from 'lucide-react';
import { TelegramBotInfo, TelegramLogEntry } from '../types/terabox';
import { formatDate } from '../utils/formatter';

export const TelegramBotPanel: React.FC = () => {
  const [token, setToken] = useState(() => localStorage.getItem('terafetch_tg_token') || '');
  const [ndusCookie, setNdusCookie] = useState(() => localStorage.getItem('terafetch_ndus') || '');
  const [hasServerCookie, setHasServerCookie] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [botInfo, setBotInfo] = useState<TelegramBotInfo | null>(null);
  const [logs, setLogs] = useState<TelegramLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [copiedScript, setCopiedScript] = useState<string | null>(null);
  const [activeScriptTab, setActiveScriptTab] = useState<'python' | 'node'>('python');

  // Fetch status on mount and poll while running
  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/telegram/status');
      if (res.ok) {
        const data = await res.json();
        setIsRunning(data.isRunning);
        setBotInfo(data.botInfo);
        setLogs(data.logs || []);
      }
      const sRes = await fetch('/api/settings');
      if (sRes.ok) {
        const sData = await sRes.json();
        setHasServerCookie(sData.hasCookie);
      }
    } catch {
      //
    }
  };

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartBot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setErrorMsg('Please enter your Telegram Bot Token from @BotFather');
      return;
    }

    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      // Sync cookie to server first if provided
      if (ndusCookie.trim()) {
        localStorage.setItem('terafetch_ndus', ndusCookie.trim());
        await fetch('/api/settings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ndusCookie: ndusCookie.trim() }),
        });
      }

      const res = await fetch('/api/telegram/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start bot');
      }

      localStorage.setItem('terafetch_tg_token', token.trim());
      setIsRunning(true);
      setBotInfo(data.botInfo);
      setSuccessMsg(data.message || 'Bot connected successfully!');
      fetchStatus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Could not connect to Telegram');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateCookieOnly = async () => {
    if (!ndusCookie.trim()) return;
    setIsLoading(true);
    try {
      localStorage.setItem('terafetch_ndus', ndusCookie.trim());
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ndusCookie: ndusCookie.trim() }),
      });
      setSuccessMsg('Terabox cookie updated! The bot can now download and send video files directly.');
      fetchStatus();
    } catch {
      setErrorMsg('Failed to update cookie');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStopBot = async () => {
    setIsLoading(true);
    try {
      await fetch('/api/telegram/stop', { method: 'POST' });
      setIsRunning(false);
      setBotInfo(null);
      setSuccessMsg('Bot stopped successfully.');
      fetchStatus();
    } catch {
      //
    } finally {
      setIsLoading(false);
    }
  };

  const pythonBotCode = `# TeraFetch Telegram Bot (Python 3)
# Requirements: pip install pyTelegramBotAPI requests
import telebot
import requests
import re
import os

BOT_TOKEN = "${token.trim() || 'YOUR_TELEGRAM_BOT_TOKEN'}"
bot = telebot.TeleBot(BOT_TOKEN)

def extract_terabox_surl(text):
    match = re.search(r'(?:surl=|/s/)([a-zA-Z0-9_-]+)', text)
    if match:
        surl = match.group(1)
        return surl if surl.startswith('1') else '1' + surl
    return None

def resolve_terabox(surl):
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0',
        'Referer': 'https://www.terabox.app/'
    }
    url = f"https://www.terabox.app/share/list?app_id=250528&web=1&channel=dubox&clienttype=0&shorturl={surl}&root=1&page=1&num=100"
    res = requests.get(url, headers=headers, timeout=10)
    data = res.json()
    if data.get('errno') == 0 and data.get('list'):
        return data['list']
    return None

@bot.message_handler(commands=['start', 'help'])
def send_welcome(message):
    bot.reply_to(message, "👋 Send me any Terabox link, and I will download and send the file back to you!")

@bot.message_handler(func=lambda msg: True)
def handle_link(message):
    text = message.text
    surl = extract_terabox_surl(text)
    if not surl:
        bot.reply_to(message, "❌ Please send a valid Terabox link (e.g., terabox.com/s/1...)")
        return

    status_msg = bot.reply_to(message, "⏳ Resolving Terabox link and extracting file...")
    files = resolve_terabox(surl)
    
    if not files:
        bot.edit_message_text("⚠️ Could not extract file. The link might be expired or password-protected.", message.chat.id, status_msg.message_id)
        return

    for item in files:
        filename = item.get('server_filename', 'download')
        size_bytes = int(item.get('size', 0))
        size_mb = round(size_bytes / (1024 * 1024), 2)
        dlink = item.get('dlink')
        category = item.get('category')

        caption = f"🎬 {filename}\\n📦 Size: {size_mb} MB"

        # If file is <= 50MB and direct link is available, download and send in chat
        if dlink and size_bytes <= 50 * 1024 * 1024:
            bot.edit_message_text(f"📥 Downloading {filename} to upload to chat...", message.chat.id, status_msg.message_id)
            r = requests.get(dlink, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.terabox.app/'}, stream=True)
            if category == '1':
                bot.send_video(message.chat.id, r.raw, caption=caption)
            else:
                bot.send_document(message.chat.id, r.raw, caption=caption)
        else:
            download_url = dlink or f"https://www.terabox.app/sharing/link?surl={surl}"
            markup = telebot.types.InlineKeyboardMarkup()
            markup.add(telebot.types.InlineKeyboardButton(f"🚀 Direct Download ({size_mb} MB)", url=download_url))
            bot.send_message(message.chat.id, caption, reply_markup=markup)

print("TeraFetch Telegram Bot is polling...")
bot.infinity_polling()`;

  const nodeBotCode = `// TeraFetch Telegram Bot (Node.js)
// Requirements: npm install telegraf axios
import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const bot = new Telegraf(process.env.BOT_TOKEN || '${token.trim() || 'YOUR_TELEGRAM_BOT_TOKEN'}');

function extractSurl(text) {
  const match = text.match(/(?:surl=|\\/s\\/)([a-zA-Z0-9_-]+)/);
  if (!match) return null;
  const s = match[1];
  return s.startsWith('1') ? s : '1' + s;
}

bot.start((ctx) => ctx.reply('👋 Send me any Terabox link, and I will download and send the file directly in this chat!'));

bot.on('text', async (ctx) => {
  const surl = extractSurl(ctx.message.text);
  if (!surl) {
    return ctx.reply('❌ Please send a valid Terabox link (e.g. terabox.com/s/1...)');
  }

  const waitMsg = await ctx.reply('⏳ Resolving Terabox link and extracting file...');

  try {
    const listRes = await axios.get(\`https://www.terabox.app/share/list?app_id=250528&web=1&channel=dubox&clienttype=0&shorturl=\${surl}&root=1&page=1&num=100\`, {
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.terabox.app/' }
    });

    const data = listRes.data;
    if (data.errno !== 0 || !data.list || data.list.length === 0) {
      return ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, '⚠️ Could not extract file. Link might be expired or private.');
    }

    for (const item of data.list) {
      const filename = item.server_filename || 'file';
      const sizeBytes = parseInt(item.size || '0', 10);
      const sizeMb = (sizeBytes / (1024 * 1024)).toFixed(2);
      const caption = \`🎬 \${filename}\\n📦 Size: \${sizeMb} MB\`;
      const dlink = item.dlink;

      // If under 50MB and direct link exists, send media buffer directly into chat
      if (dlink && sizeBytes <= 50 * 1024 * 1024) {
        await ctx.telegram.editMessageText(ctx.chat.id, waitMsg.message_id, undefined, \`📥 Downloading \${filename} to send directly to chat...\`);
        const fileStream = await axios.get(dlink, {
          headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://www.terabox.app/' },
          responseType: 'arraybuffer'
        });

        if (item.category === '1') {
          await ctx.replyWithVideo({ source: Buffer.from(fileStream.data), filename }, { caption });
        } else {
          await ctx.replyWithDocument({ source: Buffer.from(fileStream.data), filename }, { caption });
        }
      } else {
        const downloadUrl = dlink || \`https://www.terabox.app/sharing/link?surl=\${surl}\`;
        await ctx.reply(caption, Markup.inlineKeyboard([
          Markup.button.url(\`🚀 Download File (\${sizeMb} MB)\`, downloadUrl)
        ]));
      }
    }
  } catch (err) {
    ctx.reply('❌ Error fetching file: ' + err.message);
  }
});

bot.launch().then(() => console.log('Bot running!'));
process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));`;

  const copyScript = async (code: string, id: string) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedScript(id);
      setTimeout(() => setCopiedScript(null), 2000);
    } catch {
      //
    }
  };

  return (
    <div className="w-full space-y-8">
      {/* Bot Status Banner & Controller */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6 shadow-xl backdrop-blur-md">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3.5">
            <div
              className={`flex h-12 w-12 items-center justify-center rounded-2xl border ${
                isRunning
                  ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                  : 'border-slate-700 bg-slate-800/80 text-slate-400'
              }`}
            >
              <Bot className="h-6 w-6" />
            </div>

            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-bold text-white">Telegram Downloader Bot</h2>
                <div
                  className={`flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-medium ${
                    isRunning
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                  }`}
                >
                  <span
                    className={`h-2 w-2 rounded-full ${
                      isRunning ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'
                    }`}
                  />
                  <span>{isRunning ? 'Active & Polling' : 'Offline / Standby'}</span>
                </div>
              </div>

              <p className="text-xs text-slate-400 mt-1">
                Users send a Terabox link to your bot, and it automatically downloads and replies with the file!
              </p>
            </div>
          </div>

          {botInfo && isRunning && (
            <div className="flex items-center gap-3">
              <a
                href={`https://t.me/${botInfo.username}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 px-3.5 py-2 text-xs font-semibold text-cyan-400 hover:bg-cyan-500/20 transition-colors"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Open @{botInfo.username} in Telegram</span>
                <ExternalLink className="h-3 w-3 ml-0.5" />
              </a>

              <button
                onClick={handleStopBot}
                disabled={isLoading}
                className="flex items-center gap-1.5 rounded-xl border border-red-500/40 bg-red-500/10 px-3.5 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/20 transition-colors cursor-pointer"
              >
                <PowerOff className="h-3.5 w-3.5" />
                <span>Stop Bot</span>
              </button>
            </div>
          )}
        </div>

        {/* Start / Connect Form */}
        {!isRunning ? (
          <form onSubmit={handleStartBot} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200 flex items-center justify-between">
                <span>Enter Telegram Bot Token</span>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-cyan-400 hover:underline flex items-center gap-1"
                >
                  <span>Get token from @BotFather</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              </label>

              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  placeholder="e.g. 7123456789:ABCdefGhIJKlmNoPQRstUVwxyZ"
                  className="flex-1 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-xs sm:text-sm text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
                  disabled={isLoading}
                />

                <button
                  type="submit"
                  disabled={isLoading || !token.trim()}
                  className="flex items-center justify-center gap-2 rounded-xl bg-cyan-500 px-6 py-3 text-xs sm:text-sm font-semibold text-slate-950 hover:bg-cyan-400 transition-colors disabled:opacity-50 cursor-pointer shadow-md shadow-cyan-500/20"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      <span>Connecting...</span>
                    </>
                  ) : (
                    <>
                      <Power className="h-4 w-4" />
                      <span>Connect & Start Bot</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Terabox Account Cookie (ndus) Input */}
            <div className="space-y-1.5 rounded-xl border border-slate-800 bg-slate-950/80 p-4">
              <label className="text-xs font-semibold text-slate-200 flex flex-wrap items-center justify-between gap-1">
                <span className="flex items-center gap-2">
                  <span>Terabox Account Cookie (<code className="text-cyan-400">ndus</code>)</span>
                  <span className="rounded bg-cyan-500/10 border border-cyan-500/30 px-1.5 py-0.5 text-[10px] text-cyan-300">
                    Required for Bot to Send Video Files
                  </span>
                </span>
                <span className="text-[11px] text-slate-500">
                  {hasServerCookie ? '✅ Cookie configured' : '⚠️ No cookie set'}
                </span>
              </label>

              <input
                type="text"
                value={ndusCookie}
                onChange={(e) => setNdusCookie(e.target.value)}
                placeholder="Paste ndus cookie value (e.g. Yg4ABC...)"
                className="w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 font-mono focus:border-cyan-500 focus:outline-none"
                disabled={isLoading}
              />

              <p className="text-[11px] text-slate-400 leading-relaxed">
                Terabox restricts bots from downloading video files without an account session. By adding your free account&apos;s <code className="text-cyan-400 font-mono">ndus</code> cookie, the bot unlocks direct CDN video streams and sends the actual playable MP4 video directly into Telegram!
              </p>
            </div>

            {errorMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-400">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {successMsg && (
              <div className="flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-400">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                <span>{successMsg}</span>
              </div>
            )}
          </form>
        ) : (
          <div className="mt-5 space-y-4">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-3 w-3 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <div>
                  <p className="text-xs font-medium text-slate-200">
                    Bot is actively listening for links from Telegram users.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Send any link in chat with <strong className="text-cyan-400">@{botInfo?.username}</strong> to test!
                  </p>
                </div>
              </div>

              <button
                onClick={fetchStatus}
                className="flex items-center gap-1.5 rounded-lg border border-slate-800 px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-900 transition-colors"
              >
                <RefreshCw className="h-3 w-3" />
                <span>Refresh Log</span>
              </button>
            </div>

            {/* Quick Cookie Updater when running */}
            <div className="rounded-xl border border-slate-800/80 bg-slate-950/40 p-4 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span>Terabox Account Cookie (<code className="text-cyan-400">ndus</code>)</span>
                  <span className="text-slate-500">·</span>
                  <span className={hasServerCookie ? 'text-emerald-400' : 'text-amber-400'}>
                    {hasServerCookie ? 'Active (Video Delivery Enabled)' : 'Missing (Bot will only send links)'}
                  </span>
                </span>
                <span className="text-[11px] text-slate-500 font-mono">Send /cookie in Telegram or set here</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={ndusCookie}
                  onChange={(e) => setNdusCookie(e.target.value)}
                  placeholder="Paste ndus cookie value to enable direct MP4 video downloads..."
                  className="flex-1 rounded-lg border border-slate-800 bg-slate-900 px-3 py-2 text-xs text-slate-200 font-mono focus:border-cyan-500 focus:outline-none"
                />
                <button
                  onClick={handleUpdateCookieOnly}
                  disabled={isLoading || !ndusCookie.trim()}
                  className="rounded-lg bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 border border-slate-700 px-4 py-2 text-xs font-semibold text-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Save Cookie
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 2-Column: Live Activity Feed + 30-Second Setup Guide */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Live Chat Activity Feed */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 flex flex-col space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-cyan-400" />
              <h3 className="text-sm font-semibold text-slate-100">Live Bot Activity Feed</h3>
            </div>
            <span className="font-mono text-xs text-slate-500 tabular-nums">{logs.length} events</span>
          </div>

          <div className="flex-1 overflow-y-auto max-h-[320px] space-y-2.5 pr-1">
            {logs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-slate-500">
                <Bot className="h-8 w-8 stroke-1 text-slate-700 mb-2" />
                <p className="text-xs text-slate-400">No bot messages received yet</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Send a Terabox link to your bot in Telegram to see live processing here!
                </p>
              </div>
            ) : (
              logs.map((log) => (
                <div
                  key={log.id}
                  className="rounded-lg border border-slate-800/80 bg-slate-950/70 p-3 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span
                        className={`inline-block h-1.5 w-1.5 rounded-full ${
                          log.type === 'incoming'
                            ? 'bg-cyan-400'
                            : log.type === 'sent'
                            ? 'bg-emerald-400'
                            : log.type === 'error'
                            ? 'bg-red-400'
                            : 'bg-slate-400'
                        }`}
                      />
                      <span className="text-slate-300 font-semibold">
                        {log.username ? `@${log.username}` : 'System'}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono">{formatDate(log.timestamp)}</span>
                  </div>

                  <p className="text-slate-300 break-words font-mono text-[11px]">{log.message}</p>

                  {log.fileName && (
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono pt-0.5">
                      <span className="text-cyan-400 truncate max-w-[200px]">{log.fileName}</span>
                      {log.fileSize && <span>· {log.fileSize}</span>}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* 30-Second Setup Guide */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <HelpCircle className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-semibold text-slate-100">
              How to Create Your Telegram Bot (30 Seconds)
            </h3>
          </div>

          <div className="space-y-3.5 text-xs text-slate-300">
            <div className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                1
              </span>
              <div>
                <p className="font-semibold text-slate-100">
                  Open Telegram and search for{' '}
                  <a
                    href="https://t.me/BotFather"
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline font-mono"
                  >
                    @BotFather
                  </a>
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  BotFather is the official Telegram tool for creating and managing bots.
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                2
              </span>
              <div>
                <p className="font-semibold text-slate-100">
                  Send <code className="bg-slate-800 px-1 py-0.5 rounded text-cyan-400">/newbot</code>
                </p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Follow the prompt to name your bot (e.g. <em>My Terabox Downloader</em>) and choose a username ending in <code>bot</code> (e.g. <code>my_terabox_dl_bot</code>).
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                3
              </span>
              <div>
                <p className="font-semibold text-slate-100">Copy the HTTP API Token</p>
                <p className="text-slate-400 text-[11px] mt-0.5 font-mono">
                  It looks like: <code>7123456789:ABCdefGhIJKlmNoPQRstUVwxyZ</code>
                </p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-bold text-[11px]">
                4
              </span>
              <div>
                <p className="font-semibold text-slate-100">Paste &amp; Click &quot;Connect &amp; Start Bot&quot;</p>
                <p className="text-slate-400 text-[11px] mt-0.5">
                  Your bot will immediately come online. Anyone can send it Terabox links to get files back!
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Standalone Bot Scripts Export (Python & Node.js) */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <Terminal className="h-5 w-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-semibold text-slate-100">
                Self-Host Standalone Bot Scripts
              </h3>
              <p className="text-xs text-slate-400">
                Deploy your Telegram bot 24/7 on your own server, VPS, Termux, Render, or Railway
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              onClick={() => setActiveScriptTab('python')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeScriptTab === 'python'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Python (telebot)
            </button>
            <button
              onClick={() => setActiveScriptTab('node')}
              className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
                activeScriptTab === 'node'
                  ? 'bg-slate-800 text-cyan-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Node.js (Telegraf)
            </button>
          </div>
        </div>

        <div className="relative">
          <textarea
            readOnly
            rows={10}
            value={activeScriptTab === 'python' ? pythonBotCode : nodeBotCode}
            className="w-full rounded-xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-slate-300 focus:outline-none resize-none"
          />

          <button
            onClick={() =>
              copyScript(
                activeScriptTab === 'python' ? pythonBotCode : nodeBotCode,
                activeScriptTab
              )
            }
            className="absolute right-4 top-4 flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/90 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer"
          >
            {copiedScript === activeScriptTab ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-400" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 pt-1">
          <span>
            Run with: <code className="text-cyan-400">{activeScriptTab === 'python' ? 'python bot.py' : 'node bot.js'}</code>
          </span>
          <span className="mt-1 sm:mt-0">
            Automatically handles link normalization, video streaming, and Telegram 50MB upload logic
          </span>
        </div>
      </div>
    </div>
  );
};
