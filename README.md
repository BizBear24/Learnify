# Learnify

Drop in a PDF. Get a live quiz room in about 20 seconds. Friends join with a 5-letter code and race on the same questions at the same time.

**Live: https://learnifyquiz.vercel.app**

## What you get

- **PDF to quiz.** 10 questions, a title and a SWOT of the document, generated in one model call.
- **Multiplayer rooms.** Same question, same clock for everyone. 15 seconds to answer, 5 to reveal. Faster correct answers score more.
- **Host controls.** Only the room owner can start, and they can edit every question first.
- **Results that teach.** Final ranking, weak topics, the questions you missed, per-question room analytics, and the SWOT.
- **Dashboard.** Your accuracy, scores and weak topics over time. No account, it lives on your device.
- **`/demo`.** A ready-made room with no AI call, for when the wifi is bad.

## How it works

No sockets. The game phase is computed from the clock: `qIndex = floor((now - startedAt) / 20000)`. Clients poll once a second and correct for clock skew using the server time.

Answers and explanations never leave the server before a question's reveal window. Scores are computed from stored answers and server timestamps, never from anything the client sends.

Next.js 14, Tailwind, Upstash Redis, Zod, `unpdf`, and any OpenAI-compatible model endpoint.

## Run it

```bash
npm install
cp .env.example .env.local   # fill in 5 values
npm run dev
```

| Variable | |
|---|---|
| `GEMMA_BASE_URL` | OpenAI-compatible base URL, e.g. `https://api.groq.com/openai/v1` |
| `GEMMA_API_KEY` | provider key |
| `GEMMA_MODEL` | model id |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis |

Switch AI provider by changing the first three. No code changes.

Try the model step alone:

```bash
npx tsx --env-file=.env.local scripts/test-gemma.ts file.pdf
```

## Deploy

```bash
npx vercel login
npx vercel link
npx vercel env add GEMMA_BASE_URL production   # repeat for all 5
npx vercel --prod
```

## Limits

Text PDFs only (no scanned pages), up to 15 pages and 4 MB. Rooms expire after 6 hours.
