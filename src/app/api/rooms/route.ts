import { NextResponse } from "next/server";
import { pdfToText, PdfError } from "@/lib/pdf";
import { generateQuiz } from "@/lib/gemma";
import { createRoom } from "@/lib/redis";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Attach a PDF file." }, { status: 400 });
    }
    const text = await pdfToText(new Uint8Array(await file.arrayBuffer()));
    const quiz = await generateQuiz(text);
    const { code, hostToken } = await createRoom(quiz);
    return NextResponse.json({ code, hostToken });
  } catch (e) {
    if (e instanceof PdfError) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
    console.error(e);
    return NextResponse.json(
      { error: "Could not generate the quiz. Try again." },
      { status: 502 },
    );
  }
}
