"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, joinRoom, loadSession, pushHistory, saveSession } from "@/lib/client";
import QuestionEditor from "@/components/QuestionEditor";
import JoinQR from "@/components/JoinQR";
import { BarChart, Stat } from "@/components/Charts";

interface LB { pid: string; name: string; score: number; correct: number }
interface Swot { strengths: string[]; weaknesses: string[]; opportunities: string[]; threats: string[] }
interface Missed { qIndex: number; q: string; topic: string; yours: number | null; correct: number; options: string[]; explanation: string }
interface State {
  now: number; code: string; title: string;
  phase: "lobby" | "countdown" | "answer" | "reveal" | "finished";
  startedAt: number | null; total: number; blockMs: number; answerMs: number;
  players: string[]; me: string | null;
  qIndex?: number;
  badges?: { streak: number; fastest: { name: string; sec: number; you: boolean } | null };
  question?: { q: string; options: string[]; topic: string };
  myChoice?: number | null; answerIndex?: number; explanation?: string;
  nextCode?: string | null;
  leaderboard?: LB[]; swot?: Swot;
  analytics?: { players: number; participation: number; accuracy: number; perQuestion: { qIndex: number; topic: string; pctCorrect: number; answered: number; avgSec: number | null }[] };
  myProgress?: { topics: { topic: string; right: number; total: number; pct: number }[]; missed: Missed[] } | null;
}

const L = ["A", "B", "C", "D"];

export default function Room({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  const [s, setS] = useState<State | null>(null);
  const [err, setErr] = useState("");
  const [pid, setPid] = useState("");
  const [hostToken, setHostToken] = useState("");
  const [ready, setReady] = useState(false);
  const [picked, setPicked] = useState<{ q: number; c: number } | null>(null);
  const [tick, setTick] = useState(0);
  const offset = useRef(0);
  const [nick, setNick] = useState("");
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    const ses = loadSession(code);
    setPid(ses.pid ?? "");
    setHostToken(ses.hostToken ?? "");
    setReady(true);
  }, [code]);

  const poll = useCallback(async () => {
    try {
      const t0 = Date.now();
      const d = await api<State>(`/api/rooms/${code}?pid=${pid}`);
      const t1 = Date.now();
      offset.current = d.now - (t0 + t1) / 2; // server - client, corrects skew
      setS(d);
      setErr("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Connection lost");
    }
  }, [code, pid]);

  useEffect(() => {
    if (!ready) return;
    poll();
    const id = setInterval(poll, 1000);
    return () => clearInterval(id);
  }, [ready, poll]);

  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 100);
    return () => clearInterval(id);
  }, []);

  // Save progress locally when the game ends
  const saved = useRef(false);
  useEffect(() => {
    if (s?.phase !== "finished" || saved.current || !s.leaderboard) return;
    saved.current = true;
    const mine = s.leaderboard.find((x) => x.pid === pid);
    if (!mine) return;
    pushHistory({
      code, title: s.title, at: Date.now(), score: mine.score, correct: mine.correct, total: s.total,
      weak: (s.myProgress?.topics ?? []).filter((t) => t.pct < 60).map((t) => t.topic).slice(0, 3),
      topics: (s.myProgress?.topics ?? []).map(({ topic, right, total }) => ({ topic, right, total })),
    });
  }, [s, pid, code]);

  const nowSrv = () => Date.now() + offset.current;
  void tick;

  async function start() {
    try { await api(`/api/rooms/${code}/start`, { hostToken }); poll(); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  async function answer(qIndex: number, choice: number) {
    if (picked?.q === qIndex) return;
    setPicked({ q: qIndex, c: choice });
    try { await api(`/api/rooms/${code}/answer`, { pid, qIndex, choice }); }
    catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }
  async function late() {
    try {
      await joinRoom(code, nick.trim());
      setPid(loadSession(code).pid ?? "");
    } catch (e) { setErr(e instanceof Error ? e.message : "Failed"); }
  }

  if (!ready) return null;
  if (!s) {
    return <p className="font-mono text-xl font-bold">{err || "Loading room…"}</p>;
  }

  const isHost = !!hostToken;
  const joined = !!s.me;

  if (!joined && s.phase === "lobby") {
    return (
      <div className="space-y-4">
        <Code code={code} />
        <div className="block-box space-y-3 bg-cyan p-4">
          <label className="label block" htmlFor="jn">PICK A NICKNAME</label>
          <input id="jn" className="field" maxLength={20} value={nick} onChange={(e) => setNick(e.target.value)} />
          <button className="btn w-full" disabled={!nick.trim()} onClick={late}>Join</button>
        </div>
        <Err msg={err} />
      </div>
    );
  }
  if (!joined && s.phase !== "finished") {
    return <p className="block-box bg-white p-4 font-mono font-bold">This game already started. Ask the host for a new room.</p>;
  }

  return (
    <div className="space-y-5">
      <Err msg={err} />
      {s.phase === "lobby" && editing && isHost && (
        <QuestionEditor code={code} hostToken={hostToken} onDone={() => { setEditing(false); poll(); }} />
      )}
      {s.phase === "lobby" && !editing && (
        <>
          <Code code={code} />
          <JoinQR code={code} />
          <p className="text-2xl font-bold">{s.title} <span className="font-mono text-base">({s.total} Q)</span></p>
          <section className="block-box bg-white p-4">
            <h2 className="label mb-2">PLAYERS ({s.players.length})</h2>
            <ul className="divide-y-[3px] divide-ink border-y-[3px] border-ink">
              {s.players.map((n, i) => (
                <li key={i} className="py-2 text-xl font-bold">{n}{n === s.me && <span className="ml-2 font-mono text-sm">(YOU)</span>}</li>
              ))}
            </ul>
          </section>
          {isHost ? (
            <div className="space-y-3">
              <button className="btn w-full bg-cyan" onClick={() => setEditing(true)}>Edit questions</button>
              <button className="btn w-full text-xl" onClick={start}>Start game</button>
            </div>
          ) : (
            <p className="font-mono font-bold">Waiting for the host to start…</p>
          )}
        </>
      )}

      {s.phase === "countdown" && (
        <div className="block-box bg-lime p-8 text-center">
          <p className="label">GET READY</p>
          <p className="font-mono text-9xl font-extrabold leading-none">
            {Math.max(1, Math.ceil(((s.startedAt ?? 0) - nowSrv()) / 1000))}
          </p>
        </div>
      )}

      {(s.phase === "answer" || s.phase === "reveal") && s.question && s.qIndex !== undefined && (
        <Game s={s} nowSrv={nowSrv()} picked={picked} onPick={(c) => answer(s.qIndex!, c)} />
      )}

      {s.phase === "finished" && <Results s={s} hostToken={hostToken} code={code} />}
    </div>
  );
}

function Err({ msg }: { msg: string }) {
  if (!msg) return null;
  return <p role="alert" className="border-[3px] border-ink bg-wrong p-3 font-mono font-bold text-white shadow-hardsm">{msg}</p>;
}

function Code({ code }: { code: string }) {
  return (
    <div className="block-box bg-lime p-4 text-center">
      <p className="label">ROOM CODE</p>
      <p className="font-mono text-6xl font-extrabold uppercase tracking-[0.15em] sm:text-7xl">{code}</p>
    </div>
  );
}

function Game({ s, nowSrv, picked, onPick }: {
  s: State; nowSrv: number; picked: { q: number; c: number } | null; onPick: (c: number) => void;
}) {
  const qi = s.qIndex!;
  const q = s.question!;
  const reveal = s.phase === "reveal";
  const into = s.startedAt ? (nowSrv - s.startedAt) % s.blockMs : 0;
  const leftMs = reveal ? Math.max(0, s.blockMs - into) : Math.max(0, s.answerMs - into);
  const total = reveal ? s.blockMs - s.answerMs : s.answerMs;
  const mine = s.myChoice ?? (picked?.q === qi ? picked.c : null);

  return (
    <>
      <div className="flex items-end justify-between font-mono font-bold">
        <span>Q {qi + 1}/{s.total} · {q.topic.toUpperCase()}</span>
        <span className="text-5xl font-extrabold leading-none" aria-live="off">{Math.ceil(leftMs / 1000)}</span>
      </div>
      <div className="h-6 border-[3px] border-ink bg-paper" role="progressbar" aria-label="Time left"
        aria-valuenow={Math.ceil(leftMs / 1000)} aria-valuemin={0} aria-valuemax={Math.ceil(total / 1000)}>
        <div className={`h-full ${reveal ? "bg-cyan" : "bg-ink"}`} style={{ width: `${(leftMs / total) * 100}%` }} />
      </div>
      <h2 className="text-3xl font-bold leading-tight">{q.q}</h2>
      <div className="space-y-3">
        {q.options.map((o, i) => {
          let bg = "bg-paper";
          if (reveal) {
            if (i === s.answerIndex) bg = "bg-lime";
            else if (i === mine) bg = "bg-wrong text-white";
          } else if (i === mine) bg = "bg-cyan";
          return (
            <button key={i} className={`opt ${bg}`} disabled={reveal || mine !== null} onClick={() => onPick(i)}>
              <span className="flex w-14 shrink-0 items-center justify-center border-r-[3px] border-ink bg-ink font-mono text-2xl font-extrabold text-paper">{L[i]}</span>
              <span className="flex items-center px-3 py-2 text-lg font-bold">{o}</span>
            </button>
          );
        })}
      </div>
      {!reveal && mine !== null && <p className="font-mono font-bold">LOCKED IN. Waiting for the clock…</p>}
      {reveal && (
        <>
          <p className="block-box bg-white p-3 text-lg">
            <b className="font-mono">{mine === s.answerIndex ? "CORRECT. " : mine === null ? "TOO SLOW. " : "NOPE. "}</b>
            {s.explanation}
          </p>
          {s.badges && (s.badges.streak >= 2 || s.badges.fastest) && (
            <div className="flex flex-wrap gap-2 font-mono text-sm font-bold">
              {s.badges.streak >= 2 && <span className="border-[3px] border-ink bg-lime px-3 py-2">{s.badges.streak} IN A ROW</span>}
              {s.badges.fastest && (
                <span className="border-[3px] border-ink bg-cyan px-3 py-2">
                  FASTEST: {s.badges.fastest.you ? "YOU" : s.badges.fastest.name.toUpperCase()} · {s.badges.fastest.sec}s
                </span>
              )}
            </div>
          )}
          <Board lb={s.leaderboard ?? []} me={s.me} />
        </>
      )}
    </>
  );
}

function Board({ lb, me }: { lb: LB[]; me: string | null }) {
  return (
    <section className="block-box bg-white p-4">
      <h3 className="label mb-2">LEADERBOARD</h3>
      <ol className="divide-y-[3px] divide-ink border-y-[3px] border-ink">
        {lb.map((p, i) => (
          <li key={p.pid} className={`flex items-center gap-3 py-2 ${p.name === me ? "bg-cyan" : ""}`}>
            <span className="w-8 text-center font-mono text-xl font-extrabold">{i + 1}</span>
            <span className="flex-1 truncate text-xl font-bold">{p.name}</span>
            <span className="font-mono text-xl font-extrabold"><Count to={p.score} /></span>
          </li>
        ))}
      </ol>
    </section>
  );
}

function Count({ to }: { to: number }) {
  const [v, setV] = useState(to);
  const from = useRef(to);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches || from.current === to) {
      setV(to); from.current = to; return;
    }
    const a = from.current, t0 = performance.now();
    let raf = 0;
    const step = (t: number) => {
      const p = Math.min(1, (t - t0) / 600);
      setV(Math.round(a + (to - a) * p));
      if (p < 1) raf = requestAnimationFrame(step); else from.current = to;
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return <>{v}</>;
}

function Results({ s, hostToken, code }: { s: State; hostToken: string; code: string }) {
  const router = useRouter();
  const [rbusy, setRbusy] = useState(false);
  const [rerr, setRerr] = useState("");
  async function rematch() {
    setRbusy(true);
    setRerr("");
    try {
      const r = await api<{ code: string; hostToken: string }>(`/api/rooms/${code}/rematch`, { hostToken });
      saveSession(r.code, { hostToken: r.hostToken });
      await joinRoom(r.code, s.me || "Host");
      router.push(`/room/${r.code}`);
    } catch (e) {
      setRerr(e instanceof Error ? e.message : "Failed");
      setRbusy(false);
    }
  }
  const sw = s.swot;
  const mp = s.myProgress;
  return (
    <>
      <h1 className="text-5xl font-bold leading-none">Final results</h1>
      <p className="text-xl font-bold">{s.title}</p>
      <Board lb={s.leaderboard ?? []} me={s.me} />

      {s.analytics && (
        <section className="block-box space-y-4 bg-white p-4">
          <h2 className="text-3xl font-bold">Room analytics</h2>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="PLAYERS" value={s.analytics.players} bg="bg-cyan" />
            <Stat label="ACCURACY" value={`${s.analytics.accuracy}%`} bg="bg-lime" />
            <Stat label="ANSWERED" value={`${s.analytics.participation}%`} />
          </div>
          <div>
            <p className="label mb-2">% OF PLAYERS CORRECT, PER QUESTION</p>
            <BarChart data={s.analytics.perQuestion.map((p) => ({ label: `Q${p.qIndex + 1}`, value: p.pctCorrect }))} />
          </div>
          {(() => {
            const hard = [...s.analytics.perQuestion].sort((a, b) => a.pctCorrect - b.pctCorrect)[0];
            return hard ? (
              <p className="font-mono text-sm font-bold">
                HARDEST: Q{hard.qIndex + 1} ({hard.topic.toUpperCase()}), {hard.pctCorrect}% correct
              </p>
            ) : null;
          })()}
        </section>
      )}

      {mp && (
        <section className="block-box space-y-3 bg-white p-4">
          <h2 className="text-3xl font-bold">Your progress</h2>
          <div className="space-y-2">
            {mp.topics.map((t) => (
              <div key={t.topic}>
                <div className="flex justify-between font-mono text-sm font-bold">
                  <span>{t.topic.toUpperCase()}{t.pct < 60 && " · WEAK"}</span>
                  <span>{t.right}/{t.total}</span>
                </div>
                <div className="h-5 border-[3px] border-ink bg-paper">
                  <div className={`h-full ${t.pct < 60 ? "bg-wrong" : "bg-lime"}`} style={{ width: `${t.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          {mp.missed.length > 0 && (
            <details>
              <summary className="label cursor-pointer border-[3px] border-ink bg-cyan p-3">
                REVIEW WHAT YOU MISSED ({mp.missed.length})
              </summary>
              <ul className="mt-3 space-y-3">
                {mp.missed.map((m) => (
                  <li key={m.qIndex} className="border-[3px] border-ink bg-paper p-3">
                    <p className="font-bold">{m.q}</p>
                    <p className="font-mono text-sm">
                      {m.yours === null ? "NO ANSWER" : <>YOURS: {L[m.yours]}. {m.options[m.yours]}</>}
                    </p>
                    <p className="bg-lime font-mono text-sm font-bold">RIGHT: {L[m.correct]}. {m.options[m.correct]}</p>
                    <p className="mt-1 text-sm">{m.explanation}</p>
                  </li>
                ))}
              </ul>
            </details>
          )}
        </section>
      )}

      {sw && (
        <section>
          <h2 className="mb-3 text-3xl font-bold">SWOT of the document</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {([
              ["Strengths", sw.strengths, "bg-lime"],
              ["Weaknesses", sw.weaknesses, "bg-cyan"],
              ["Opportunities", sw.opportunities, "bg-paper"],
              ["Threats", sw.threats, "bg-paper"],
            ] as const).map(([h, items, bg]) => (
              <div key={h} className={`border-[3px] border-ink p-4 shadow-hard ${bg}`}>
                <h3 className="mb-2 text-2xl font-bold">{h}</h3>
                <ul className="list-disc space-y-1 pl-5">
                  {items.map((x, i) => <li key={i}>{x}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}
      {hostToken ? (
        <button className="btn w-full bg-cyan" disabled={rbusy} onClick={rematch}>{rbusy ? "Creating…" : "Rematch"}</button>
      ) : s.nextCode ? (
        <a href={`/?code=${s.nextCode}`} className="btn w-full bg-cyan">Join rematch {s.nextCode}</a>
      ) : null}
      {rerr && <p role="alert" className="border-[3px] border-ink bg-wrong p-3 font-mono font-bold text-white">{rerr}</p>}
      <a href="/" className="btn w-full">New game</a>
    </>
  );
}
