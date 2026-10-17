import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoom, saveRoom } from "@/lib/redis";

export const dynamic = "force-dynamic";
const Body = z.object({ hostToken: z.string().min(1), answerSec: z.number().int().min(5).max(120) });

// Host-only, before the game starts: seconds allowed to answer each question.
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Time must be 5 to 120 seconds." }, { status: 400 });
  const room = await getRoom(params.code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostToken !== parsed.data.hostToken) return NextResponse.json({ error: "Only the host can change this." }, { status: 403 });
  if (room.startedAt != null) return NextResponse.json({ error: "Game already started." }, { status: 409 });
  room.answerMs = parsed.data.answerSec * 1000;
  await saveRoom(room);
  return NextResponse.json({ answerMs: room.answerMs });
}
