"use client";

import { useEffect, useState } from "react";

interface Q { q: string; options: string[]; answerIndex: number; explanation: string; topic: string }

const L = ["A", "B", "C", "D"];
const blank = (): Q => ({ q: "", options: ["", "", "", ""], answerIndex: 0, explanation: "", topic: "General" });

export default function QuestionEditor({ code, hostToken, onDone }: {
  code: string; hostToken: string; onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [qs, setQs] = useState<Q[] | null>(null);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch(`/api/rooms/${code}/questions`, { headers: { "x-host-token": hostToken } })
      .then(async (r) => {
        const d = await r.json();
        if (!r.ok) throw new Error(d.error || "Could not load questions");
        setTitle(d.title);
        setQs(d.questions);
      })
      .catch((e) => setErr(e.message));
  }, [code, hostToken]);

  const set = (i: number, patch: Partial<Q>) =>
    setQs((cur) => cur && cur.map((q, k) => (k === i ? { ...q, ...patch } : q)));
  const setOpt = (i: number, o: number, v: string) =>
    setQs((cur) => cur && cur.map((q, k) => (k === i ? { ...q, options: q.options.map((x, j) => (j === o ? v : x)) } : q)));

  async function save() {
    if (!qs) return;
    const bad = qs.findIndex((q) => !q.q.trim() || q.options.some((o) => !o.trim()) || !q.explanation.trim());
    if (bad !== -1) { setErr(`Question ${bad + 1} is incomplete.`); return; }
    setBusy(true);
    setErr("");
    try {
      const r = await fetch(`/api/rooms/${code}/questions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hostToken, title, questions: qs.map((q) => ({ ...q, topic: q.topic.trim() || "General" })) }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error || "Save failed");
      onDone();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Save failed");
      setBusy(false);
    }
  }

  if (!qs) return <p className="font-mono font-bold">{err || "Loading questions…"}</p>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold">Edit questions</h2>
        <span className="font-mono font-bold">{qs.length} Q</span>
      </div>
      <div className="space-y-1">
        <label className="label block" htmlFor="qt">QUIZ TITLE</label>
        <input id="qt" className="field" maxLength={120} value={title} onChange={(e) => setTitle(e.target.value)} />
      </div>

      {qs.map((q, i) => (
        <section key={i} className="block-box space-y-2 bg-white p-3">
          <div className="flex items-center justify-between">
            <span className="label">QUESTION {i + 1}</span>
            <button className="min-h-[44px] border-[3px] border-ink bg-paper px-3 font-mono text-sm font-bold"
              disabled={qs.length <= 1} onClick={() => setQs(qs.filter((_, k) => k !== i))}>
              REMOVE
            </button>
          </div>
          <textarea className="field min-h-[72px] text-base" value={q.q} onChange={(e) => set(i, { q: e.target.value })}
            aria-label={`Question ${i + 1} text`} />
          {q.options.map((o, j) => (
            <div key={j} className="flex items-stretch gap-2">
              <button type="button" aria-label={`Mark ${L[j]} as correct`} aria-pressed={q.answerIndex === j}
                className={`min-h-[48px] w-12 shrink-0 border-[3px] border-ink font-mono text-lg font-extrabold ${q.answerIndex === j ? "bg-lime" : "bg-paper"}`}
                onClick={() => set(i, { answerIndex: j })}>
                {L[j]}
              </button>
              <input className="field text-base" value={o} onChange={(e) => setOpt(i, j, e.target.value)}
                aria-label={`Option ${L[j]}`} />
            </div>
          ))}
          <p className="font-mono text-xs">Lime letter = correct answer. Tap a letter to change it.</p>
          <input className="field text-base" placeholder="One-line explanation" value={q.explanation}
            onChange={(e) => set(i, { explanation: e.target.value })} aria-label="Explanation" />
          <input className="field text-base" placeholder="Topic tag" maxLength={60} value={q.topic}
            onChange={(e) => set(i, { topic: e.target.value })} aria-label="Topic" />
        </section>
      ))}

      <button className="btn w-full bg-cyan" disabled={qs.length >= 30} onClick={() => setQs([...qs, blank()])}>
        Add question
      </button>
      {err && <p role="alert" className="border-[3px] border-ink bg-wrong p-3 font-mono font-bold text-white">{err}</p>}
      <div className="grid grid-cols-2 gap-3">
        <button className="btn bg-paper" onClick={onDone} disabled={busy}>Cancel</button>
        <button className="btn" onClick={save} disabled={busy}>{busy ? "Saving…" : "Save"}</button>
      </div>
    </div>
  );
}
