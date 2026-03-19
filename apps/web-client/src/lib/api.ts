const API_BASE = typeof window !== 'undefined' ? '/api/proxy/v1' : 'http://localhost:3001/api/v1';

function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('accessToken');
}

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
    public code?: string
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function api<T>(
  path: string,
  options: RequestInit & { skipAuth?: boolean } = {}
): Promise<T> {
  const { skipAuth, ...init } = options;
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (!skipAuth) {
    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;
  }
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, { ...init, headers });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Network error';
    throw new ApiError(
      msg.includes('fetch') ? 'Cannot reach server. Is the API running?' : msg,
      undefined,
      'NETWORK_ERROR'
    );
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText, code: 'UNKNOWN' } }));
    const message = err?.error?.message || res.statusText;
    const code = err?.error?.code;
    throw new ApiError(message, res.status, code);
  }
  return res.json() as Promise<T>;
}

export const auth = {
  register: (email: string, password: string) =>
    api<{ user: { id: string; email: string }; accessToken: string; refreshToken: string }>(
      '/auth/register',
      { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true }
    ),
  login: (email: string, password: string) =>
    api<{ user: { id: string; email: string }; accessToken: string; refreshToken: string }>(
      '/auth/login',
      { method: 'POST', body: JSON.stringify({ email, password }), skipAuth: true }
    ),
  refresh: (refreshToken: string) =>
    api<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
      body: JSON.stringify({ refreshToken }),
      skipAuth: true,
    }),
  me: () => api<{ id: string; email: string; emailVerified: boolean }>('/auth/me'),
  logout: (refreshToken?: string) =>
    api('/auth/logout', { method: 'POST', body: JSON.stringify({ refreshToken }) }),
};

export const mailboxes = {
  get: () => api<{ id: string; userId: string }>('/mailboxes'),
  getEmails: (id: string, folder: string, limit = 50, offset = 0) =>
    api<{ emails: EmailListItem[] }>(
      `/mailboxes/${id}/emails?folder=${folder}&limit=${limit}&offset=${offset}`
    ),
};

export const emails = {
  get: (id: string) =>
    api<EmailDetail & { bodyEncrypted: string | null; attachments: { id: string; filenameEncrypted: string; sizeBytes: number }[] }>(
      `/emails/${id}`
    ),
  create: (body: CreateEmailBody) =>
    api<{ email: EmailDetail; sent: boolean }>('/emails', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  patch: (id: string, body: { isRead?: boolean; isStarred?: boolean; folder?: string }) =>
    api<EmailDetail>(`/emails/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: (id: string, permanent?: boolean) =>
    api(`/emails/${id}${permanent ? '?permanent=true' : ''}`, { method: 'DELETE' }),
};

export const userKeys = {
  upload: (body: { publicKey: string; encryptedPrivateKey: string; keySalt: string; algorithm: string }) =>
    api('/users/keys', { method: 'POST', body: JSON.stringify(body) }),
  getMine: () =>
    api<{ publicKey: string; encryptedPrivateKey: string; keySalt: string; algorithm: string }>(
      '/users/me/keys'
    ),
  getPublicKey: (email: string) =>
    api<{ publicKey: string }>(`/users/public-key?email=${encodeURIComponent(email)}`),
};

export const contacts = {
  list: () => api<{ contacts: { id: string; payloadEncrypted: string }[] }>('/contacts'),
  create: (payloadEncrypted: string) =>
    api<{ id: string }>('/contacts', { method: 'POST', body: JSON.stringify({ payloadEncrypted }) }),
};

export const search = {
  query: (params: { q?: string; folder?: string; limit?: number; offset?: number }) => {
    const sp = new URLSearchParams();
    if (params.q) sp.set('q', params.q);
    if (params.folder) sp.set('folder', params.folder);
    if (params.limit) sp.set('limit', String(params.limit));
    if (params.offset) sp.set('offset', String(params.offset));
    return api<{ results: EmailListItem[] }>(`/search?${sp}`);
  },
};

export interface EmailListItem {
  id: string;
  fromAddress: string;
  toAddresses: string | null;
  subjectEncrypted: string | null;
  subjectPlain: string | null;
  folder: string;
  receivedAt: string | null;
  sentAt: string | null;
  isRead: boolean;
  isStarred: boolean;
  threadId: string | null;
}

export interface EmailDetail {
  id: string;
  fromAddress: string;
  toAddresses: string | null;
  ccAddresses: string | null;
  bccAddresses: string | null;
  subjectEncrypted: string | null;
  subjectPlain: string | null;
  folder: string;
  receivedAt: string | null;
  sentAt: string | null;
  isRead: boolean;
  isStarred: boolean;
}

export interface CreateEmailBody {
  to?: string[];
  cc?: string[];
  bcc?: string[];
  subject?: string;
  subjectEncrypted?: string;
  bodyEncrypted?: string;
  sessionKeysEncrypted?: Record<string, string>;
  attachmentIds?: string[];
  draftId?: string;
  sendNow?: boolean;
}
