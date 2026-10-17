import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoom, saveRoom } from "@/lib/redis";
import { START_DELAY_MS } from "@/lib/game";

export const dynamic = "force-dynamic";
const Body = z.object({ hostToken: z.string().min(1) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostToken !== parsed.data.hostToken) {
    return NextResponse.json({ error: "Only the host can start." }, { status: 403 });
  }
  if (room.startedAt == null) {
    room.startedAt = Date.now() + START_DELAY_MS;
    await saveRoom(room);
  }
  return NextResponse.json({ startedAt: room.startedAt });
}
