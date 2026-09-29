import { HistoryItem, TeraFile, UserSettings } from '../types/terabox';

export const SUPPORTED_DOMAINS = [
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
];

export function isValidTeraboxUrl(input: string): boolean {
  if (!input || !input.trim()) return false;
  const trimmed = input.trim();
  const lower = trimmed.toLowerCase();

  // Check if contains any supported domain
  const hasDomain = SUPPORTED_DOMAINS.some((domain) => lower.includes(domain));
  if (hasDomain) return true;

  // Check if it's a short code or standard pattern
  if (/^1[a-zA-Z0-9_-]{10,}$/.test(trimmed)) return true;
  if (/^https?:\/\//i.test(trimmed) && (trimmed.includes('/s/') || trimmed.includes('surl='))) return true;

  return false;
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

export function formatDate(timestamp: number): string {
  if (!timestamp) return 'Just now';
  // Handle 10-digit unix timestamp
  const ms = timestamp < 1e12 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// Generate Aria2 command
export function generateAria2Command(file: TeraFile, threads = 16): string {
  const url = file.directDlink || file.downloadUrl;
  const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
  return `aria2c -c -s ${threads} -x ${threads} -k 1M --header="User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0" --header="Referer: https://www.terabox.app/" "${fullUrl}" -o "${file.name}"`;
}

// Generate cURL command
export function generateCurlCommand(file: TeraFile): string {
  const url = file.directDlink || file.downloadUrl;
  const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
  return `curl -C - -L -H "User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0" -H "Referer: https://www.terabox.app/" -o "${file.name}" "${fullUrl}"`;
}

// Generate Wget command
export function generateWgetCommand(file: TeraFile): string {
  const url = file.directDlink || file.downloadUrl;
  const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
  return `wget -c --user-agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/126.0.0.0" --header="Referer: https://www.terabox.app/" -O "${file.name}" "${fullUrl}"`;
}

// Generate IDM export text
export function generateIdmExport(files: TeraFile[]): string {
  let output = '<IDM-EXPORT>\r\n';
  files.forEach((f) => {
    const url = f.directDlink || f.downloadUrl;
    const fullUrl = url.startsWith('/') ? `${window.location.origin}${url}` : url;
    output += `\r\n<\r\n${fullUrl}\r\nreferer: https://www.terabox.app/\r\nfile: ${f.name}\r\n>\r\n`;
  });
  return output;
}

// LocalStorage helpers for History
const HISTORY_KEY = 'terafetch_history_v1';
const SETTINGS_KEY = 'terafetch_settings_v1';

export function getHistory(): HistoryItem[] {
  try {
    const data = localStorage.getItem(HISTORY_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

export function saveToHistory(file: TeraFile, status: 'completed' | 'started' = 'started'): void {
  try {
    const current = getHistory();
    const existingIndex = current.findIndex((item) => item.id === file.id || (item.name === file.name && item.size === file.size));

    const newItem: HistoryItem = {
      id: file.id || String(Date.now()),
      name: file.name,
      size: file.size,
      formattedSize: file.formattedSize,
      type: file.type,
      thumb: file.thumb,
      downloadUrl: file.downloadUrl,
      directDlink: file.directDlink,
      sourceUrl: file.sourceUrl,
      downloadedAt: Date.now(),
      status,
    };

    if (existingIndex >= 0) {
      current[existingIndex] = newItem;
    } else {
      current.unshift(newItem);
    }

    // Keep up to 100 items
    localStorage.setItem(HISTORY_KEY, JSON.stringify(current.slice(0, 100)));
  } catch {
    // Ignore storage quota errors
  }
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}

export function removeHistoryItem(id: string): HistoryItem[] {
  try {
    const current = getHistory().filter((item) => item.id !== id);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(current));
    return current;
  } catch {
    return [];
  }
}

export const DEFAULT_SETTINGS: UserSettings = {
  ndusCookie: '',
  useProxyDownload: true,
  autoCopyLink: false,
  preferredThreads: 16,
};

export function getSettings(): UserSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    return data ? { ...DEFAULT_SETTINGS, ...JSON.parse(data) } : DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Ignore
  }
}
