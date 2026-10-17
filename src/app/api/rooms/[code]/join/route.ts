import { NextResponse } from "next/server";
import { z } from "zod";
import { addPlayer, getPlayers, getRoom } from "@/lib/redis";

export const dynamic = "force-dynamic";
const Body = z.object({ name: z.string().trim().min(1).max(20) });

export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Enter a nickname (max 20)." }, { status: 400 });
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.startedAt != null) return NextResponse.json({ error: "Game already started." }, { status: 409 });
  if (Object.keys(await getPlayers(code)).length >= 50) {
    return NextResponse.json({ error: "Room is full." }, { status: 409 });
  }
  const { pid, name } = await addPlayer(code, parsed.data.name);
  return NextResponse.json({ pid, name });
}
