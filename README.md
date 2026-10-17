# Learnify

**Nobody reads the PDF. Everybody plays the quiz.**

Drop in a PDF. Twenty seconds later there's a room code on the screen, ten questions loaded, and your friends are scanning a QR code to get in. Same question, same clock, faster right answers score more.

**Play it now: https://learnifyquiz.vercel.app**

## Why it hits

- **PDF to live game in one drop.** No setup, no accounts, no app to install.
- **The host runs the room.** Edit any question, set 10 to 60 seconds, start when ready. Everyone answered? One tap and you skip the wait.
- **It feels like a game.** Streaks, fastest-answer badges, a live leaderboard, XP and levels.
- **It teaches you back.** A personal SWOT from your own answers, a 3-step study plan, and a simpler explanation for anything you missed.
- **It remembers you.** A dashboard of accuracy and weak topics, saved on your device.

## Under the hood

No websockets. The clock is the game state. Phones ask once a second where the game is, and the server works it out from the start time. Nothing lives in server memory, so it runs on plain serverless.

Answers never leave the server before the reveal. Scores come from server timestamps, never from the browser.

Next.js 14, Tailwind, Upstash Redis, Zod, `unpdf`, and any OpenAI-compatible model. Swap the AI by changing three env vars. It runs on Groq today.

## Run it

```bash
npm install
cp .env.example .env.local   # 5 values, listed inside
npm run dev
```

Deploy with `npx vercel --prod` after adding the same five env vars.

`/demo` spins up a room with no AI call, for when the wifi has other plans.

Text PDFs only, up to 15 pages and 4 MB. Rooms vanish after 6 hours.
