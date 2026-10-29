"use client";

import { useEffect, useState } from "react";
import { CLINIC_BRIEF, FLAW_RULES, FLAWED_PROMPT } from "@/lib/clinic";
import { VoiceCall } from "@/components/voice-call";
import type { ResearchResult, RunResult, ShopMode, Target } from "@/lib/types";
import Canary from "./Canary";

type Status = {
  mode: ShopMode;
  baseUrl: string;
  models: { wonder: string; spark: string };
};

type Selection = { runId: string; scenarioId: string };

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
    setBusy("research");
    setError(null);
    try {
      const result = await postJson<ResearchResult>("/api/scenarios", { business });
      setResearch(result);
      setResearchedBusiness(business);
      setRuns([]);
      setSelection(null);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Scenario writing failed.");
    } finally {
      setBusy(null);
    }
  }

  function currentTarget(): Target {
    return targetKind === "prompt" ? { kind: "prompt", systemPrompt } : { kind: "http", endpoint };
  }

  async function runCalls() {
    if (!research) return;
    setBusy("run");
    setError(null);
    const target = currentTarget();
    try {
      const result = await postJson<RunResult>("/api/runs", {
        scenarios: research.scenarios,
        target,
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

  return (
    <main className="sheet" aria-busy={busy !== null}>
      <header className="brand">
        <span className="bird"><Canary pose="wave" size={64} title="Cozzo the Canary" /></span>
        <div>
          <p className="eyebrow">Cozzo</p>
          <h1>Canary Caller</h1>
        </div>
      </header>
      <p className="lede">
        A mystery shopper for voice agents. Wonder writes difficult callers.
        Spark plays them against your agent. Each cell is a pass or a fail,
        and you can run again after you change the prompt.
      </p>
      <ModeBanner status={status} statusError={statusError} />
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}

      <section className="section" aria-labelledby="business-heading">
        <h2 id="business-heading">
          <span className="section-index">1</span>Business
        </h2>
        <form
          className="stack"
          onSubmit={(event) => {
            event.preventDefault();
            void writeScenarios();
          }}
        >
          <div>
            <label htmlFor="business">URL or description</label>
            <textarea
              id="business"
              value={business}
              onChange={(event) => setBusiness(event.target.value)}
              required
            />
            <p className="hint">
              The box starts with the true facts for Marigold Animal Clinic, a
              fictional demo. Wonder is supposed to research this. In mock mode
              the caller pack is built in.
            </p>
          </div>
          <fieldset>
            <legend>Target agent</legend>
            <div className="choices">
              <label>
                <input
                  type="radio"
                  name="target-kind"
                  value="prompt"
                  checked={targetKind === "prompt"}
                  onChange={() => setTargetKind("prompt")}
                />{" "}
                System prompt on Muse Spark
              </label>
              <label>
                <input
                  type="radio"
                  name="target-kind"
                  value="http"
                  checked={targetKind === "http"}
                  onChange={() => setTargetKind("http")}
                />{" "}
                HTTP endpoint
              </label>
            </div>
          </fieldset>
          {targetKind === "prompt" ? (
            <div>
              <label htmlFor="prompt">System prompt</label>
              <textarea
                id="prompt"
                value={systemPrompt}
                onChange={(event) => setSystemPrompt(event.target.value)}
                required
              />
              <details>
                <summary>Deliberate flaws in the demo prompt</summary>
                <p className="hint">
                  Delete one of these sentences, then run again. That row should
                  flip. The local simulator follows a rule only while its
                  sentence is still in the prompt.
                </p>
                <ol>
                  {Object.values(FLAW_RULES).map((rule) => (
                    <li key={rule}>{rule}</li>
                  ))}
                </ol>
              </details>
            </div>
          ) : (
            <div>
              <label htmlFor="endpoint">Endpoint</label>
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
          <div className="actions">
            <button className="primary" type="submit" disabled={busy !== null || !business.trim()}>
              {busy === "research" ? "Writing scenarios…" : "Write scenarios"}
            </button>
          </div>
        </form>
      </section>

      <section className="section" aria-labelledby="scenario-heading">
        <h2 id="scenario-heading">
          <span className="section-index">2</span>Scenarios
        </h2>
        {research ? (
          <>
            {research.notice ? <p className="hint">{research.notice}</p> : null}
            <p>{research.businessSummary}</p>
            {business !== researchedBusiness ? (
              <p className="hint">
                The business text changed. Write scenarios again before you
                trust the next run.
              </p>
            ) : null}
            <ol className="scenario-list">
              {scenarios.map((scenario) => (
                <li key={scenario.id}>
                  <h3>
                    {scenario.title}
                    <span className="kind">{scenario.kind.replace(/_/g, " ")}</span>
                  </h3>
                  <p>{scenario.persona}</p>
                  <p className="hint">{scenario.expectations.join(" ")}</p>
                </li>
              ))}
            </ol>
            <div className="actions">
              <button
                className="primary"
                type="button"
                onClick={() => void runCalls()}
                disabled={busy !== null || scenarios.length === 0}
              >
                {busy === "run" ? "Running calls…" : runs.length === 0 ? "Run calls" : "Run again"}
              </button>
            </div>
          </>
        ) : (
          <p className="hint">Write scenarios to see the callers before any call is placed.</p>
        )}
      </section>

      <section className="section" aria-labelledby="voice-heading">
        <h2 id="voice-heading">
          <span className="section-index">3</span>Voice call
        </h2>
        {research && scenarios.length > 0 ? (
          <>
            <p className="hint">
              Hear one caller ring Holly. The call is placed and graded on the
              server, then played back with two browser voices. Muse has no
              speech synthesis yet, so the voices come from your browser.
            </p>
            <VoiceCall
              scenarios={scenarios}
              target={currentTarget}
              disabled={busy !== null}
              onResult={(run) => setRuns((current) => [...current, run])}
            />
          </>
        ) : (
          <p className="hint">Write scenarios first, then place a call you can hear.</p>
        )}
      </section>

      <section className="section" aria-labelledby="results-heading">
        <h2 id="results-heading">
          <span className="section-index">4</span>Results
        </h2>
        {runs.length === 0 ? (
          <p className="hint">Run the calls to fill the grid. Each later run adds a column.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <caption>Pass or fail for each caller. Choose a cell to read the transcript.</caption>
              <thead>
                <tr>
                  <th scope="col">Caller</th>
                  {runs.map((run, index) => (
                    <th key={run.id} scope="col">
                      Run {index + 1}
                      <span className="sub">
                        {run.mode} · {run.targetLabel}
                      </span>
                      {run.notice ? <span className="sub">{run.notice}</span> : null}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {scenarios.map((scenario) => (
                  <tr key={scenario.id}>
                    <th scope="row">{scenario.title}</th>
                    {runs.map((run, index) => {
                      const result = run.results.find((item) => item.scenarioId === scenario.id);
                      const pressed =
                        selection?.runId === run.id && selection.scenarioId === scenario.id;
                      const passed = result?.passed === true;
                      return (
                        <td key={run.id}>
                          <button
                            type="button"
                            className={`cell ${passed ? "pass" : "fail"}`}
                            aria-pressed={pressed}
                            aria-label={`${scenario.title}, run ${index + 1}, ${passed ? "pass" : "fail"}`}
                            onClick={() =>
                              setSelection({ runId: run.id, scenarioId: scenario.id })
                            }
                          >
                            <span className={`mark ${passed ? "pass" : "fail"}`}>
                              {passed ? "Pass" : "Fail"}
                            </span>
                            <span className="sub">
                              {result
                                ? `${result.checks.filter((check) => check.met).length}/${result.checks.length} checks`
                                : "Missing"}
                            </span>
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {selectedRun && selectedScenario && selectedResult ? (
          <Transcript
            title={selectedScenario.title}
            runLabel={selectedRun.targetLabel}
            result={selectedResult}
          />
        ) : null}
      </section>

      <footer>
        <p>
          Built for the Meta Global AI Developer Hackathon, Indie track. This
          pass records text transcripts, not audio.{" "}
          <a href="https://cozzo.io">Cozzo</a> is the benchmarking site. Cozzo
          the Canary is its mascot.
        </p>
      </footer>
    </main>
  );
}

function ModeBanner({ status, statusError }: { status: Status | null; statusError: boolean }) {
  if (statusError) {
    return (
      <div className="banner">
        <p>Could not check whether a Muse key is configured. You can still try a run.</p>
      </div>
    );
  }
  if (!status) {
    return (
      <div className="banner">
        <p>Checking whether a Muse key is configured.</p>
      </div>
    );
  }
  if (status.mode === "live") {
    return (
      <div className="banner">
        <p>
          <strong>Live</strong> Wonder ({status.models.wonder}) writes the
          scenarios. Spark ({status.models.spark}) plays the calls.
        </p>
      </div>
    );
  }
  return (
    <div className="banner">
      <p>
        <strong>Mock mode</strong> No MUSE_API_KEY is set, so Wonder and Spark
        are not called. The demo clinic and the grader still run.
      </p>
    </div>
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
  return (
    <article className="transcript">
      <h3>
        {title} · {runLabel}
      </h3>
      <div className="mark-row">
        <span className={`mark ${result.passed ? "pass" : "fail"}`}>
          {result.passed ? "Pass" : "Fail"}
        </span>
        <p>{result.summary}</p>
      </div>
      {result.transcript.length === 0 ? (
        <p className="hint">This call did not produce a transcript.</p>
      ) : (
        <ol>
          {result.transcript.map((turn, index) => (
            <li key={`${turn.role}-${index}`} className={turn.role}>
              <span className="who">{turn.role === "caller" ? "Caller" : "Agent"}</span>
              {turn.text}
            </li>
          ))}
        </ol>
      )}
      <ul className="checks">
        {result.checks.map((check) => (
          <li key={check.expectation} className={check.met ? "met" : "missed"}>
            {check.met ? "Met" : "Missed"}: {check.expectation} {check.note}
          </li>
        ))}
      </ul>
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
