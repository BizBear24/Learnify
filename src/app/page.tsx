"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, joinRoom, saveSession, loadHistory, loadProfile, type HistoryItem } from "@/lib/client";
import XpBar from "@/components/XpBar";

export default function Home() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState<"" | "upload" | "join">("");
  const [err, setErr] = useState("");
  const [hist, setHist] = useState<HistoryItem[]>([]);
  const [xp, setXp] = useState(0);

  useEffect(() => {
    setHist(loadHistory());
    setXp(loadProfile().xp);
    const c = new URLSearchParams(window.location.search).get("code");
    if (c) setCode(c.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 5));
  }, []);

  const nameOk = name.trim().length > 0;

  async function upload() {
    if (!file || !nameOk) return;
    setErr("");
    setBusy("upload");
    try {
      const fd = new FormData();
      fd.set("file", file);
      const r = await api<{ code: string; hostToken: string }>("/api/rooms", undefined, fd);
      saveSession(r.code, { hostToken: r.hostToken });
      await joinRoom(r.code, name.trim());
      router.push(`/room/${r.code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy("");
    }
  }

  async function join() {
    if (code.length !== 5 || !nameOk) return;
    setErr("");
    setBusy("join");
    try {
      await joinRoom(code, name.trim());
      router.push(`/room/${code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Something went wrong");
      setBusy("");
    }
  }

  const weak = Array.from(new Set(hist.flatMap((h) => h.weak))).slice(0, 5);

  return (
    <div className="space-y-6">
      <h1 className="text-6xl font-bold leading-[0.9] tracking-tight">
        Learnify<span className="bg-lime px-1">.</span>
      </h1>
      {xp > 0 && (
        <a href="/profile" className="block-box block bg-white p-3" aria-label="Open your profile">
          <XpBar xp={xp} />
        </a>
      )}
      <p className="max-w-md text-xl">Drop a PDF. Get a live quiz room. Race your friends.</p>

      <section className="block-box space-y-2 bg-white p-4">
        <label className="label" htmlFor="nick">YOUR NICKNAME</label>
        <input id="nick" className="field" maxLength={20} value={name}
          onChange={(e) => setName(e.target.value)} placeholder="Ada" autoComplete="nickname" />
      </section>

      <section className="block-box space-y-3 bg-lime p-4">
        <h2 className="text-3xl font-bold">Upload a PDF</h2>
        <p className="font-mono text-sm">Text PDF, max 15 pages, max 4 MB.</p>
        <label className="label block" htmlFor="pdf">CHOOSE FILE</label>
        <input id="pdf" type="file" accept="application/pdf"
          className="field bg-paper file:mr-3 file:border-[3px] file:border-ink file:bg-cyan file:px-3 file:py-1 file:font-mono file:font-bold"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        <button className="btn w-full bg-paper" disabled={!file || !nameOk || !!busy} onClick={upload}>
          {busy === "upload" ? "Reading + generating… ~20s" : "Make quiz room"}
        </button>
      </section>

      <section className="block-box space-y-3 bg-cyan p-4">
        <h2 className="text-3xl font-bold">Join a room</h2>
        <label className="label block" htmlFor="code">ROOM CODE</label>
        <input id="code" className="field text-center text-3xl font-extrabold uppercase tracking-[0.3em]"
          maxLength={5} value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z]/g, ""))}
          placeholder="ABCDE" autoCapitalize="characters" />
        <button className="btn w-full" disabled={code.length !== 5 || !nameOk || !!busy} onClick={join}>
          {busy === "join" ? "Joining…" : "Join"}
        </button>
      </section>

      {err && (
        <p role="alert" className="border-[3px] border-ink bg-wrong p-3 font-mono font-bold text-white shadow-hard">
          {err}
        </p>
      )}

      {hist.length > 0 && (
        <section className="block-box bg-white p-4">
          <h2 className="mb-2 text-2xl font-bold">Your progress</h2>
          <ul className="divide-y-[3px] divide-ink border-y-[3px] border-ink">
            {hist.slice(0, 5).map((h) => (
              <li key={h.code} className="flex items-baseline justify-between gap-3 py-2">
                <span className="truncate font-bold">{h.title}</span>
                <span className="shrink-0 font-mono text-sm">{h.correct}/{h.total} · {h.score}</span>
              </li>
            ))}
          </ul>
          <a href="/dashboard" className="btn mt-3 w-full">Open dashboard</a>
          {weak.length > 0 && (
            <p className="mt-2 font-mono text-sm"><b>WEAK TOPICS:</b> {weak.join(" · ")}</p>
          )}
        </section>
      )}

      <p className="font-mono text-sm">
        No PDF handy? <a className="font-bold underline" href="/demo">Try the demo room</a>
      </p>
    </div>
  );
}
