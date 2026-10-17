import { QuizSchema, type Quiz } from "./schema";

const SYSTEM =
  "You turn a document into a study quiz and a SWOT. Use ONLY facts in the document. Respond with JSON only.";

const SCHEMA_TEXT = `{
  "title": string,
  "questions": [
    {
      "q": string,
      "options": [string, string, string, string],
      "answerIndex": 0-3,
      "explanation": string (one sentence),
      "topic": string (2-4 word subject tag for the concept tested)
    } x10
  ],
  "swot": {
    "strengths": [string x3-4],
    "weaknesses": [string x3-4],
    "opportunities": [string x3-4],
    "threats": [string x3-4]
  }
}`;

function userPrompt(text: string) {
  return `DOCUMENT:
"""
${text}
"""

Return ONE JSON object matching exactly this schema:
${SCHEMA_TEXT}

Rules:
- Exactly 10 questions, each with exactly 4 options and exactly one correct answer.
- Plausible distractors. Questions vary in difficulty. No "all of the above" / "none of the above".
- Spread answerIndex across 0-3; do not always use the same position.
- Reuse the same topic tag for questions about the same concept so weak areas can be grouped.
- SWOT items are short (under 20 words) and specific to this document, 3 to 4 per list.
- Output JSON only, no prose, no code fences.`;
}

function stripFences(s: string) {
  let t = s.trim();
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const a = t.indexOf("{");
  const b = t.lastIndexOf("}");
  if (a !== -1 && b > a) t = t.slice(a, b + 1);
  return t;
}

type Msg = { role: "system" | "user" | "assistant"; content: string };

async function chat(messages: Msg[]): Promise<string> {
  const base = process.env.GEMMA_BASE_URL;
  const key = process.env.GEMMA_API_KEY;
  const model = process.env.GEMMA_MODEL;
  if (!base || !key || !model) {
    throw new Error("Missing GEMMA_BASE_URL / GEMMA_API_KEY / GEMMA_MODEL");
  }
  const url = base.replace(/\/$/, "") + "/chat/completions";
  const body = {
    model,
    messages,
    temperature: 0.4,
    response_format: { type: "json_object" },
  };
  let res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
    body: JSON.stringify(body),
  });
  if (res.status === 400) {
    // Provider may not support response_format; retry relying on the prompt alone.
    const { response_format: _rf, ...rest } = body;
    void _rf;
    res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${key}` },
      body: JSON.stringify(rest),
    });
  }
  if (!res.ok) {
    throw new Error(`Model API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content;
  if (typeof content !== "string") throw new Error("Model returned no content");
  return content;
}

function tryParse(raw: string): { quiz?: Quiz; error?: string } {
  try {
    const parsed = QuizSchema.safeParse(JSON.parse(stripFences(raw)));
    if (parsed.success) return { quiz: parsed.data };
    return { error: parsed.error.issues.slice(0, 5).map((i) => `${i.path.join(".")}: ${i.message}`).join("; ") };
  } catch (e) {
    return { error: "Invalid JSON: " + (e as Error).message };
  }
}

export async function generateQuiz(text: string): Promise<Quiz> {
  const messages: Msg[] = [
    { role: "system", content: SYSTEM },
    { role: "user", content: userPrompt(text) },
  ];
  const first = await chat(messages);
  const r1 = tryParse(first);
  if (r1.quiz) return r1.quiz;

  const second = await chat([
    ...messages,
    { role: "assistant", content: first },
    {
      role: "user",
      content: `That was invalid (${r1.error}). Return only valid JSON matching the schema exactly:\n${SCHEMA_TEXT}`,
    },
  ]);
  const r2 = tryParse(second);
  if (r2.quiz) return r2.quiz;
  throw new Error("Model output failed validation: " + r2.error);
}
