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

/** Room-wide analytics from real stored answers. */
export function analytics(
  room: Pick<Room, "startedAt" | "questions">,
  players: Record<string, string>,
  answers: Record<string, StoredAnswer>,
) {
  const n = Object.keys(players).length;
  const perQuestion = room.questions.map((q, i) => {
    let right = 0, answered = 0, ms = 0;
    for (const pid of Object.keys(players)) {
      const a = answers[`${pid}:${i}`];
      if (!a) continue;
      answered += 1;
      ms += Math.max(0, a.t - ((room.startedAt ?? 0) + i * BLOCK_MS));
      if (a.choice === q.answerIndex) right += 1;
    }
    return {
      qIndex: i,
      topic: q.topic,
      pctCorrect: n ? Math.round((right / n) * 100) : 0,
      answered,
      avgSec: answered ? Math.round((ms / answered / 1000) * 10) / 10 : null,
    };
  });
  const totalAnswers = perQuestion.reduce((a, p) => a + p.answered, 0);
  const totalRight = perQuestion.reduce((a, p) => a + Math.round((p.pctCorrect / 100) * n), 0);
  return {
    players: n,
    participation: n && room.questions.length ? Math.round((totalAnswers / (n * room.questions.length)) * 100) : 0,
    accuracy: totalAnswers ? Math.round((totalRight / totalAnswers) * 100) : 0,
    perQuestion,
  };
}

/** Reveal-time badges for one player and the question being revealed. */
export function badges(
  room: Pick<Room, "startedAt" | "questions">,
  players: Record<string, string>,
  answers: Record<string, StoredAnswer>,
  pid: string,
  qIndex: number,
) {
  let streak = 0;
  for (let i = qIndex; i >= 0; i--) {
    const a = answers[`${pid}:${i}`];
    if (a && a.choice === room.questions[i].answerIndex) streak += 1;
    else break;
  }
  let best: { pid: string; t: number } | null = null;
  for (const p of Object.keys(players)) {
    const a = answers[`${p}:${qIndex}`];
    if (a && a.choice === room.questions[qIndex].answerIndex && (!best || a.t < best.t)) best = { pid: p, t: a.t };
  }
  const start = (room.startedAt ?? 0) + qIndex * BLOCK_MS;
  return {
    streak,
    fastest: best
      ? { name: players[best.pid], sec: Math.round(((best.t - start) / 1000) * 10) / 10, you: best.pid === pid }
      : null,
  };
}

/** A player's own SWOT, derived only from their stored answers. No AI. */
export function playerSwot(
  room: Pick<Room, "startedAt" | "questions">,
  pid: string,
  answers: Record<string, StoredAnswer>,
) {
  const n = room.questions.length;
  const { topics } = progress(room, pid, answers);
  let right = 0, unanswered = 0, wrongFast = 0, fastRight = 0, bestStreak = 0, run = 0, ms = 0, answered = 0;
  room.questions.forEach((q, i) => {
    const a = answers[`${pid}:${i}`];
    if (!a) { unanswered += 1; run = 0; return; }
    const sec = Math.max(0, a.t - ((room.startedAt ?? 0) + i * BLOCK_MS)) / 1000;
    answered += 1;
    ms += sec;
    if (a.choice === q.answerIndex) {
      right += 1; run += 1; bestStreak = Math.max(bestStreak, run);
      if (sec <= 5) fastRight += 1;
    } else {
      run = 0;
      if (sec <= 3) wrongFast += 1;
    }
  });
  const avg = answered ? ms / answered : 0;
  const wrong = answered - right;

  const strengths: string[] = [];
  const weaknesses: string[] = [];
  const opportunities: string[] = [];
  const threats: string[] = [];

  for (const t of topics.filter((t) => t.pct >= 70).slice(-2).reverse()) strengths.push(`Solid on ${t.topic}: ${t.right}/${t.total} right.`);
  if (bestStreak >= 2) strengths.push(`Best streak: ${bestStreak} correct in a row.`);
  if (fastRight > 0) strengths.push(`${fastRight} correct answer${fastRight > 1 ? "s" : ""} in under 5 seconds.`);
  if (strengths.length === 0) strengths.push(`You answered ${answered} of ${n} questions.`);

  for (const t of topics.filter((t) => t.pct < 60).slice(0, 3)) weaknesses.push(`${t.topic}: only ${t.right}/${t.total} right.`);
  if (wrong > 0) weaknesses.push(`${wrong} wrong answer${wrong > 1 ? "s" : ""} to review.`);
  if (weaknesses.length === 0) weaknesses.push("No clear weak spot this round.");

  for (const t of topics.filter((t) => t.pct >= 60 && t.pct < 100).slice(0, 2)) opportunities.push(`Close on ${t.topic} (${t.right}/${t.total}). One more right masters it.`);
  if (wrong > 0) opportunities.push("Reviewing your missed questions is the fastest way to gain points.");
  if (unanswered > 0) opportunities.push(`${unanswered} unanswered question${unanswered > 1 ? "s" : ""} are points left on the table.`);
  if (opportunities.length === 0) opportunities.push("Try a harder document to keep improving.");

  if (unanswered > 0) threats.push(`${unanswered} question${unanswered > 1 ? "s" : ""} timed out with no answer.`);
  if (avg > 10) threats.push(`Slow answers (${avg.toFixed(1)}s on average) cost speed points.`);
  if (wrongFast > 0) threats.push(`${wrongFast} wrong answer${wrongFast > 1 ? "s" : ""} in under 3 seconds. Possible guessing.`);
  for (const t of topics.filter((t) => t.pct === 0).slice(0, 2)) threats.push(`Zero right on ${t.topic}. It could cost you again.`);
  if (threats.length === 0) threats.push("No big risks showed up this round.");

  return {
    strengths: strengths.slice(0, 4),
    weaknesses: weaknesses.slice(0, 4),
    opportunities: opportunities.slice(0, 4),
    threats: threats.slice(0, 4),
  };
}
