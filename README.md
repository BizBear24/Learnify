# Learnify

You have a PDF you're supposed to study. Your friends have the same one. Nobody wants to read it.

Drop it in, and about twenty seconds later you have a quiz room with a five-letter code. Everyone joins from their phone, sees the same question at the same moment, and races. Faster right answers score more.

**Try it: https://learnifyquiz.vercel.app**

## What it does

- Turns a text PDF into 10 multiple-choice questions and a SWOT of the document.
- Runs the quiz live: 15 seconds to answer, 5 to see the right answer and why.
- Lets the host fix the questions before starting. Only the host can start.
- Shows a QR code in the lobby, so people can scan instead of typing the code.
- Shows streaks and who answered fastest as the game goes.
- Ends with a leaderboard, what each room found hard, and what you personally got wrong.
- Gives you a 3-step study plan and a simpler explanation of any question you missed, if you ask for them.
- Has a dashboard that tracks your accuracy and weak topics over time.
- Has a rematch button, and a `/demo` room that skips the AI for when the wifi gives up.

No accounts. Your history stays in your own browser.

## How it works

There are no websockets. The server never pushes anything. Every phone just asks once a second what time it is in the game, and the answer comes from one formula:

`question = floor((now - startedAt) / 20000)`

That is the whole multiplayer engine. It also means nothing lives in server memory, so it runs on Vercel's serverless functions without any tricks.

The right answer never leaves the server until that question's reveal window opens. Scores come from stored answers and server timestamps, never from anything the browser claims.

Built with Next.js 14, Tailwind, Upstash Redis, Zod, `unpdf`, and any OpenAI-compatible model API. It runs on Groq right now.

## Run it yourself

```bash
npm install
cp .env.example .env.local
npm run dev
```

Fill in `.env.local`:

| Variable | What it is |
|---|---|
| `GEMMA_BASE_URL` | Any OpenAI-compatible endpoint, e.g. `https://api.groq.com/openai/v1` |
| `GEMMA_API_KEY` | Your key for it |
| `GEMMA_MODEL` | The model name. Nothing is hardcoded |
| `UPSTASH_REDIS_REST_URL` | From a free Upstash Redis database |
| `UPSTASH_REDIS_REST_TOKEN` | Same place |

Want a different AI provider? Change the first three. That's it.

To test just the PDF-to-quiz step:

```bash
npx tsx --env-file=.env.local scripts/test-gemma.ts yourfile.pdf
```

## Deploy

```bash
npx vercel login
npx vercel link
npx vercel env add GEMMA_BASE_URL production   # do this for all five
npx vercel --prod
```

## Know the limits

- Text PDFs only. Scanned pages have no text to read, and the app will say so.
- Up to 15 pages and 4 MB.
- Rooms disappear after 6 hours.
- The dashboard only knows about games played on the device you're using.
