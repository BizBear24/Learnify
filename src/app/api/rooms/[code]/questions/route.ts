import { NextResponse } from "next/server";
import { z } from "zod";
import { getRoom, saveRoom } from "@/lib/redis";
import { QuestionSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";

const Body = z.object({
  hostToken: z.string().min(1),
  title: z.string().trim().min(1).max(120),
  questions: z.array(QuestionSchema).min(1).max(30),
});

// Host-only: read the full quiz (with answers) to edit it. Token travels in a header, not the URL.
export async function GET(req: Request, { params }: { params: { code: string } }) {
  const room = await getRoom(params.code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (req.headers.get("x-host-token") !== room.hostToken) {
    return NextResponse.json({ error: "Only the host can edit." }, { status: 403 });
  }
  return NextResponse.json({ title: room.title, questions: room.questions, started: room.startedAt != null });
}

// Host-only, and only before the game starts.
export async function PUT(req: Request, { params }: { params: { code: string } }) {
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Each question needs text, 4 options, a correct answer and an explanation." }, { status: 400 });
  }
  const room = await getRoom(params.code.toUpperCase());
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  if (room.hostToken !== parsed.data.hostToken) {
    return NextResponse.json({ error: "Only the host can edit." }, { status: 403 });
  }
  if (room.startedAt != null) {
    return NextResponse.json({ error: "Game already started." }, { status: 409 });
  }
  room.title = parsed.data.title;
  room.questions = parsed.data.questions;
  await saveRoom(room);
  return NextResponse.json({ ok: true, count: room.questions.length });
}
