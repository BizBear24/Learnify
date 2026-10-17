"use client";

import { levelInfo } from "@/lib/client";

export default function XpBar({ xp, big = false }: { xp: number; big?: boolean }) {
  const { level, into, toNext, pct } = levelInfo(xp);
  return (
    <div>
      <div className="flex items-end justify-between font-mono font-bold">
        <span className={big ? "text-6xl font-extrabold leading-none" : "text-2xl font-extrabold leading-none"}>LVL {level}</span>
        <span className={big ? "text-lg" : "text-sm"}>{into}/100 XP</span>
      </div>
      <div className={`mt-2 border-[3px] border-ink bg-paper ${big ? "h-9" : "h-6"}`} role="progressbar"
        aria-label="XP to next level" aria-valuenow={into} aria-valuemin={0} aria-valuemax={100}>
        <div className="h-full bg-lime" style={{ width: `${pct}%` }} />
      </div>
      {big && <p className="mt-1 font-mono text-sm font-bold">{toNext} XP TO LEVEL {level + 1}</p>}
    </div>
  );
}
