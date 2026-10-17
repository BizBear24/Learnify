import type { Question, Room } from "./schema";

export const BLOCK_MS = 20000;
export const ANSWER_MS = 15000;
export const START_DELAY_MS = 3000;

export type Phase = "lobby" | "countdown" | "answer" | "reveal" | "finished";

export interface StoredAnswer {
  choice: number;
  t: number; // server timestamp (ms)
}

export function derive(room: Pick<Room, "startedAt" | "questions">, now: number) {
  if (room.startedAt == null) return { phase: "lobby" as Phase, qIndex: -1, into: 0 };
  const elapsed = now - room.startedAt;
  if (elapsed < 0) return { phase: "countdown" as Phase, qIndex: 0, into: elapsed };
  const qIndex = Math.floor(elapsed / BLOCK_MS);
  if (qIndex >= room.questions.length) {
    return { phase: "finished" as Phase, qIndex: room.questions.length, into: 0 };
  }
  const into = elapsed % BLOCK_MS;
  return { phase: (into < ANSWER_MS ? "answer" : "reveal") as Phase, qIndex, into };
}

export function scoreFor(q: Question, qIndex: number, startedAt: number, a: StoredAnswer): number {
  if (a.choice !== q.answerIndex) return 0;
  const deadline = startedAt + qIndex * BLOCK_MS + ANSWER_MS;
  const frac = Math.min(1, Math.max(0, (deadline - a.t) / ANSWER_MS));
  return Math.round(1000 * (0.5 + 0.5 * frac));
}

/** answers: hash of "pid:qIndex" -> StoredAnswer. Only questions < upTo are counted. */
export function leaderboard(
  room: Pick<Room, "startedAt" | "questions">,
  players: Record<string, string>,
  answers: Record<string, StoredAnswer>,
  upTo: number,
) {
  const totals: Record<string, { score: number; correct: number }> = {};
  for (const pid of Object.keys(players)) totals[pid] = { score: 0, correct: 0 };
  for (const [key, a] of Object.entries(answers)) {
    const [pid, qs] = key.split(":");
    const qi = Number(qs);
    if (!totals[pid] || qi >= upTo || !room.questions[qi] || room.startedAt == null) continue;
    const s = scoreFor(room.questions[qi], qi, room.startedAt, a);
    totals[pid].score += s;
    if (s > 0) totals[pid].correct += 1;
  }
  return Object.entries(totals)
    .map(([pid, v]) => ({ pid, name: players[pid], ...v }))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Per-topic accuracy for one player across all questions. */
export function progress(
  room: Pick<Room, "questions">,
  pid: string,
  answers: Record<string, StoredAnswer>,
) {
  const byTopic: Record<string, { right: number; total: number }> = {};
  const missed: {
    qIndex: number;
    q: string;
    topic: string;
    yours: number | null;
    correct: number;
    options: string[];
    explanation: string;
  }[] = [];
  room.questions.forEach((q, i) => {
    const a = answers[`${pid}:${i}`];
    const t = (byTopic[q.topic] ||= { right: 0, total: 0 });
    t.total += 1;
    if (a && a.choice === q.answerIndex) t.right += 1;
    else
      missed.push({
        qIndex: i,
        q: q.q,
        topic: q.topic,
        yours: a ? a.choice : null,
        correct: q.answerIndex,
        options: q.options,
        explanation: q.explanation,
      });
  });
  const topics = Object.entries(byTopic)
    .map(([topic, v]) => ({ topic, ...v, pct: Math.round((v.right / v.total) * 100) }))
    .sort((a, b) => a.pct - b.pct);
  return { topics, missed };
}
