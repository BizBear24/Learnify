"use client";

import { useEffect, useState } from "react";
import { loadHistory, type HistoryItem } from "@/lib/client";
import { BarChart, HBars, Stat } from "@/components/Charts";

export default function Dashboard() {
  const [hist, setHist] = useState<HistoryItem[] | null>(null);
  useEffect(() => setHist(loadHistory()), []);

  if (!hist) return null;

  if (hist.length === 0) {
    return (
      <div className="space-y-4">
        <h1 className="text-5xl font-bold leading-none">Dashboard</h1>
        <p className="block-box bg-white p-4 text-lg">
          No games on this device yet. Finish a quiz and your accuracy, streaks and weak topics show up here.
        </p>
        <a href="/demo" className="btn w-full">Play the demo</a>
        <a href="/" className="btn w-full bg-paper">Home</a>
      </div>
    );
  }

  const games = [...hist].sort((a, b) => a.at - b.at);
  const right = games.reduce((a, g) => a + g.correct, 0);
  const total = games.reduce((a, g) => a + g.total, 0);
  const accuracy = total ? Math.round((right / total) * 100) : 0;
  const best = Math.max(...games.map((g) => g.score));
  const avg = Math.round(games.reduce((a, g) => a + g.score, 0) / games.length);

  const byTopic: Record<string, { right: number; total: number }> = {};
  for (const g of games) {
    for (const t of g.topics ?? []) {
      const x = (byTopic[t.topic] ||= { right: 0, total: 0 });
      x.right += t.right;
      x.total += t.total;
    }
  }
  const topics = Object.entries(byTopic)
    .map(([label, v]) => ({ label, pct: Math.round((v.right / v.total) * 100), note: `${v.right}/${v.total}` }))
    .sort((a, b) => a.pct - b.pct)
    .slice(0, 10);
  const focus = topics.filter((t) => t.pct < 60).slice(0, 3);

  return (
    <div className="space-y-5">
      <h1 className="text-5xl font-bold leading-none">Dashboard</h1>
      <p className="font-mono text-sm font-bold">REAL RESULTS FROM THIS DEVICE. NO ACCOUNT NEEDED.</p>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="GAMES" value={games.length} bg="bg-cyan" />
        <Stat label="ACCURACY" value={`${accuracy}%`} bg="bg-lime" />
        <Stat label="BEST SCORE" value={best} />
        <Stat label="AVG SCORE" value={avg} />
      </div>

      <section className="block-box space-y-2 bg-white p-4">
        <h2 className="text-2xl font-bold">Accuracy per game</h2>
        <BarChart data={games.slice(-12).map((g, i) => ({
          label: `G${i + 1}`,
          value: g.total ? Math.round((g.correct / g.total) * 100) : 0,
        }))} />
      </section>

      {topics.length > 0 && (
        <section className="block-box space-y-3 bg-white p-4">
          <h2 className="text-2xl font-bold">Topic mastery</h2>
          <HBars data={topics} />
        </section>
      )}

      {focus.length > 0 && (
        <section className="block-box bg-lime p-4">
          <h2 className="mb-1 text-2xl font-bold">Focus next</h2>
          <ul className="list-disc space-y-1 pl-5 font-bold">
            {focus.map((f) => <li key={f.label}>{f.label} ({f.pct}%)</li>)}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-2xl font-bold">Reviews</h2>
        {[...games].reverse().slice(0, 10).map((g) => (
          <details key={g.code + g.at} className="block-box bg-white">
            <summary className="flex min-h-[48px] cursor-pointer items-center justify-between gap-3 p-3 font-bold">
              <span className="truncate">{g.title}</span>
              <span className="shrink-0 font-mono text-sm">{g.correct}/{g.total} · {g.score}</span>
            </summary>
            {g.swot ? (
              <div className="grid gap-3 border-t-[3px] border-ink p-3 sm:grid-cols-2">
                {([
                  ["Strengths", g.swot.strengths, "bg-lime"],
                  ["Weaknesses", g.swot.weaknesses, "bg-cyan"],
                  ["Opportunities", g.swot.opportunities, "bg-paper"],
                  ["Threats", g.swot.threats, "bg-paper"],
                ] as const).map(([h, items, bg]) => (
                  <div key={h} className={`border-[3px] border-ink p-3 ${bg}`}>
                    <h3 className="font-bold">{h}</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                      {items.map((x, i) => <li key={i}>{x}</li>)}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="border-t-[3px] border-ink p-3 font-mono text-sm">No SWOT saved for this game.</p>
            )}
          </details>
        ))}
      </section>

      <a href="/profile" className="btn w-full bg-cyan">Profile</a>
      <a href="/" className="btn w-full">New game</a>
    </div>
  );
}
