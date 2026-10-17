import { NextResponse } from "next/server";
import { z } from "zod";
import { createRoom, getRoom, saveRoom } from "@/lib/redis";
import { derive } from "@/lib/game";

export const dynamic = "force-dynamic";
const Body = z.object({ hostToken: z.string().min(1) });

// Host-only: fresh room from the same quiz (no AI call). Idempotent.
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const room = await getRoom(params.code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostToken !== parsed.data.hostToken) {
    return NextResponse.json({ error: "Only the host can start a rematch." }, { status: 403 });
  }
  if (derive(room, Date.now()).phase !== "finished") {
    return NextResponse.json({ error: "Game isn't finished yet." }, { status: 409 });
  }
  if (room.nextCode && room.nextHostToken) {
    return NextResponse.json({ code: room.nextCode, hostToken: room.nextHostToken });
  }
  const { title, questions, swot } = room;
  const next = await createRoom({ title, questions, swot });
  room.nextCode = next.code;
  room.nextHostToken = next.hostToken;
  await saveRoom(room);
  return NextResponse.json(next);
}
