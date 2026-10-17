export interface Session {
  pid?: string;
  hostToken?: string;
  name?: string;
}

const key = (code: string) => `learnify:${code.toUpperCase()}`;

export function loadSession(code: string): Session {
  try {
    return JSON.parse(localStorage.getItem(key(code)) || "{}");
  } catch {
    return {};
  }
}

export function saveSession(code: string, s: Session) {
  try {
    localStorage.setItem(key(code), JSON.stringify({ ...loadSession(code), ...s }));
  } catch {}
}

export async function api<T>(url: string, body?: unknown, form?: FormData): Promise<T> {
  const res = await fetch(url, {
    method: body || form ? "POST" : "GET",
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: form ?? (body ? JSON.stringify(body) : undefined),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data as T;
}

/** Create-then-join helper shared by upload and demo. */
export async function joinRoom(code: string, name: string) {
  const r = await api<{ pid: string; name: string }>(`/api/rooms/${code}/join`, { name });
  saveSession(code, { pid: r.pid, name: r.name });
}

const HIST = "learnify:history";
export interface HistoryItem {
  code: string;
  title: string;
  at: number;
  score: number;
  correct: number;
  total: number;
  weak: string[];
}
export function loadHistory(): HistoryItem[] {
  try {
    return JSON.parse(localStorage.getItem(HIST) || "[]");
  } catch {
    return [];
  }
}
export function pushHistory(h: HistoryItem) {
  try {
    const list = loadHistory().filter((x) => x.code !== h.code);
    localStorage.setItem(HIST, JSON.stringify([h, ...list].slice(0, 20)));
  } catch {}
}
