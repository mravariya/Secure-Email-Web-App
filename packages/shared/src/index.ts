export const API_VERSION = 'v1';
export const JWT_ACCESS_EXPIRY = '15m';
export const JWT_REFRESH_EXPIRY = '7d';
export const FOLDERS = ['inbox', 'sent', 'drafts', 'spam', 'trash'] as const;
export type Folder = (typeof FOLDERS)[number];

export interface ApiError {
  code: string;
  message: string;
  details?: unknown[];
}

export function apiError(code: string, message: string, details?: unknown[]): ApiError {
  return { code, message, details };
}
