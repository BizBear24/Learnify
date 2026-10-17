# Learnify

Upload a text PDF, get a 10-question multiplayer quiz room and a SWOT of the document.
Next.js 14 (App Router) + Tailwind, Upstash Redis, any OpenAI-compatible LLM. No sockets: the game phase is derived from time, clients poll once a second.

## Setup

```bash
npm install
cp .env.example .env.local   # fill in the 5 values
npm run dev
```

| Var | What |
|---|---|
| `GEMMA_BASE_URL` | OpenAI-compatible base URL (Groq: `https://api.groq.com/openai/v1`) |
| `GEMMA_API_KEY` | provider key |
| `GEMMA_MODEL` | model id (never hardcoded) |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST credentials |

Test the PDF + model step alone:

```bash
npx tsx --env-file=.env.local scripts/test-gemma.ts path/to/file.pdf
```

## How it works

- `POST /api/rooms` (PDF, max 4 MB / 15 pages) extracts text with `unpdf`, asks the model for one JSON object (title, 10 questions with topic tags, SWOT), validates with Zod (one repair retry), stores the room in Redis for 6 h.
- Each question block is 20 s: 15 s answering + 5 s reveal. `qIndex = floor((now - startedAt) / 20000)`.
- Answers and explanations are never sent before a question's reveal window. Answers are stored with `HSETNX` + server time; scores are computed on read.
- Results show the final ranking, a per-topic progress breakdown with weak topics and missed questions, and the SWOT. Past results are kept in the browser's localStorage only (no accounts).
- `/demo` creates a room from a bundled quiz with no AI call (stage fallback).

## Deploy (Vercel)

```bash
npx vercel login
npx vercel link
# add the 5 env vars for production
npx vercel env add GEMMA_BASE_URL production   # repeat for each var
npx vercel --prod
```
