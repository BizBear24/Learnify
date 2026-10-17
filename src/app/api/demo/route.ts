import { NextResponse } from "next/server";
import { createRoom } from "@/lib/redis";
import { DEMO_QUIZ } from "@/lib/demo";

export const dynamic = "force-dynamic";

export async function POST() {
  const { code, hostToken } = await createRoom(DEMO_QUIZ);
  return NextResponse.json({ code, hostToken });
}
