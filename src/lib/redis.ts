import { Redis } from "@upstash/redis";
import { randomBytes } from "node:crypto";
import type { Quiz, Room } from "./schema";
import type { StoredAnswer } from "./game";

export const TTL = 6 * 60 * 60;

let _r: Redis | null = null;
export function redis() {
  return (_r ||= new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  }));
}

const kRoom = (c: string) => `room:${c}`;
const kPlayers = (c: string) => `players:${c}`;
const kAnswers = (c: string) => `answers:${c}`;

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ"; // no I/O

function makeCode() {
  const b = randomBytes(5);
  return Array.from(b, (x) => ALPHA[x % ALPHA.length]).join("");
}

export async function createRoom(quiz: Quiz) {
  const r = redis();
  const hostToken = randomBytes(16).toString("hex");
  for (let i = 0; i < 5; i++) {
    const code = makeCode();
    const room: Omit<Room, "players"> = { code, hostToken, startedAt: null, ...quiz };
    const ok = await r.set(kRoom(code), JSON.stringify(room), { nx: true, ex: TTL });
    if (ok) return { code, hostToken };
  }
  throw new Error("Could not allocate a room code");
}

export async function getRoom(code: string): Promise<Omit<Room, "players"> | null> {
  const v = await redis().get<string | object>(kRoom(code));
  if (!v) return null;
  return typeof v === "string" ? JSON.parse(v) : (v as Omit<Room, "players">);
}

export async function saveRoom(room: Omit<Room, "players">) {
  await redis().set(kRoom(room.code), JSON.stringify(room), { ex: TTL });
}

export async function getPlayers(code: string): Promise<Record<string, string>> {
  return (await redis().hgetall<Record<string, string>>(kPlayers(code))) ?? {};
}

export async function addPlayer(code: string, name: string) {
  const r = redis();
  const players = await getPlayers(code);
  const taken = new Set(Object.values(players).map((n) => n.toLowerCase()));
  let final = name;
  for (let n = 2; taken.has(final.toLowerCase()); n++) {
    final = `${name.slice(0, 17)} ${n}`;
  }
  const pid = randomBytes(8).toString("hex");
  await r.hset(kPlayers(code), { [pid]: final });
  await r.expire(kPlayers(code), TTL);
  return { pid, name: final };
}

export async function getAnswers(code: string): Promise<Record<string, StoredAnswer>> {
  const raw = (await redis().hgetall<Record<string, unknown>>(kAnswers(code))) ?? {};
  const out: Record<string, StoredAnswer> = {};
  for (const [k, v] of Object.entries(raw)) {
    out[k] = typeof v === "string" ? JSON.parse(v) : (v as StoredAnswer);
  }
  return out;
}

/** true if this was the first answer for (pid, qIndex) */
export async function putAnswer(code: string, pid: string, qIndex: number, a: StoredAnswer) {
  const r = redis();
  const ok = await r.hsetnx(kAnswers(code), `${pid}:${qIndex}`, JSON.stringify(a));
  if (ok) await r.expire(kAnswers(code), TTL);
  return ok === 1;
}
