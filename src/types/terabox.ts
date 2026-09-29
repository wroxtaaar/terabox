export type FileCategoryType = 'video' | 'audio' | 'image' | 'document' | 'archive' | 'application' | 'other';

export interface TeraFile {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  category: number | string;
  type: FileCategoryType;
  thumb?: string;
  downloadUrl: string; // Accelerated proxy URL
  directDlink?: string; // Direct Terabox CDN URL
  streamUrl?: string; // Streaming preview URL for videos/audio
  shareId?: string;
  uk?: string;
  createTime?: number;
  sourceUrl: string;
}

export interface ResolveError {
  url: string;
  error: string;
}

export interface ResolveResponse {
  success: boolean;
  totalFiles: number;
  files: TeraFile[];
  errors?: ResolveError[];
}

export interface HistoryItem {
  id: string;
  name: string;
  size: number;
  formattedSize: string;
  type: FileCategoryType;
  thumb?: string;
  downloadUrl: string;
  directDlink?: string;
  sourceUrl: string;
  downloadedAt: number;
  status: 'completed' | 'started' | 'saved';
}

export interface UserSettings {
  ndusCookie: string;
  useProxyDownload: boolean;
  autoCopyLink: boolean;
  preferredThreads: number;
  telegramBotToken?: string;
}

export interface TelegramBotInfo {
  id: number;
  is_bot: boolean;
  first_name: string;
  username: string;
  can_join_groups?: boolean;
  can_read_all_group_messages?: boolean;
  supports_inline_queries?: boolean;
}

export interface TelegramLogEntry {
  id: string;
  timestamp: number;
  type: 'incoming' | 'sent' | 'error' | 'system';
  userId?: number | string;
  username?: string;
  message: string;
  fileName?: string;
  fileSize?: string;
}

export interface TelegramBotStatusResponse {
  isRunning: boolean;
  botInfo: TelegramBotInfo | null;
  logs: TelegramLogEntry[];
}
