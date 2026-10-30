"use client";

import { useEffect, useRef, useState } from "react";
import { CLINIC_BRIEF, FLAW_RULES, FLAWED_PROMPT } from "@/lib/clinic";
import { VoiceCall } from "@/components/voice-call";
import { TACTICS } from "@/lib/attack";
import type { ResearchResult, RunResult, ShopMode, Target } from "@/lib/types";
import Canary from "./Canary";

type Status = {
  mode: ShopMode;
  baseUrl: string;
  models: { wonder: string; spark: string };
};

type Selection = { runId: string; scenarioId: string };
type Step = 1 | 2 | 3 | 4;

export function Shopper() {
  const [status, setStatus] = useState<Status | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [business, setBusiness] = useState(CLINIC_BRIEF.trim());
  const [researchedBusiness, setResearchedBusiness] = useState("");
  const [targetKind, setTargetKind] = useState<Target["kind"]>("prompt");
  const [systemPrompt, setSystemPrompt] = useState(FLAWED_PROMPT);
  const [endpoint, setEndpoint] = useState("/api/demo-agent");
  const [research, setResearch] = useState<ResearchResult | null>(null);
  const [runs, setRuns] = useState<RunResult[]>([]);
  const [selection, setSelection] = useState<Selection | null>(null);
  const [busy, setBusy] = useState<"research" | "run" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<Step>(1);
  const [attack, setAttack] = useState(false);
  const promptRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/status", { cache: "no-store" })
      .then((response) => response.json())
      .then((data: Status) => {
        if (!cancelled && (data.mode === "live" || data.mode === "mock")) setStatus(data);
      })
      .catch(() => {
        if (!cancelled) setStatusError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const scenarios = research?.scenarios ?? [];
  const selectedRun = runs.find((run) => run.id === selection?.runId);
  const selectedScenario = scenarios.find((scenario) => scenario.id === selection?.scenarioId);
  const selectedResult = selectedRun?.results.find(
    (result) => result.scenarioId === selection?.scenarioId,
  );

  async function writeScenarios() {
    if (busy) return;
    setBusy("research");
    setError(null);
    setStep(2);
    try {
      const result = await postJson<ResearchResult>("/api/scenarios", { business, attack });
      setResearch(result);
      setResearchedBusiness(business);
      setRuns([]);
      setSelection(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scenario writing failed.");
      if (!research) setStep(1);
    } finally {
      setBusy(null);
    }
  }

  function currentTarget(): Target {
    return targetKind === "prompt" ? { kind: "prompt", systemPrompt } : { kind: "http", endpoint };
  }

  async function runCalls() {
    if (!research || busy) return;
    setBusy("run");
    setError(null);
    setStep(3);
    const target = currentTarget();
    try {
      const result = await postJson<RunResult>("/api/runs", {
        scenarios: research.scenarios,
        target,
        business: researchedBusiness || business,
      });
      setRuns((current) => [...current, result]);
      const first = result.results[0];
      if (first) setSelection({ runId: result.id, scenarioId: first.scenarioId });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The run failed.");
    } finally {
      setBusy(null);
    }
  }

  const latest = runs[runs.length - 1];
  const latestPassed = latest ? latest.results.filter((result) => result.passed).length : 0;
  const allPassed = !!latest && latest.results.length > 0 && latestPassed === latest.results.length;
  const facts = briefFacts(business);
  const unlocked: Record<Step, boolean> = {
    1: true,
    2: research !== null || busy === "research",
    3: runs.length > 0 || busy === "run",
    4: scenarios.length > 0,
  };
  const steps: { n: Step; label: string; desc: string }[] = [
    { n: 1, label: "Agent & prompt", desc: "Business facts and the agent to test" },
    { n: 2, label: "Callers", desc: "Difficult callers from Muse Wonder" },
    { n: 3, label: "Results", desc: "Pass or fail for every call" },
    { n: 4, label: "Voice call", desc: "Hear one caller ring Holly" },
  ];

  function go(next: Step) {
    if (unlocked[next]) setStep(next);
  }

  function editPrompt() {
    setStep(1);
    setTimeout(() => promptRef.current?.focus(), 50);
  }

  return (
    <>
      <header className="top">
        <div className="wrap">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.svg" alt="Cozzo" width={118} height={28} />
          <span className="prod">Canary Caller</span>
          <ModeChip status={status} statusError={statusError} />
        </div>
      </header>
      <main className="wrap" aria-busy={busy !== null}>
        <section className="hero">
          <div>
            <h1>
              Mystery-shop your voice agent <span>before your callers do.</span>
            </h1>
            <p>
              Muse Wonder writes difficult callers. Spark plays them against your
              agent. Every call is graded pass or fail, so you can fix the prompt
              and run again.
            </p>
          </div>
          <div className="bird">
            <Canary pose="wave" size={112} title="Cozzo the Canary" />
          </div>
        </section>

        <ol className="steps" aria-label="Steps">
          {steps.map((item) => (
            <li key={item.n}>
              <button
                type="button"
                className={item.n < step && unlocked[item.n] ? "done" : undefined}
                aria-current={step === item.n ? "step" : undefined}
                aria-disabled={!unlocked[item.n]}
                onClick={() => go(item.n)}
              >
                <span className="n">{item.n}</span>
                <span>
                  <span className="l">{item.label}</span>
                  <br />
                  <span className="d">{item.desc}</span>
                </span>
              </button>
            </li>
          ))}
        </ol>

        {error ? (
          <p className="alert" role="alert">
            {error}
          </p>
        ) : null}

        <section className="panel" aria-labelledby="h-agent" hidden={step !== 1}>
          <div className="ph">
            <div>
              <h2 id="h-agent">Agent &amp; prompt</h2>
              <p>Tell Muse Wonder about the business, then pick the agent to call.</p>
            </div>
          </div>
          <div className="grid2">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                void writeScenarios();
              }}
            >
              <div className="field">
                <label className="f" htmlFor="business">
                  Business URL or description
                </label>
                <textarea
                  id="business"
                  style={{ minHeight: 120 }}
                  value={business}
                  onChange={(event) => setBusiness(event.target.value)}
                  required
                />
                <p className="hint">
                  Starts with the true facts for Marigold Animal Clinic, a fictional
                  demo. In mock mode the caller pack is built in.
                </p>
              </div>
              <span className="f" id="target-label">
                Target agent
              </span>
              <div className="seg" role="group" aria-labelledby="target-label">
                <button type="button" aria-pressed={targetKind === "prompt"} onClick={() => setTargetKind("prompt")}>
                  System prompt on Muse Spark
                </button>
                <button type="button" aria-pressed={targetKind === "http"} onClick={() => setTargetKind("http")}>
                  HTTP endpoint
                </button>
              </div>
              {targetKind === "prompt" ? (
                <>
                  <div className="field">
                    <label className="f" htmlFor="prompt">
                      System prompt for Holly
                    </label>
                    <textarea
                      id="prompt"
                      ref={promptRef}
                      value={systemPrompt}
                      onChange={(event) => setSystemPrompt(event.target.value)}
                      required
                    />
                  </div>
                  <details className="flaws">
                    <summary>Deliberate flaws in the demo prompt ({Object.keys(FLAW_RULES).length})</summary>
                    <p className="hint">
                      Delete one of these sentences, then run again. That row should
                      flip. The local simulator follows a rule only while its sentence
                      is still in the prompt.
                    </p>
                    <ol>
                      {Object.values(FLAW_RULES).map((rule) => (
                        <li key={rule}>{rule}</li>
                      ))}
                    </ol>
                  </details>
                </>
              ) : (
                <div className="field">
                  <label className="f" htmlFor="endpoint">
                    Endpoint
                  </label>
                  <input
                    id="endpoint"
                    type="text"
                    value={endpoint}
                    onChange={(event) => setEndpoint(event.target.value)}
                    required
                    spellCheck={false}
                  />
                  <p className="hint">
                    POST a JSON body with <code>messages</code> of user and assistant
                    turns. The reply can be <code>{`{ "reply": "..." }`}</code>.{" "}
                    <code>/api/demo-agent</code> is Holly with the flaws locked in.
                  </p>
                </div>
              )}
              <span className="f" id="callers-label">
                Callers
              </span>
              <div className="seg" role="group" aria-labelledby="callers-label">
                <button type="button" aria-pressed={!attack} onClick={() => setAttack(false)}>
                  Mystery shoppers
                </button>
                <button type="button" aria-pressed={attack} onClick={() => setAttack(true)}>
                  Attack mode
                </button>
              </div>
              <p className="hint" style={{ marginTop: -8 }}>
                {attack
                  ? "Attackers read each reply and pick their next move to break Holly: haggling, interrupting, switching language, social engineering, off-policy asks, and pressure."
                  : "Each caller follows a short script and is graded pass or fail."}
              </p>
              <div className="actions">
                <button className="btn pri" type="submit" disabled={busy !== null || !business.trim()}>
                  {busy === "research" ? <span className="spin" aria-hidden="true" /> : null}
                  {busy === "research" ? "Writing scenarios…" : "Write scenarios"}
                </button>
                <span className="hint" style={{ margin: 0 }}>
                  Nothing is called yet. You review callers first.
                </span>
              </div>
            </form>
            <aside className="side">
              <div className="say">
                <Canary pose="point" size={72} title="Cozzo the Canary" />
                <p className="bubble">
                  Holly ships with {Object.keys(FLAW_RULES).length} planted flaws.
                  Cozzo the Canary bets the callers find them.
                </p>
              </div>
              {facts.length > 0 ? (
                <ul className="facts">
                  {facts.map((fact) => (
                    <li key={fact.label}>
                      <span>{fact.label}</span>
                      <b>{fact.value}</b>
                    </li>
                  ))}
                </ul>
              ) : null}
              <p className="hint">Facts from the business box above, used by the grader.</p>
            </aside>
          </div>
        </section>

        <section className="panel" aria-labelledby="h-callers" hidden={step !== 2}>
          <div className="ph">
            <div>
              <h2 id="h-callers">Callers</h2>
              <p>Review who will call Holly. Each one gets a row in the results grid.</p>
            </div>
            <button className="btn sec" type="button" onClick={() => setStep(1)}>
              Edit agent
            </button>
          </div>
          {busy === "research" ? (
            <div>
              <div className="say" style={{ marginBottom: 24 }}>
                <Canary pose="search" size={72} title="Cozzo the Canary" />
                <p className="bubble">Muse Wonder is writing difficult callers…</p>
              </div>
              <div className="callers">
                <div className="skel" />
                <div className="skel" />
                <div className="skel" />
              </div>
            </div>
          ) : research ? (
            <>
              {research.notice ? <p className="hint">{research.notice}</p> : null}
              {research.businessSummary ? <p className="summary">{research.businessSummary}</p> : null}
              {business !== researchedBusiness ? (
                <p className="hint">
                  The business text changed. Write scenarios again before you trust
                  the next run.
                </p>
              ) : null}
              <ol className="callers">
                {scenarios.map((scenario, index) => (
                  <li key={scenario.id} className="caller" style={{ animationDelay: `${index * 60}ms` }}>
                    <span className="chip">{scenario.tactics?.length ? "Attacker" : scenario.kind.replace(/_/g, " ")}</span>
                    <h3 className="name">{scenario.title}</h3>
                    <p>{scenario.persona}</p>
                    {scenario.tactics?.length ? (
                      <p className="tactics">{scenario.tactics.map((id) => TACTICS[id].label).join(", ")}</p>
                    ) : null}
                    <p className="exp">{scenario.expectations.join(" ")}</p>
                  </li>
                ))}
              </ol>
              <div className="actions">
                <button
                  className="btn pri"
                  type="button"
                  onClick={() => void runCalls()}
                  disabled={busy !== null || scenarios.length === 0}
                >
                  {runs.length === 0 ? "Run calls" : "Run again"}
                </button>
                <button className="btn sec" type="button" onClick={() => setStep(4)} disabled={scenarios.length === 0}>
                  Place a voice call
                </button>
                <span className="hint" style={{ margin: 0 }}>
                  Spark plays each caller against Holly.
                </span>
              </div>
            </>
          ) : (
            <p className="hint">Write scenarios to see the callers before any call is placed.</p>
          )}
        </section>

        <section className="panel" aria-labelledby="h-results" hidden={step !== 3}>
          <div className="ph">
            <div>
              <h2 id="h-results">Results</h2>
              <p>Pass or fail for each caller. Choose a cell to read the transcript.</p>
            </div>
          </div>
          {runs.length === 0 && busy !== "run" ? (
            <div className="empty">
              <Canary pose="sleep" size={88} title="Cozzo the Canary" />
              <p>No calls yet. Run the calls to fill the grid. Each later run adds a column.</p>
            </div>
          ) : (
            <div className="reveal">
              <div className="score">
                <div className="stat">
                  <b>{latest ? `${latestPassed} / ${latest.results.length}` : "…"}</b>
                  <span>passed, latest run</span>
                </div>
                <div className="stat">
                  <b>{latest ? latest.results.length - latestPassed : "…"}</b>
                  <span>failed</span>
                </div>
                <div className="stat">
                  <b>{runs.length}</b>
                  <span>{runs.length === 1 ? "run" : "runs"}</span>
                </div>
              </div>
              {latest?.notice ? (
                <p className="alert" role="status">
                  {latest.notice}
                </p>
              ) : null}
              {allPassed && busy !== "run" ? (
                <div className="say" style={{ marginBottom: 16 }}>
                  <Canary pose="cheer" size={72} title="Cozzo the Canary" />
                  <p className="bubble">Every caller passed on the latest run. Holly is ready for real callers.</p>
                </div>
              ) : null}
              <div className="tw">
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Caller</th>
                      {runs.map((run, index) => (
                        <th key={run.id} scope="col" className={index === runs.length - 1 && runs.length > 1 ? "col-new" : undefined}>
                          Run {index + 1}
                          <small>{run.targetLabel}</small>
                          <small>{run.mode === "live" ? "Live" : run.notice ? "Mock, live limit reached" : "Mock"}</small>
                        </th>
                      ))}
                      {busy === "run" ? (
                        <th scope="col">
                          Run {runs.length + 1}
                          <small>running</small>
                        </th>
                      ) : null}
                    </tr>
                  </thead>
                  <tbody>
                    {scenarios.map((scenario, row) => (
                      <tr key={scenario.id}>
                        <th scope="row">
                          <span className="name">{scenario.title}</span>
                        </th>
                        {runs.map((run, index) => {
                          const result = run.results.find((item) => item.scenarioId === scenario.id);
                          if (!result) return <td key={run.id}>Missing</td>;
                          const pressed = selection?.runId === run.id && selection.scenarioId === scenario.id;
                          const passed = result.passed;
                          return (
                            <td key={run.id} className={index === runs.length - 1 && runs.length > 1 ? "col-new" : undefined}>
                              <button
                                type="button"
                                className={`cell ${passed ? "pass" : "fail"}${pressed ? " sel" : ""}`}
                                style={{ ["--i" as string]: row }}
                                aria-pressed={pressed}
                                aria-label={`${scenario.title}, run ${index + 1}, ${passed ? "pass" : "fail"}`}
                                onClick={() => setSelection({ runId: run.id, scenarioId: scenario.id })}
                              >
                                {passed ? <CheckIcon /> : <CrossIcon />}
                                {passed ? "Pass" : "Fail"}
                              </button>
                            </td>
                          );
                        })}
                        {busy === "run" ? (
                          <td>
                            <span className="cell pend" aria-label="Running">
                              <span className="bar" />
                              Calling
                            </span>
                          </td>
                        ) : null}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <ol className="rcards" aria-label="Pass or fail for each caller">
                {scenarios.map((scenario) => (
                  <li key={scenario.id} className="rcard">
                    <h3 className="name">{scenario.title}</h3>
                    <div className="rruns">
                      {runs.map((run, index) => {
                        const result = run.results.find((item) => item.scenarioId === scenario.id);
                        const pressed = selection?.runId === run.id && selection.scenarioId === scenario.id;
                        return (
                          <div key={run.id} className="rrun">
                            <small>Run {index + 1}</small>
                            {result ? (
                              <button
                                type="button"
                                className={`cell ${result.passed ? "pass" : "fail"}${pressed ? " sel" : ""}`}
                                aria-pressed={pressed}
                                aria-label={`${scenario.title}, run ${index + 1}, ${result.passed ? "pass" : "fail"}`}
                                onClick={() => setSelection({ runId: run.id, scenarioId: scenario.id })}
                              >
                                {result.passed ? <CheckIcon /> : <CrossIcon />}
                                {result.passed ? "Pass" : "Fail"}
                              </button>
                            ) : (
                              <span className="hint">Missing</span>
                            )}
                          </div>
                        );
                      })}
                      {busy === "run" ? (
                        <div className="rrun">
                          <small>Run {runs.length + 1}</small>
                          <span className="cell pend" aria-label="Running">
                            <span className="bar" />
                            Calling
                          </span>
                        </div>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ol>
              {selectedRun && selectedScenario && selectedResult ? (
                <Transcript
                  title={selectedScenario.title}
                  runLabel={`Run ${runs.indexOf(selectedRun) + 1}, ${selectedRun.targetLabel}`}
                  result={selectedResult}
                />
              ) : null}
              {busy !== "run" ? (
                <div className="rerun">
                  <p>
                    <b>Fix the prompt, then run again.</b> Each run adds a column, so
                    you can see what changed.
                  </p>
                  <button className="btn sec" type="button" onClick={editPrompt}>
                    Edit prompt
                  </button>
                  <button className="btn yel" type="button" onClick={() => void runCalls()} disabled={busy !== null}>
                    Run again
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </section>

        <section className="panel" aria-labelledby="h-voice" hidden={step !== 4}>
          <div className="ph">
            <div>
              <h2 id="h-voice">Voice call</h2>
              <p>
                Hear one caller ring Holly. The call is placed and graded on the
                server, then played back with two browser voices.
              </p>
            </div>
          </div>
          {scenarios.length > 0 ? (
            <VoiceCall
              scenarios={scenarios}
              target={currentTarget}
              modeLabel={status?.mode === "live" ? "Live Muse call" : "Mock call"}
              disabled={busy !== null}
              onResult={(run) => setRuns((current) => [...current, run])}
            />
          ) : (
            <p className="hint">Write scenarios first, then place a call you can hear.</p>
          )}
        </section>
      </main>
      <footer className="wrap">
        Built for the Meta Global AI Developer Hackathon, Indie track. This pass
        records text transcripts, not audio. <a href="https://cozzo.io">Cozzo</a> is
        the benchmarking site. Cozzo the Canary is its mascot.
      </footer>
    </>
  );
}

function ModeChip({ status, statusError }: { status: Status | null; statusError: boolean }) {
  if (statusError) return <span className="mode">Mode unknown</span>;
  if (!status) return <span className="mode">Checking whether a Muse key is configured.</span>;
  if (status.mode === "live") {
    return (
      <span className="mode" title={`Wonder (${status.models.wonder}) writes the scenarios. Spark (${status.models.spark}) plays the calls.`}>
        <b>LIVE</b> <span className="mfull">Muse Wonder writes, Spark calls</span>
        <span className="mshort">Muse</span>
      </span>
    );
  }
  return (
    <span className="mode" title="No MUSE_API_KEY is set, so Wonder and Spark are not called. The demo clinic and the grader still run.">
      Mock mode
    </span>
  );
}

function briefFacts(text: string): { label: string; value: string }[] {
  const facts: { label: string; value: string }[] = [];
  for (const line of text.split("\n")) {
    const match = /^\s*(Prices?|Patients|Hours|Doctors)\s*:\s*(.+)$/i.exec(line);
    if (!match) continue;
    if (/^price/i.test(match[1])) {
      for (const part of match[2].split(",")) {
        const price = /^\s*(.+?)\s+(\$[\d,]+(?:\.\d+)?)\s*\.?$/.exec(part);
        if (price) facts.push({ label: price[1].replace(/^\w/, (c) => c.toUpperCase()), value: price[2] });
      }
    } else if (/^patients/i.test(match[1])) {
      const first = match[2].split(".")[0].replace(/\s+only$/i, "");
      facts.push({ label: "Patients", value: first.replace(/^\w/, (c) => c.toUpperCase()) });
    }
  }
  return facts.slice(0, 6);
}

function CheckIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M3 8.5l3 3 7-7" />
    </svg>
  );
}

function CrossIcon() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden="true">
      <path d="M4 4l8 8M12 4l-8 8" />
    </svg>
  );
}

function Transcript({
  title,
  runLabel,
  result,
}: {
  title: string;
  runLabel: string;
  result: RunResult["results"][number];
}) {
  const missed = result.checks.filter((check) => !check.met);
  return (
    <article className="trans">
      <header>
        <b>
          {title}, {runLabel}
        </b>
        <span className={`cell ${result.passed ? "pass" : "fail"}`} style={{ cursor: "default" }}>
          {result.passed ? <CheckIcon /> : <CrossIcon />}
          {result.passed ? "Pass" : "Fail"}
        </span>
      </header>
      {result.transcript.length === 0 ? (
        <p className="hint" style={{ padding: 16 }}>
          This call did not produce a transcript.
        </p>
      ) : (
        <div className="msgs">
          {result.transcript.map((turn, index) => (
            <div key={`${turn.role}-${index}`} className={`m ${turn.role === "caller" ? "c" : "a"}`}>
              <small>
                {turn.role === "caller" ? "Caller" : "Holly (agent)"}
                {turn.tactic ? <span className="tac">{TACTICS[turn.tactic].label}</span> : null}
              </small>
              {turn.text}
            </div>
          ))}
        </div>
      )}
      {result.breaches && result.breaches.length > 0 ? (
        <ol className="breaches" aria-label="Where the agent broke">
          {result.breaches.map((breach, index) => (
            <li key={index} className={`breach sev-${breach.severity}`}>
              <div className="bh">
                <span className="sev">{breach.severity}</span>
                <b>Broken by {TACTICS[breach.tactic].label.toLowerCase()}</b>
              </div>
              <blockquote>“{breach.quote}”</blockquote>
              {breach.why ? <p>{breach.why}</p> : null}
            </li>
          ))}
        </ol>
      ) : null}
      <div className={`verdict${missed.length === 0 ? " ok" : ""}`}>
        {result.summary}
        {missed.length > 0 && !result.breaches?.length ? (
          <ul>
            {missed.map((check) => (
              <li key={check.expectation}>
                <b>Missed:</b> {check.expectation} {check.note}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
    </article>
  );
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  let data: { error?: string };
  try {
    data = JSON.parse(text) as { error?: string };
  } catch {
    throw new Error("The server returned an unreadable response.");
  }
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status}).`);
  }
  return data as T;
}
