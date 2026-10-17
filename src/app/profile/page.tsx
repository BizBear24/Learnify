"use client";

import { useEffect, useState } from "react";
import { loadHistory, loadProfile, XP_PER_CORRECT, type HistoryItem, type Profile } from "@/lib/client";
import XpBar from "@/components/XpBar";
import { Stat } from "@/components/Charts";

export default function ProfilePage() {
  const [p, setP] = useState<Profile | null>(null);
  const [hist, setHist] = useState<HistoryItem[]>([]);
  useEffect(() => {
    setP(loadProfile());
    setHist(loadHistory());
  }, []);
  if (!p) return null;

  const correct = hist.reduce((a, g) => a + g.correct, 0);
  return (
    <div className="space-y-5">
      <h1 className="text-5xl font-bold leading-none">{p.name || "Your profile"}</h1>

      <section className="block-box bg-lime p-4">
        <XpBar xp={p.xp} big />
      </section>

      <div className="grid grid-cols-2 gap-3">
        <Stat label="TOTAL XP" value={p.xp} bg="bg-cyan" />
        <Stat label="GAMES" value={p.awarded.length} />
      </div>

      <p className="block-box bg-white p-3 font-mono text-sm font-bold">
        EACH CORRECT ANSWER = {XP_PER_CORRECT} XP. EVERY 100 XP = 1 LEVEL.
        {hist.length > 0 && ` YOU HAVE ${correct} RECENT CORRECT ANSWERS.`}
      </p>

      <a href="/dashboard" className="btn w-full bg-cyan">Dashboard</a>
      <a href="/" className="btn w-full">Play</a>
    </div>
  );
}
