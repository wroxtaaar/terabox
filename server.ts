import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Known Terabox and mirror domains
const TERABOX_DOMAINS = [
  'terabox.com',
  'terabox.app',
  'teraboxapp.com',
  '1024tera.com',
  'teraboxshare.com',
  'teraboxlink.com',
  'nephobox.com',
  '4funbox.com',
  'mirrobox.com',
  'momerybox.com',
  'tibibox.com',
  'freeterabox.com',
  'dubox.com',
];

interface TeraBoxFile {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  category: number | string;
  type: 'video' | 'audio' | 'image' | 'document' | 'archive' | 'application' | 'other';
  thumb?: string;
  downloadUrl: string;
  directDlink?: string;
  streamUrl?: string;
  shareId?: string;
  uk?: string;
  createTime?: number;
  sourceUrl: string;
}

function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

function getFileType(filename: string, category?: number | string): TeraBoxFile['type'] {
  const ext = (filename.split('.').pop() || '').toLowerCase();
  if (['mp4', 'mkv', 'avi', 'mov', 'wmv', 'flv', 'webm', 'm4v', '3gp'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma'].includes(ext)) return 'audio';
  if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'svg', 'heic'].includes(ext)) return 'image';
  if (['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'rtf', 'csv'].includes(ext)) return 'document';
  if (['zip', 'rar', '7z', 'tar', 'gz', 'bz2', 'iso'].includes(ext)) return 'archive';
  if (['apk', 'exe', 'dmg', 'msi', 'deb', 'rpm'].includes(ext)) return 'application';

  if (category === 1 || category === '1') return 'video';
  if (category === 2 || category === '2') return 'audio';
  if (category === 3 || category === '3') return 'image';
  if (category === 4 || category === '4') return 'document';
  if (category === 5 || category === '5') return 'application';

  return 'other';
}

// Extract the surl key from various Terabox URL formats
function extractSurl(rawUrl: string): { surl: string; fullUrl: string; cleanUrl: string } | null {
  try {
    let clean = rawUrl.trim();
    if (!clean.startsWith('http://') && !clean.startsWith('https://')) {
      if (clean.startsWith('s/')) {
        clean = `https://terabox.com/${clean}`;
      } else if (clean.length > 5 && !clean.includes('/')) {
        // standalone code like 1xxxx or xxxx
        clean = `https://terabox.com/s/${clean}`;
      } else {
        clean = `https://${clean}`;
      }
    }

    const parsed = new URL(clean);
    let surl = '';

    // Check query params: surl=... or shorturl=...
    if (parsed.searchParams.has('surl')) {
      surl = parsed.searchParams.get('surl')!;
    } else if (parsed.searchParams.has('shorturl')) {
      surl = parsed.searchParams.get('shorturl')!;
    } else {
      // Check pathname: /s/1xxxxxxxx or /s/xxxxxxxx or /sharing/link?surl=...
      const pathMatch = parsed.pathname.match(/\/s\/([a-zA-Z0-9_-]+)/);
      if (pathMatch) {
        surl = pathMatch[1];
      }
    }

    if (!surl) {
      // Look for code after the last slash
      const parts = parsed.pathname.split('/').filter(Boolean);
      const last = parts[parts.length - 1];
      if (last && last.length >= 8) {
        surl = last;
      }
    }

    if (surl) {
      const cleanKey = surl.startsWith('1') ? surl : `1${surl}`;
      return { surl, fullUrl: clean, cleanUrl: `https://terabox.com/s/${cleanKey}` };
    }
    return null;
  } catch {
    return null;
  }
}

// State for global Terabox cookie
let globalUserCookie = process.env.TERABOX_COOKIE || '';

// Strategy 1: Direct Web scraper & official Terabox API resolver
async function resolveViaTeraboxWeb(
  surlKey: string,
  fullUrl: string,
  userCookie?: string,
  password?: string
): Promise<TeraBoxFile[]> {
  const activeCookie = (userCookie || globalUserCookie || '').trim();

  // Build candidate shorturl keys to try (with and without initial '1')
  const candidateKeys: string[] = [surlKey];
  if (surlKey.startsWith('1')) {
    candidateKeys.push(surlKey.slice(1));
  } else {
    candidateKeys.push(`1${surlKey}`);
  }

  const primaryKey = candidateKeys[0];
  const targetUrl = `https://www.terabox.app/sharing/link?surl=${primaryKey}`;

  const defaultHeaders: Record<string, string> = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
    'Accept-Language': 'en-US,en;q=0.9',
    'Referer': 'https://www.terabox.app/',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
  };

  if (activeCookie) {
    defaultHeaders['Cookie'] = activeCookie.startsWith('ndus=') ? activeCookie : `ndus=${activeCookie}; lang=en;`;
  } else {
    defaultHeaders['Cookie'] = 'lang=en;';
  }

  // 1. Fetch initial HTML to extract session cookies and jsToken
  let sessionCookies = '';
  let html = '';
  try {
    const res = await fetch(targetUrl, {
      headers: defaultHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(10000),
    });
    html = await res.text();
    if (res.headers.getSetCookie) {
      sessionCookies = res.headers
        .getSetCookie()
        .map((c) => c.split(';')[0])
        .join('; ');
    }
  } catch {
    // Continue with direct API attempt
  }

  let fileList: any[] = [];
  let jsToken = '';
  let shareId = '';
  let uk = '';
  let sign = '';
  let timestamp = '';

  // Extract jsToken from HTML
  const jsTokenMatch =
    html.match(/fn%28%22([0-9a-fA-F]+)%22%29/) ||
    html.match(/fn\("([0-9a-fA-F]+)"\)/) ||
    html.match(/"jsToken"\s*:\s*"([^"]+)"/) ||
    html.match(/jsToken\s*=\s*['"]([^'"]+)['"]/);
  if (jsTokenMatch) {
    jsToken = jsTokenMatch[1];
  }

  // Extract yunData
  const yunDataMatch = html.match(/yunData\s*=\s*({[\s\S]*?});/);
  if (yunDataMatch) {
    try {
      const parsedYunData = JSON.parse(yunDataMatch[1]);
      shareId = String(parsedYunData.SHARE_ID || parsedYunData.share_id || '');
      uk = String(parsedYunData.SHARE_UK || parsedYunData.uk || '');
      sign = String(parsedYunData.SIGN || parsedYunData.sign || '');
      timestamp = String(parsedYunData.TIMESTAMP || parsedYunData.timestamp || '');
      if (parsedYunData.FILE_LIST && Array.isArray(parsedYunData.FILE_LIST)) {
        fileList = parsedYunData.FILE_LIST;
      }
    } catch {
      // Ignore
    }
  }

  const mergedCookie = [activeCookie, sessionCookies, 'lang=en;'].filter(Boolean).join('; ');

  // 2. Query share/list API if fileList is empty or lacks dlink
  if (!fileList || fileList.length === 0 || !fileList.some((f) => f.dlink)) {
    for (const key of candidateKeys) {
      const listApiUrl = new URL('https://www.terabox.app/share/list');
      listApiUrl.searchParams.set('app_id', '250528');
      listApiUrl.searchParams.set('web', '1');
      listApiUrl.searchParams.set('channel', 'dubox');
      listApiUrl.searchParams.set('clienttype', '0');
      listApiUrl.searchParams.set('root', '1');
      listApiUrl.searchParams.set('page', '1');
      listApiUrl.searchParams.set('num', '100');
      listApiUrl.searchParams.set('shorturl', key);
      if (jsToken) listApiUrl.searchParams.set('jsToken', jsToken);
      if (password) listApiUrl.searchParams.set('pwd', password);

      const apiHeaders = {
        ...defaultHeaders,
        'Cookie': mergedCookie,
        'Accept': 'application/json, text/plain, */*',
        'X-Requested-With': 'XMLHttpRequest',
      };

      try {
        const apiRes = await fetch(listApiUrl.toString(), {
          headers: apiHeaders,
          signal: AbortSignal.timeout(8000),
        });

        if (apiRes.ok) {
          const apiData = await apiRes.json();
          if (apiData && apiData.errno === 0 && Array.isArray(apiData.list) && apiData.list.length > 0) {
            fileList = apiData.list;
            if (apiData.share_id) shareId = String(apiData.share_id);
            if (apiData.uk) uk = String(apiData.uk);
            break;
          }
        }
      } catch {
        // Try next candidate key
      }
    }
  }

  if (!fileList || fileList.length === 0) {
    throw new Error('No files found in share response');
  }

  const results: TeraBoxFile[] = [];

  for (const item of fileList) {
    const filename = item.server_filename || item.filename || item.name || 'unnamed_file';
    const size = parseInt(item.size || '0', 10);
    const category = item.category || 0;
    const fsId = item.fs_id || String(Math.floor(Math.random() * 1000000000));
    const thumbs = item.thumbs || {};
    const thumbUrl = thumbs.url3 || thumbs.url2 || thumbs.url1 || item.thumb || '';
    let dlink = item.dlink || '';

    // If dlink is missing, try fetching via share/download
    if (!dlink && shareId && uk) {
      try {
        const dlUrl = `https://www.terabox.app/share/download?app_id=250528&web=1&channel=dubox&clienttype=0&jsToken=${jsToken}&shareid=${shareId}&uk=${uk}&primaryid=${shareId}&product=share&nozip=0&fid_list=[${fsId}]`;
        const dlRes = await fetch(dlUrl, {
          headers: {
            'User-Agent': defaultHeaders['User-Agent'],
            'Referer': 'https://www.terabox.app/',
            'Cookie': mergedCookie,
          },
          signal: AbortSignal.timeout(4000),
        });
        if (dlRes.ok) {
          const dlData = await dlRes.json();
          if (dlData.errno === 0 && dlData.dlink) {
            dlink = dlData.dlink;
          }
        }
      } catch {
        // Ignore
      }
    }

    // Direct desktop Web bypass link (avoids mobile WAP lock)
    const directWebBypass = `https://www.terabox.app/sharing/link?surl=${candidateKeys[0]}`;

    // Generate in-app proxy URLs
    const proxyDownloadUrl = dlink
      ? `/api/proxy-download?url=${encodeURIComponent(dlink)}&filename=${encodeURIComponent(filename)}`
      : directWebBypass;
    const proxyStreamUrl = dlink
      ? `/api/proxy-stream?url=${encodeURIComponent(dlink)}&filename=${encodeURIComponent(filename)}`
      : undefined;

    results.push({
      id: fsId,
      name: filename,
      size,
      formattedSize: formatBytes(size),
      category,
      type: getFileType(filename, category),
      thumb: thumbUrl,
      downloadUrl: proxyDownloadUrl,
      // ONLY set directDlink if it is a real download stream, NOT the web page!
      directDlink: dlink ? dlink : undefined,
      streamUrl: proxyStreamUrl,
      shareId,
      uk,
      createTime: item.server_ctime || Date.now(),
      sourceUrl: fullUrl,
    });
  }

  return results;
}

// Strategy 2: Multi-worker public bridges fallback
async function resolveViaBridgeWorker(cleanUrl: string): Promise<TeraBoxFile[]> {
  const bridgeEndpoints = [
    `https://terabox-api.mn-bots.workers.dev/download?url=${encodeURIComponent(cleanUrl)}`,
    `https://terabox-dl.qtcloud.workers.dev/api?url=${encodeURIComponent(cleanUrl)}`,
    `https://yt-api-terabox.vercel.app/api?url=${encodeURIComponent(cleanUrl)}`,
  ];

  for (const endpoint of bridgeEndpoints) {
    try {
      const res = await fetch(endpoint, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36',
          'Accept': 'application/json, */*',
        },
        signal: AbortSignal.timeout(8000),
      });

      if (!res.ok) continue;

      const data = await res.json();
      if (!data) continue;

      // Handle various response schemas
      let list: any[] = [];
      if (Array.isArray(data)) {
        list = data;
      } else if (Array.isArray(data.list)) {
        list = data.list;
      } else if (Array.isArray(data.download_links)) {
        list = data.download_links;
      } else if (data.download_url || data.dlink || data.downloadUrl) {
        list = [data];
      }

      if (list.length > 0) {
        const results: TeraBoxFile[] = [];
        for (const item of list) {
          const filename =
            item.file_name || item.filename || item.server_filename || item.name || 'terabox_download';
          let size = 0;
          if (typeof item.size === 'number') size = item.size;
          else if (typeof item.file_size === 'number') size = item.file_size;
          else if (typeof item.size === 'string' && /^\d+$/.test(item.size)) size = parseInt(item.size, 10);

          const directUrl =
            item.download_url ||
            item.dlink ||
            item.downloadUrl ||
            item.direct_link ||
            item.url ||
            item.download ||
            '';
          if (!directUrl) continue;

          const thumb = item.thumb || item.thumbnail || (item.thumbs && (item.thumbs.url3 || item.thumbs.url1)) || '';
          const fsId = item.fs_id || String(Math.floor(Math.random() * 1000000000));
          const proxyDownloadUrl = `/api/proxy-download?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(filename)}`;
          const proxyStreamUrl = `/api/proxy-stream?url=${encodeURIComponent(directUrl)}&filename=${encodeURIComponent(filename)}`;

          results.push({
            id: fsId,
            name: filename,
            size,
            formattedSize: size > 0 ? formatBytes(size) : (item.file_size_formatted || 'Unknown size'),
            category: item.category || 0,
            type: getFileType(filename, item.category),
            thumb,
            downloadUrl: proxyDownloadUrl,
            directDlink: directUrl,
            streamUrl: proxyStreamUrl,
            sourceUrl: cleanUrl,
          });
        }

        if (results.length > 0) {
          return results;
        }
      }
    } catch {
      // Continue to next bridge endpoint
    }
  }

  throw new Error('All external Terabox bridges failed');
}

// API: Resolve Terabox link (single or batch)
app.post('/api/resolve', async (req: Request, res: Response) => {
  try {
    const { url, urls, password, cookie } = req.body;
    const linksToProcess: string[] = [];

    if (urls && Array.isArray(urls)) {
      linksToProcess.push(...urls);
    } else if (url && typeof url === 'string') {
      // Could be multi-line string
      const lines = url
        .split(/[\r\n]+/)
        .map((l) => l.trim())
        .filter(Boolean);
      linksToProcess.push(...lines);
    }

    if (linksToProcess.length === 0) {
      return res.status(400).json({ error: 'Please provide at least one valid Terabox link' });
    }

    const allFiles: TeraBoxFile[] = [];
    const errors: { url: string; error: string }[] = [];

    for (const raw of linksToProcess) {
      const extracted = extractSurl(raw);
      if (!extracted) {
        errors.push({ url: raw, error: 'Invalid Terabox URL format' });
        continue;
      }

      let resolvedFiles: TeraBoxFile[] = [];
      let resolvedSuccess = false;

      // Attempt 1: Direct Web scraper & API
      try {
        resolvedFiles = await resolveViaTeraboxWeb(extracted.surl, extracted.fullUrl, cookie, password);
        if (resolvedFiles && resolvedFiles.length > 0) {
          resolvedSuccess = true;
          allFiles.push(...resolvedFiles);
        }
      } catch (err: any) {
        // Fall through to Attempt 2
      }

      // Attempt 2: Multi-worker Bridge
      if (!resolvedSuccess) {
        try {
          resolvedFiles = await resolveViaBridgeWorker(extracted.cleanUrl);
          if (resolvedFiles && resolvedFiles.length > 0) {
            resolvedSuccess = true;
            allFiles.push(...resolvedFiles);
          }
        } catch (err: any) {
          // Both failed
        }
      }

      if (!resolvedSuccess) {
        // Return clear diagnostic info
        errors.push({
          url: raw,
          error:
            'Unable to extract files directly. The link may be expired, password-protected, or restricted. You can provide your Terabox "ndus" cookie in Settings for unrestricted direct access.',
        });
      }
    }

    return res.json({
      success: allFiles.length > 0,
      totalFiles: allFiles.length,
      files: allFiles,
      errors: errors.length > 0 ? errors : undefined,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Internal server error while resolving link' });
  }
});

// API: Proxy file download with streaming & Range support (bypasses CORS & 403 Forbidden)
app.get('/api/proxy-download', async (req: Request, res: Response) => {
  const directUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'download';

  if (!directUrl) {
    return res.status(400).send('Missing target URL');
  }

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Referer': 'https://www.terabox.app/',
      'Accept': '*/*',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      // If direct link failed or expired, return 302 redirect so browser tries directly
      return res.redirect(directUrl);
    }

    const safeFilename = filename.replace(/["\r\n\t]/g, '_');
    const contentType = upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');

    res.status(upstreamRes.status);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeFilename)}"`);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');

    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstreamRes.body) {
      // Web ReadableStream to Node WritableStream pipe
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              await new Promise((resolve) => res.once('drain', resolve));
            }
          }
        } catch {
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch (err: any) {
    // Fallback: redirect user directly
    try {
      res.redirect(directUrl);
    } catch {
      res.status(500).send('Error streaming download');
    }
  }
});

// API: Proxy stream for video/audio preview player
app.get('/api/proxy-stream', async (req: Request, res: Response) => {
  const directUrl = req.query.url as string;
  const filename = (req.query.filename as string) || 'media';

  if (!directUrl) {
    return res.status(400).send('Missing media URL');
  }

  try {
    const rangeHeader = req.headers.range;
    const fetchHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
      'Referer': 'https://www.terabox.app/',
    };

    if (rangeHeader) {
      fetchHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(directUrl, {
      headers: fetchHeaders,
      redirect: 'follow',
    });

    res.status(upstreamRes.status);
    const contentType = upstreamRes.headers.get('content-type') || 'video/mp4';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');

    res.setHeader('Content-Type', contentType);
    res.setHeader('Accept-Ranges', 'bytes');
    if (contentLength) res.setHeader('Content-Length', contentLength);
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (upstreamRes.body) {
      const reader = upstreamRes.body.getReader();
      const pump = async () => {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              res.end();
              break;
            }
            if (!res.write(value)) {
              await new Promise((resolve) => res.once('drain', resolve));
            }
          }
        } catch {
          res.end();
        }
      };
      pump();
    } else {
      res.end();
    }
  } catch {
    res.status(500).send('Error streaming media');
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: Date.now() });
});

// ==========================================
// TELEGRAM BOT ENGINE & WEBHOOK INTEGRATION
// ==========================================

interface TelegramLogEntry {
  id: string;
  timestamp: number;
  type: 'incoming' | 'sent' | 'error' | 'system';
  userId?: number | string;
  username?: string;
  message: string;
  fileName?: string;
  fileSize?: string;
}

let tgBotToken = process.env.TELEGRAM_BOT_TOKEN || '';
let tgBotInfo: any = null;
let isPolling = false;
let pollingAbortController: AbortController | null = null;
const tgLogs: TelegramLogEntry[] = [];

function addTgLog(log: Omit<TelegramLogEntry, 'id' | 'timestamp'>) {
  tgLogs.unshift({
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    timestamp: Date.now(),
    ...log,
  });
  if (tgLogs.length > 80) tgLogs.pop();
}

async function sendTelegramMessage(token: string, chatId: number | string, text: string, replyMarkup?: any) {
  try {
    const body: any = {
      chat_id: chatId,
      text,
      parse_mode: 'HTML',
      disable_web_page_preview: false,
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Error sending Telegram message:', err.message);
  }
}

async function sendTelegramPhoto(token: string, chatId: number | string, photoUrl: string, caption: string, replyMarkup?: any) {
  try {
    const body: any = {
      chat_id: chatId,
      photo: photoUrl,
      caption,
      parse_mode: 'HTML',
    };
    if (replyMarkup) body.reply_markup = replyMarkup;

    const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return await res.json();
  } catch (err: any) {
    console.error('Error sending Telegram photo:', err.message);
  }
}

async function answerTelegramCallback(token: string, callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId, text }),
    });
  } catch (err: any) {
    console.error('Error answering callback query:', err.message);
  }
}

// Track users who requested to set cookie via button
const awaitingCookieChatIds = new Set<number | string>();

function cleanCookieValue(raw: string): string {
  let val = raw.trim();
  if (val.includes('ndus=')) {
    const match = val.match(/ndus=([^;\s]+)/);
    if (match) return match[1].trim();
  }
  val = val.replace(/^["']|["'];?$/g, '').trim();
  return val;
}

async function processTelegramCallback(token: string, cb: any) {
  if (!cb || !cb.data) return;
  const chatId = cb.message?.chat?.id;
  const data = cb.data;
  const fromUser = cb.from?.username || cb.from?.first_name || String(cb.from?.id || 'Unknown');
  const userId = cb.from?.id;

  await answerTelegramCallback(token, cb.id);
  if (!chatId) return;

  if (data === 'cb_set_cookie') {
    awaitingCookieChatIds.add(chatId);
    await sendTelegramMessage(
      token,
      chatId,
      '🍪 <b>Set Terabox Account Cookie</b>\n\n' +
        '👉 <b>Please paste/send your <code>ndus</code> cookie value</b> as your next message in this chat!\n\n' +
        '<i>(You can also use <code>/cookie YOUR_VALUE</code> at any time.)</i>',
      {
        inline_keyboard: [
          [
            { text: '📖 How to get ndus cookie? (30 sec)', callback_data: 'cb_guide_cookie' },
            { text: '❌ Cancel', callback_data: 'cb_check_cookie' },
          ],
        ],
      }
    );
    return;
  }

  if (data === 'cb_check_cookie') {
    awaitingCookieChatIds.delete(chatId);
    const statusText = globalUserCookie
      ? `✅ <b>Terabox Cookie is ACTIVE!</b>\n\n<code>${globalUserCookie.slice(0, 8)}...${globalUserCookie.slice(-4)}</code>\n\n⚡ <b>Direct MP4 Video File Delivery is ENABLED.</b>\nWhenever you send a Terabox link, I will download and deliver the complete video file directly into this chat.`
      : `❌ <b>No Cookie Configured</b>\n\nTerabox blocks bots from downloading media files without an account session. Set your cookie to unlock direct MP4 video downloads!`;

    await sendTelegramMessage(token, chatId, statusText, {
      inline_keyboard: [
        [
          { text: globalUserCookie ? '🔄 Change Cookie' : '🍪 Set Cookie Now', callback_data: 'cb_set_cookie' },
          ...(globalUserCookie ? [{ text: '🗑️ Clear Cookie', callback_data: 'cb_clear_cookie' }] : []),
        ],
        [{ text: '📖 How to get ndus cookie?', callback_data: 'cb_guide_cookie' }],
      ],
    });
    return;
  }

  if (data === 'cb_clear_cookie') {
    globalUserCookie = '';
    awaitingCookieChatIds.delete(chatId);
    addTgLog({
      type: 'system',
      userId,
      username: fromUser,
      message: 'Cleared Terabox ndus cookie via Telegram button',
    });
    await sendTelegramMessage(
      token,
      chatId,
      '🗑️ <b>Terabox Cookie Removed</b>\n\nThe bot will now send web links instead of direct file uploads.',
      {
        inline_keyboard: [[{ text: '🍪 Set New Cookie', callback_data: 'cb_set_cookie' }]],
      }
    );
    return;
  }

  if (data === 'cb_guide_cookie') {
    const guide =
      '📖 <b>How to get your free Terabox ndus cookie in 30 seconds:</b>\n\n' +
      '1️⃣ Open <a href="https://www.terabox.com">terabox.com</a> in your PC browser (Chrome/Edge/Firefox) and log into your account.\n\n' +
      '2️⃣ Press <kbd>F12</kbd> (Developer Tools) $\\rightarrow$ click <b>Application</b> $\\rightarrow$ <b>Cookies</b> $\\rightarrow$ <code>terabox.com</code>.\n\n' +
      '3️⃣ Copy the text value for the cookie named <b>ndus</b>.\n\n' +
      '4️⃣ Click <b>Paste Cookie Now</b> below and send it here!';

    await sendTelegramMessage(token, chatId, guide, {
      inline_keyboard: [
        [{ text: '🍪 Paste Cookie Now', callback_data: 'cb_set_cookie' }],
        [{ text: '🔙 Back to Settings', callback_data: 'cb_check_cookie' }],
      ],
    });
    return;
  }
}

async function processTelegramMessage(token: string, msg: any) {
  if (!msg || !msg.text) return;

  const chatId = msg.chat.id;
  const text = msg.text.trim();
  const fromUser = msg.from?.username || msg.from?.first_name || String(msg.from?.id || 'Unknown');
  const userId = msg.from?.id;

  addTgLog({
    type: 'incoming',
    userId,
    username: fromUser,
    message: text,
  });

  // Handle /start, /help, /settings
  if (text.startsWith('/start') || text.startsWith('/help') || text.startsWith('/settings')) {
    const cookieStatus = globalUserCookie
      ? '✅ <b>Video File Delivery:</b> ACTIVE (Cookie configured)'
      : '⚠️ <b>Video File Delivery:</b> Cookie required for direct MP4 sending';

    const welcome =
      `👋 <b>Welcome to TeraFetch Downloader Bot!</b>\n\n` +
      `Send me any Terabox link and I will extract the files, download the content, and deliver it straight back to this chat!\n\n` +
      `⚡ <b>Current Status:</b>\n${cookieStatus}\n\n` +
      `<i>Use the buttons below to configure your account cookie or check status:</i>`;

    await sendTelegramMessage(token, chatId, welcome, {
      inline_keyboard: [
        [
          { text: globalUserCookie ? '🔍 Cookie Status' : '🍪 Set Terabox Cookie', callback_data: 'cb_check_cookie' },
          { text: '📖 Help & Guide', callback_data: 'cb_guide_cookie' },
        ],
      ],
    });
    return;
  }

  // Handle /cookie or /setcookie command
  if (text.startsWith('/cookie') || text.startsWith('/setcookie')) {
    const parts = text.split(/\s+/);
    if (parts.length < 2 || !parts[1].trim()) {
      // Show interactive menu
      const cookieStatusMsg = globalUserCookie
        ? `🍪 <b>Terabox Cookie Settings</b>\n\nStatus: ✅ <b>Active</b> (<code>${globalUserCookie.slice(0, 8)}...${globalUserCookie.slice(-4)}</code>)\n\nDirect MP4 video delivery is currently enabled.`
        : `🍪 <b>Terabox Cookie Settings</b>\n\nStatus: ❌ <b>Not configured</b>\n\nTerabox blocks automated server downloads without an account session. Configure your free <code>ndus</code> cookie to receive MP4 videos directly!`;

      await sendTelegramMessage(token, chatId, cookieStatusMsg, {
        inline_keyboard: [
          [
            { text: globalUserCookie ? '🔄 Change Cookie' : '🍪 Set Cookie Now', callback_data: 'cb_set_cookie' },
            ...(globalUserCookie ? [{ text: '🗑️ Clear Cookie', callback_data: 'cb_clear_cookie' }] : []),
          ],
          [{ text: '📖 How to get cookie (30 sec)', callback_data: 'cb_guide_cookie' }],
        ],
      });
      return;
    }

    const rawCookie = parts.slice(1).join(' ').trim();
    const newCookie = cleanCookieValue(rawCookie);
    globalUserCookie = newCookie;
    awaitingCookieChatIds.delete(chatId);

    addTgLog({
      type: 'system',
      userId,
      username: fromUser,
      message: 'Updated Terabox ndus cookie via Telegram command',
    });

    await sendTelegramMessage(
      token,
      chatId,
      `🎉 <b>Terabox Cookie Saved!</b>\n<code>${globalUserCookie.slice(0, 8)}...${globalUserCookie.slice(-4)}</code>\n\n` +
        `✅ <b>Direct Video File Delivery is now ENABLED!</b>\n` +
        `Now send your Terabox link, and I will download the video and upload the real MP4 file directly into this chat!`,
      {
        inline_keyboard: [[{ text: '🔍 View Status', callback_data: 'cb_check_cookie' }]],
      }
    );
    return;
  }

  // If user was prompted to send their cookie, capture it here!
  if (awaitingCookieChatIds.has(chatId) && !text.startsWith('/')) {
    awaitingCookieChatIds.delete(chatId);
    const cleaned = cleanCookieValue(text);
    if (cleaned.length < 10) {
      await sendTelegramMessage(
        token,
        chatId,
        '⚠️ That cookie value seems too short or invalid. Please check your <code>ndus</code> cookie and try again.',
        {
          inline_keyboard: [[{ text: '🍪 Try Again', callback_data: 'cb_set_cookie' }]],
        }
      );
      return;
    }

    globalUserCookie = cleaned;
    addTgLog({
      type: 'system',
      userId,
      username: fromUser,
      message: 'Set Terabox ndus cookie via direct text message',
    });

    await sendTelegramMessage(
      token,
      chatId,
      `🎉 <b>Terabox Cookie Saved Successfully!</b>\n\n` +
        `🔑 <code>${globalUserCookie.slice(0, 8)}...${globalUserCookie.slice(-4)}</code>\n\n` +
        `✅ <b>Direct Video File Delivery is now ACTIVE!</b>\n\n` +
        `Now simply send any Terabox link and I will download and send the complete MP4 video directly into this chat!`,
      {
        inline_keyboard: [[{ text: '🔍 Check Status', callback_data: 'cb_check_cookie' }]],
      }
    );
    return;
  }

  // Auto-detection: If user simply pasted their cookie without clicking anything
  if (
    (text.startsWith('ndus=') || (text.length >= 32 && !text.includes(' ') && !text.includes('/') && !text.includes('.'))) &&
    !text.includes('http')
  ) {
    const cleaned = cleanCookieValue(text);
    globalUserCookie = cleaned;
    awaitingCookieChatIds.delete(chatId);
    addTgLog({
      type: 'system',
      userId,
      username: fromUser,
      message: 'Auto-detected and saved Terabox ndus cookie from chat',
    });
    await sendTelegramMessage(
      token,
      chatId,
      `🎉 <b>Terabox Cookie Detected & Saved!</b>\n\n` +
        `🔑 <code>${globalUserCookie.slice(0, 8)}...${globalUserCookie.slice(-4)}</code>\n\n` +
        `✅ <b>Direct Video File Delivery is now ACTIVE!</b>\n\n` +
        `Now paste your Terabox link to download the video!`,
      {
        inline_keyboard: [[{ text: '🔍 Check Status', callback_data: 'cb_check_cookie' }]],
      }
    );
    return;
  }

  // Detect Terabox URL
  const extracted = extractSurl(text);
  if (!extracted) {
    await sendTelegramMessage(
      token,
      chatId,
      '❌ Please send a valid Terabox link (e.g., <code>https://teraboxapp.com/s/1...</code> or <code>1024tera.com</code>).\n\n<i>Tip: Tap the button below to configure your Terabox cookie.</i>',
      {
        inline_keyboard: [
          [{ text: '🍪 Set Terabox Cookie', callback_data: 'cb_set_cookie' }],
        ],
      }
    );
    return;
  }

  // Notify user that resolving has started
  await sendTelegramMessage(
    token,
    chatId,
    '⏳ <i>Analyzing Terabox link and fetching file details...</i>'
  );

  try {
    let resolvedFiles: TeraBoxFile[] = [];

    // Attempt 1: Direct Web scraper
    try {
      resolvedFiles = await resolveViaTeraboxWeb(extracted.surl, extracted.fullUrl);
    } catch {
      // Attempt 2: Bridge
      try {
        resolvedFiles = await resolveViaBridgeWorker(extracted.cleanUrl);
      } catch {
        // failed
      }
    }

    if (!resolvedFiles || resolvedFiles.length === 0) {
      addTgLog({
        type: 'error',
        userId,
        username: fromUser,
        message: 'Could not resolve link: ' + text,
      });
      await sendTelegramMessage(
        token,
        chatId,
        '⚠️ <b>Unable to extract file</b>\n\nThe link may be expired, private, or protected by captcha verification.'
      );
      return;
    }

    // Process each resolved file
    for (const file of resolvedFiles) {
      const caption = `🎬 <b>${file.name}</b>\n\n📦 <b>Size:</b> ${file.formattedSize}\n📂 <b>Type:</b> ${file.type.toUpperCase()}\n⚡ <b>Source:</b> TeraFetch High-Speed`;

      const webUrl = `https://www.terabox.app/sharing/link?surl=${extracted.surl}`;
      const isUnder50MB = file.size > 0 && file.size <= 50 * 1024 * 1024;
      let sentAsFile = false;

      // Only attempt download if file.directDlink is a REAL direct CDN file (not a webpage)
      if (
        isUnder50MB &&
        file.directDlink &&
        file.directDlink.startsWith('http') &&
        !file.directDlink.includes('sharing/link')
      ) {
        try {
          await sendTelegramMessage(
            token,
            chatId,
            `📥 <i>Downloading "${file.name}" (${file.formattedSize}) to upload directly to chat...</i>`
          );

          const upstream = await fetch(file.directDlink, {
            headers: {
              'User-Agent':
                'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36',
              'Referer': 'https://www.terabox.app/',
            },
            signal: AbortSignal.timeout(60000),
          });

          const contentType = (upstream.headers.get('content-type') || '').toLowerCase();

          // GUARD: Ensure upstream is an actual media binary file and NOT an HTML webpage (19.5 KB)
          if (upstream.ok && !contentType.includes('text/html') && !contentType.includes('application/json')) {
            const arrayBuffer = await upstream.arrayBuffer();

            // Guard against corrupted small HTML files
            if (arrayBuffer.byteLength > 50000 || (file.size > 0 && arrayBuffer.byteLength >= file.size * 0.8)) {
              const blob = new Blob([arrayBuffer]);
              const formData = new FormData();
              formData.append('chat_id', String(chatId));
              formData.append('caption', caption);
              formData.append('parse_mode', 'HTML');

              const isVideo = file.type === 'video';
              const endpoint = isVideo ? 'sendVideo' : 'sendDocument';
              formData.append(isVideo ? 'video' : 'document', blob, file.name);

              const uploadRes = await fetch(`https://api.telegram.org/bot${token}/${endpoint}`, {
                method: 'POST',
                body: formData,
              });

              const uploadData = await uploadRes.json();
              if (uploadData.ok) {
                sentAsFile = true;
                addTgLog({
                  type: 'sent',
                  userId,
                  username: fromUser,
                  message: `Uploaded file directly to chat: ${file.name}`,
                  fileName: file.name,
                  fileSize: file.formattedSize,
                });
              }
            }
          }
        } catch (uploadErr: any) {
          console.error('Direct upload to Telegram failed:', uploadErr.message);
        }
      }

      // If not sent directly as a media file, send card with high-res thumbnail and clear guidance
      if (!sentAsFile) {
        const inlineKeyboard = {
          inline_keyboard: [
            [
              {
                text: `🌐 Download on Terabox Web (${file.formattedSize})`,
                url: webUrl,
              },
            ],
          ],
        };

        const explanation =
          '\n\n💡 <b>Want the bot to send the video file directly into this chat?</b>\n' +
          'Terabox requires an account session cookie to generate direct streaming links.\n' +
          '👉 Send <code>/cookie &lt;your_ndus_cookie&gt;</code> to enable automatic video delivery!';

        if (file.thumb && file.thumb.startsWith('http')) {
          await sendTelegramPhoto(token, chatId, file.thumb, caption + explanation, inlineKeyboard);
        } else {
          await sendTelegramMessage(token, chatId, caption + explanation, inlineKeyboard);
        }

        addTgLog({
          type: 'sent',
          userId,
          username: fromUser,
          message: `Sent download card for ${file.name}`,
          fileName: file.name,
          fileSize: file.formattedSize,
        });
      }
    }
  } catch (err: any) {
    addTgLog({
      type: 'error',
      userId,
      username: fromUser,
      message: err.message || 'Error processing link',
    });
    await sendTelegramMessage(
      token,
      chatId,
      '❌ An unexpected error occurred while resolving your link. Please try again.'
    );
  }
}

// Telegram Long Polling Worker
async function startTelegramPolling(token: string) {
  if (isPolling) return;
  isPolling = true;
  pollingAbortController = new AbortController();

  addTgLog({
    type: 'system',
    message: `Telegram Bot started (@${tgBotInfo?.username || 'bot'}). Listening for incoming links...`,
  });

  let offset = 0;

  while (isPolling) {
    try {
      const res = await fetch(
        `https://api.telegram.org/bot${token}/getUpdates?offset=${offset}&timeout=20`,
        { signal: pollingAbortController.signal }
      );

      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 4000));
        continue;
      }

      const data = await res.json();
      if (data.ok && Array.isArray(data.result)) {
        for (const update of data.result) {
          offset = update.update_id + 1;
          if (update.message) {
            processTelegramMessage(token, update.message).catch(console.error);
          }
          if (update.callback_query) {
            processTelegramCallback(token, update.callback_query).catch(console.error);
          }
        }
      }
    } catch (err: any) {
      if (!isPolling || pollingAbortController?.signal.aborted) break;
      await new Promise((r) => setTimeout(r, 3000));
    }
  }
}

function stopTelegramPolling() {
  isPolling = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  addTgLog({
    type: 'system',
    message: 'Telegram Bot polling stopped.',
  });
}

// API: Get Telegram bot status & logs
app.get('/api/telegram/status', (req: Request, res: Response) => {
  res.json({
    isRunning: isPolling,
    botInfo: tgBotInfo,
    logs: tgLogs,
  });
});

// API: Start Telegram bot
app.post('/api/telegram/start', async (req: Request, res: Response) => {
  const { token } = req.body;
  const activeToken = (token || tgBotToken || '').trim();

  if (!activeToken) {
    return res.status(400).json({ error: 'Please provide a valid Telegram Bot Token from @BotFather' });
  }

  try {
    // Verify token with Telegram getMe
    const meRes = await fetch(`https://api.telegram.org/bot${activeToken}/getMe`);
    const meData = await meRes.json();

    if (!meData.ok) {
      return res.status(400).json({ error: 'Invalid Bot Token. Telegram responded: ' + (meData.description || 'Unauthorized') });
    }

    tgBotToken = activeToken;
    tgBotInfo = meData.result;

    // Stop existing polling if any
    stopTelegramPolling();

    // Start background polling
    startTelegramPolling(activeToken);

    return res.json({
      success: true,
      botInfo: tgBotInfo,
      message: `Bot @${tgBotInfo.username} successfully connected and started polling!`,
    });
  } catch (err: any) {
    return res.status(500).json({ error: err.message || 'Failed to connect to Telegram API' });
  }
});

// API: Stop Telegram bot
app.post('/api/telegram/stop', (req: Request, res: Response) => {
  stopTelegramPolling();
  tgBotInfo = null;
  res.json({ success: true, message: 'Telegram Bot stopped' });
});

// API: Webhook endpoint for serverless or production webhook deployments
app.post('/api/telegram/webhook', async (req: Request, res: Response) => {
  const update = req.body;
  if (update && tgBotToken) {
    if (update.message) {
      processTelegramMessage(tgBotToken, update.message).catch(console.error);
    }
    if (update.callback_query) {
      processTelegramCallback(tgBotToken, update.callback_query).catch(console.error);
    }
  }
  res.sendStatus(200);
});

// API: Save and get global server settings (Cookie sync)
app.post('/api/settings', (req: Request, res: Response) => {
  const { ndusCookie } = req.body;
  if (typeof ndusCookie === 'string') {
    globalUserCookie = ndusCookie.trim();
    addTgLog({
      type: 'system',
      message: globalUserCookie
        ? 'Terabox ndus cookie updated in server settings.'
        : 'Terabox cookie cleared from server settings.',
    });
  }
  res.json({ success: true, hasCookie: Boolean(globalUserCookie) });
});

app.get('/api/settings', (req: Request, res: Response) => {
  res.json({
    hasCookie: Boolean(globalUserCookie),
    cookiePreview: globalUserCookie ? `${globalUserCookie.slice(0, 6)}...${globalUserCookie.slice(-4)}` : '',
  });
});

// Setup Vite or static serving
async function startServer() {
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    // In dev: load Vite dev server as middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer();
