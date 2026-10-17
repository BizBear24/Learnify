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
  topics?: { topic: string; right: number; total: number }[];
  swot?: { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] };
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

// ---- XP / level (device-local, no accounts) ----
export const XP_PER_CORRECT = 10;
export const XP_PER_LEVEL = 100;
const PROFILE = "learnify:profile";

export interface Profile {
  xp: number;
  name: string;
  awarded: string[]; // room codes already counted
}

export function loadProfile(): Profile {
  try {
    const p = JSON.parse(localStorage.getItem(PROFILE) || "{}");
    return { xp: Number(p.xp) || 0, name: p.name || "", awarded: Array.isArray(p.awarded) ? p.awarded : [] };
  } catch {
    return { xp: 0, name: "", awarded: [] };
  }
}

export function levelInfo(xp: number) {
  const level = Math.floor(xp / XP_PER_LEVEL) + 1;
  const into = xp % XP_PER_LEVEL;
  return { level, into, toNext: XP_PER_LEVEL - into, pct: into };
}

/** 10 XP per correct answer, counted once per room. Returns what was gained and whether it levelled up. */
export function awardXp(code: string, correct: number, name: string) {
  const p = loadProfile();
  if (p.awarded.includes(code)) return { gained: 0, levelUp: false, already: true };
  const before = levelInfo(p.xp).level;
  const gained = Math.max(0, correct) * XP_PER_CORRECT;
  p.xp += gained;
  p.name = name || p.name;
  p.awarded = [code, ...p.awarded].slice(0, 300);
  try {
    localStorage.setItem(PROFILE, JSON.stringify(p));
  } catch {}
  return { gained, levelUp: levelInfo(p.xp).level > before, already: false };
}
