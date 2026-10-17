import { readFileSync } from "node:fs";
import { pdfToText } from "../src/lib/pdf";
import { generateQuiz } from "../src/lib/gemma";

async function main() {
  const file = process.argv[2];
  if (!file) throw new Error("usage: tsx --env-file=.env.local scripts/test-gemma.ts <file.pdf>");
  const text = await pdfToText(new Uint8Array(readFileSync(file)));
  console.log(`extracted ${text.length} chars`);
  const t0 = Date.now();
  const quiz = await generateQuiz(text);
  console.log(`model ok in ${Date.now() - t0}ms`);
  console.log(JSON.stringify(quiz, null, 2));
}

main().catch((e) => {
  console.error("FAIL:", e.message);
  process.exit(1);
});
