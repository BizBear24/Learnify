import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnswers, getPlayers, getRoom, saveRoom } from "@/lib/redis";
import { derive } from "@/lib/game";

export const dynamic = "force-dynamic";
const Body = z.object({ hostToken: z.string().min(1), qIndex: z.number().int().min(0) });

// Host-only: end the current answering window early, but only once every player has answered.
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostToken !== parsed.data.hostToken) return NextResponse.json({ error: "Only the host can do this." }, { status: 403 });

  const now = Date.now();
  const d = derive(room, now);
  if (d.phase !== "answer" || d.qIndex !== parsed.data.qIndex || !d.t) {
    return NextResponse.json({ error: "That question isn't open for answers." }, { status: 409 });
  }
  const [players, answers] = await Promise.all([getPlayers(code), getAnswers(code)]);
  const pids = Object.keys(players);
  if (!pids.every((p) => answers[`${p}:${d.qIndex}`])) {
    return NextResponse.json({ error: "Not everyone has answered yet." }, { status: 409 });
  }
  room.skips = { ...(room.skips ?? {}), [d.qIndex]: Math.max(0, Math.round(d.t.answerEnd - now)) + (room.skips?.[d.qIndex] ?? 0) };
  await saveRoom(room);
  return NextResponse.json({ ok: true });
}
