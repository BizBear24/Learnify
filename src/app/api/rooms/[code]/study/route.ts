import { NextResponse } from "next/server";
import { z } from "zod";
import { getAnswers, getPlayers, getRoom, redis, TTL } from "@/lib/redis";
import { derive, progress } from "@/lib/game";
import { askText } from "@/lib/gemma";

export const maxDuration = 30;
export const dynamic = "force-dynamic";
const Body = z.object({ pid: z.string().min(1) });

// On click only. Built from the player's own stored answers; cached per player so it can't be spammed.
export async function POST(req: Request, { params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const parsed = Body.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Bad request." }, { status: 400 });
  const { pid } = parsed.data;
  const room = await getRoom(code);
  if (!room) return NextResponse.json({ error: "Room not found." }, { status: 404 });
  const players = await getPlayers(code);
  if (!players[pid]) return NextResponse.json({ error: "Unknown player." }, { status: 403 });
  if (derive(room, Date.now()).phase !== "finished") {
    return NextResponse.json({ error: "Finish the game first." }, { status: 409 });
  }
  const key = `study:${code}:${pid}`;
  const cached = await redis().get<{ steps: { title: string; detail: string }[] }>(key);
  if (cached) return NextResponse.json(cached);

  const { topics, missed } = progress(room, pid, await getAnswers(code));
  const weak = topics.filter((t) => t.pct < 100).map((t) => `${t.topic} (${t.right}/${t.total})`);
  if (missed.length === 0) {
    const done = { steps: [{ title: "Nothing to fix", detail: "You got every question right. Try a harder document next." }] };
    return NextResponse.json(done);
  }
  const prompt = `Quiz title: ${room.title}
Weak topics: ${weak.join(", ")}
Questions the learner missed:
${missed.slice(0, 8).map((m, i) => `${i + 1}. ${m.q} Correct: ${m.options[m.correct]}. Why: ${m.explanation}`).join("\n")}

Write a 3-step revision plan for this learner. Reply with exactly 3 lines, no extra text, each line in the form:
Short step title | One concrete sentence on what to do (under 25 words)`;
  let text: string;
  try {
    text = await askText("You are a concise study coach. Use only the material given.", prompt);
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not build a plan. Try again." }, { status: 502 });
  }
  const steps = text
    .split("\n")
    .map((l) => l.replace(/^\s*(?:\d+[.)]|[-*])\s*/, "").trim())
    .filter((l) => l.includes("|"))
    .slice(0, 3)
    .map((l) => {
      const [t, ...d] = l.split("|");
      return { title: t.trim(), detail: d.join("|").trim() };
    });
  if (steps.length === 0) return NextResponse.json({ error: "Could not build a plan. Try again." }, { status: 502 });
  const out = { steps };
  await redis().set(key, out, { ex: TTL });
  return NextResponse.json(out);
}
