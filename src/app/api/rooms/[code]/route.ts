import { NextResponse } from "next/server";
import { getAnswers, getPlayers, getRoom } from "@/lib/redis";
import { ANSWER_MS, BLOCK_MS, analytics, derive, leaderboard, progress } from "@/lib/game";

export const dynamic = "force-dynamic";

export async function GET(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const pid = new URL(req.url).searchParams.get("pid") ?? "";
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found" }, { status: 404 });

  const now = Date.now();
  const players = await getPlayers(code);
  const { phase, qIndex, into } = derive(room, now);
  const base = {
    now,
    code,
    title: room.title,
    phase,
    startedAt: room.startedAt,
    total: room.questions.length,
    blockMs: BLOCK_MS,
    answerMs: ANSWER_MS,
    players: Object.values(players),
    me: players[pid] ?? null,
  };

  if (phase === "lobby" || phase === "countdown") {
    return NextResponse.json(base);
  }

  const answers = await getAnswers(code);

  if (phase === "finished") {
    return NextResponse.json({
      ...base,
      leaderboard: leaderboard(room, players, answers, room.questions.length),
      swot: room.swot,
      nextCode: room.nextCode ?? null,
      analytics: analytics(room, players, answers),
      myProgress: players[pid] ? progress(room, pid, answers) : null,
    });
  }

  const q = room.questions[qIndex];
  const mine = answers[`${pid}:${qIndex}`];
  const reveal = phase === "reveal";
  return NextResponse.json({
    ...base,
    qIndex,
    msIntoBlock: into,
    question: { q: q.q, options: q.options, topic: q.topic },
    myChoice: mine ? mine.choice : null,
    // Secrecy: answer + explanation only once this question's reveal window opens.
    ...(reveal ? { answerIndex: q.answerIndex, explanation: q.explanation } : {}),
    // Scores only count questions whose reveal has started, so they can't leak answers.
    leaderboard: leaderboard(room, players, answers, reveal ? qIndex + 1 : qIndex),
  });
}
