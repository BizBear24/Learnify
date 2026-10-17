import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlayers, getRoom, redis, TTL } from "@/lib/redis";
import { derive } from "@/lib/game";
import { askText } from "@/lib/gemma";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
const Body = z.object({ pid: z.string().min(1), qIndex: z.number().int().min(0) });

// On click only, after the game is over (answers are public by then). Cached per question.
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { pid, qIndex } = parsed.data;
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (!(await getPlayers(code))[pid]) return NextResponse.json({ error: "Unknown player." }, { status: 403 });
  if (derive(room, Date.now()).phase !== "finished") {
    return NextResponse.json({ error: "Finish the game first." }, { status: 409 });
  }
  const q = room.questions[qIndex];
  if (!q) return NextResponse.json({ error: "No such question." }, { status: 404 });

  const key = `explain:${code}:${qIndex}`;
  const cached = await redis().get<string>(key);
  if (cached) return NextResponse.json({ text: cached });

  const prompt = `Question: ${q.q}
Correct answer: ${q.options[q.answerIndex]}
Original explanation: ${q.explanation}

Explain this again for someone who got it wrong. Use plain words and, if it helps, one short everyday analogy. Maximum 3 sentences. Do not add facts beyond the original explanation.`;
  try {
    const text = await askText("You are a friendly tutor. Be simple and brief.", prompt);
    await redis().set(key, text, { ex: TTL });
    return NextResponse.json({ text });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not explain right now. Try again." }, { status: 502 });
  }
}
