"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, joinRoom, saveSession } from "@/lib/client";

export default function Demo() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function go() {
    setBusy(true);
    setErr("");
    try {
      const r = await api<{ code: string; hostToken: string }>("/api/demo", {});
      saveSession(r.code, { hostToken: r.hostToken });
      await joinRoom(r.code, name.trim());
      router.push(`/room/${r.code}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-5xl font-bold leading-none">Demo room</h1>
      <p className="text-lg">A ready-made quiz with no AI call. Same game, same SWOT.</p>
      <div className="block-box space-y-3 bg-cyan p-4">
        <label className="label block" htmlFor="n">YOUR NICKNAME</label>
        <input id="n" className="field" maxLength={20} value={name} onChange={(e) => setName(e.target.value)} />
        <button className="btn w-full" disabled={!name.trim() || busy} onClick={go}>
          {busy ? "Creating…" : "Create demo room"}
        </button>
      </div>
      {err && <p role="alert" className="border-[3px] border-ink bg-wrong p-3 font-mono font-bold text-white">{err}</p>}
    </div>
  );
}
