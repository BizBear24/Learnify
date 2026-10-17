import { NextResponse } from "next/server";
import { z } from "zod";
import { getPlayers, getRoom, putAnswer } from "@/lib/redis";
import { derive } from "@/lib/game";

export const dynamic = "force-dynamic";
const Body = z.object({
  pid: z.string().min(1),
  qIndex: z.number().int().min(0),
  choice: z.number().int().min(0).max(3),
});

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { pid, qIndex, choice } = parsed.data;
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  const players = await getPlayers(code);
  if (!players[pid]) return NextResponse.json({ error: "Unknown player." }, { status: 403 });

  const now = Date.now();
  const d = derive(room, now);
  if (d.phase !== "answer" || d.qIndex !== qIndex) {
    return NextResponse.json({ error: "Answering window closed." }, { status: 409 });
  }
  const first = await putAnswer(code, pid, qIndex, { choice, t: now });
  if (!first) return NextResponse.json({ error: "Already answered." }, { status: 409 });
  return NextResponse.json({ ok: true });
}
