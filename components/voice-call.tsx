"use client";

import { useEffect, useRef, useState } from "react";
import type { VoicePlan } from "@/lib/voices";
import { loadVoicePlan, speakLine, speechAvailable, stopSpeech } from "@/lib/speech";
import { encodeWav, resample } from "@/lib/wav";
import type { CallResult, RunResult, Scenario, Target, Turn } from "@/lib/types";

type Phase = "idle" | "dialing" | "speaking" | "done";

/**
 * Voice mode. The server places one call (same /api/runs path, same caps,
 * same grader), then the browser plays it back as a phone call: Cozzo the
 * caller and Holly each get their own Web Speech voice, and the transcript
 * fills in line by line as it is spoken.
 */
export function VoiceCall({
  scenarios,
  target,
  modeLabel,
  disabled,
  onResult,
}: {
  scenarios: Scenario[];
  target: () => Target;
  modeLabel: string;
  disabled: boolean;
  onResult: (run: RunResult) => void;
}) {
  const [scenarioId, setScenarioId] = useState(scenarios[0]?.id ?? "");
  const [opening, setOpening] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [heard, setHeard] = useState<Turn[]>([]);
  const [speakingIndex, setSpeakingIndex] = useState(-1);
  const [result, setResult] = useState<CallResult | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recording, setRecording] = useState<"off" | "on" | "sending">("off");
  const plan = useRef<VoicePlan<SpeechSynthesisVoice> | null>(null);
  const cancelled = useRef(false);
  const recorder = useRef<MediaRecorder | null>(null);

  const inFlight = useRef(false);
  const micBusy = useRef(false);

  useEffect(() => {
    void loadVoicePlan().then((loaded) => {
      plan.current = loaded;
    });
    return () => {
      stopSpeech();
      recorder.current?.stream.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const busy = phase === "dialing" || phase === "speaking";

  async function placeCall() {
    if (!scenario || inFlight.current) return;
    inFlight.current = true;
    cancelled.current = false;
    stopSpeech();
    setPhase("dialing");
    setHeard([]);
    setResult(null);
    setNotice(null);
    setError(null);
    const line = opening.trim();
    const call: Scenario = line ? { ...scenario, turns: [line, ...scenario.turns.slice(1)] } : scenario;
    try {
      const response = await fetch("/api/runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ scenarios: [call], target: target() }),
      });
      const run = (await response.json()) as RunResult & { error?: string };
      if (!response.ok) throw new Error(run.error || `The call failed (${response.status}).`);
      const callResult = run.results[0];
      if (!callResult) throw new Error("The call came back empty.");
      setNotice(run.notice ?? `${run.mode === "live" ? "Live Muse call" : "Mock call"}, ${run.targetLabel}`);
      // Re-check voices now: Chrome often has none at first paint.
      if (!plan.current || !plan.current.agent.voice) plan.current = await loadVoicePlan();
      setPhase("speaking");
      for (let index = 0; index < callResult.transcript.length; index += 1) {
        if (cancelled.current) break;
        const turn = callResult.transcript[index];
        setHeard((current) => [...current, turn]);
        setSpeakingIndex(index);
        await say(turn);
      }
      setSpeakingIndex(-1);
      setResult(callResult);
      setPhase("done");
      onResult({ ...run, targetLabel: `voice call, ${run.targetLabel}` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The call failed.");
      setPhase("idle");
    } finally {
      inFlight.current = false;
    }
  }

  function say(turn: Turn): Promise<void> {
    const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    if (!speechAvailable() || !plan.current) return pause(Math.min(4000, 600 + turn.text.length * 35));
    const setting = plan.current[turn.role === "caller" ? "caller" : "agent"];
    return speakLine(turn.text, setting).then(() => pause(350));
  }

  function hangUp() {
    cancelled.current = true;
    stopSpeech();
  }

  async function toggleRecording() {
    if (recording === "on") {
      if (recorder.current?.state === "recording") recorder.current.stop();
      return;
    }
    if (micBusy.current || recording === "sending") return;
    micBusy.current = true;
    setError(null);
    try {
      if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
        throw Object.assign(new Error("unsupported"), { name: "NotSupportedError" });
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const chunks: Blob[] = [];
      const media = new MediaRecorder(stream);
      recorder.current = media;
      media.ondataavailable = (event) => chunks.push(event.data);
      media.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        setRecording("sending");
        try {
          setOpening(await transcribe(new Blob(chunks, { type: media.mimeType })));
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "Transcription failed.");
        } finally {
          setRecording("off");
        }
      };
      media.start();
      setRecording("on");
    } catch (cause) {
      setError(micMessage(cause));
    } finally {
      micBusy.current = false;
    }
  }

  const status =
    error ??
    (recording === "on"
      ? "Listening. Press again to stop and use it."
      : recording === "sending"
        ? "Transcribing…"
        : phase === "dialing"
          ? "Dialing…"
          : phase === "speaking"
            ? "In call"
            : phase === "done"
              ? "Call ended"
              : "Press Say it to speak the opening line, or just place the call.");

  return (
    <div className="voice">
      <div className="callcard">
        <span className="who">Calling Holly (agent), {notice ?? modeLabel}</span>
        <h3 className="name">{scenario?.title}</h3>
        <button
          type="button"
          className={`mic${recording === "on" ? " on" : ""}`}
          aria-pressed={recording === "on"}
          aria-label={recording === "on" ? "Stop and use it" : "Say it"}
          onClick={() => void toggleRecording()}
          disabled={busy || recording === "sending"}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <rect x="9" y="3" width="6" height="12" rx="3" />
            <path d="M5 11a7 7 0 0 0 14 0M12 18v3" />
          </svg>
        </button>
        {recording === "on" || phase === "speaking" ? (
          <div className="wave" aria-hidden="true">
            {Array.from({ length: 14 }, (_, k) => (
              <i key={k} style={{ ["--k" as string]: k }} />
            ))}
          </div>
        ) : null}
        <span className={`state${error ? " err" : ""}`} role={error ? "alert" : "status"}>
          {status}
        </span>
        <div className="row">
          {recording === "on" ? (
            <button type="button" className="btn ghost" onClick={() => void toggleRecording()}>
              Stop and use it
            </button>
          ) : recording === "off" && !busy ? (
            <button type="button" className="btn ghost" onClick={() => void toggleRecording()}>
              Say it
            </button>
          ) : null}
          {busy ? (
            <button className="btn hang" type="button" onClick={hangUp} disabled={phase === "dialing"}>
              {phase === "dialing" ? "Dialing…" : "Hang up"}
            </button>
          ) : (
            <button
              className="btn yel"
              type="button"
              onClick={() => void placeCall()}
              disabled={disabled || !scenario || recording !== "off"}
            >
              Place voice call
            </button>
          )}
        </div>
        {phase !== "idle" && !speechAvailable() ? (
          <span className="who">This browser cannot speak, so the call plays as text only.</span>
        ) : null}
      </div>
      <div className="vt">
        <label className="f" htmlFor="voice-scenario" style={{ margin: 0 }}>
          Caller
        </label>
        <select
          id="voice-scenario"
          value={scenario?.id ?? ""}
          onChange={(event) => setScenarioId(event.target.value)}
          disabled={busy}
        >
          {scenarios.map((item) => (
            <option key={item.id} value={item.id}>
              {item.title}
            </option>
          ))}
        </select>
        <label className="f" htmlFor="voice-opening" style={{ margin: 0 }}>
          Opening line (optional)
        </label>
        <input
          id="voice-opening"
          type="text"
          value={opening}
          placeholder={scenario?.turns[0] ?? "Type it, or press Say it"}
          onChange={(event) => setOpening(event.target.value)}
          disabled={busy}
        />
        <span className="hint" style={{ margin: 0 }}>
          Say it records your mic and Muse Voice Transcribe turns it into the
          caller&apos;s first line. Leave it empty to use the scenario&apos;s line.
          The voices come from your browser.
        </span>
        {heard.map((turn, index) => (
          <div key={index} className={`m ${turn.role === "caller" ? "c" : "a"}${index === speakingIndex ? " speaking" : ""}`}>
            <small>{turn.role === "caller" ? "Cozzo (caller)" : "Holly (agent)"}</small>
            {turn.text}
          </div>
        ))}
        {result ? (
          <>
            <div className="mark-row">
              <span className={`cell ${result.passed ? "pass" : "fail"}`} style={{ cursor: "default" }}>
                {result.passed ? "Pass" : "Fail"}
              </span>
              <span>{result.summary}</span>
            </div>
            <ul className="checks">
              {result.checks.map((check) => (
                <li key={check.expectation} className={check.met ? "met" : "missed"}>
                  {check.met ? "Met" : "Missed"}: {check.expectation} {check.note}
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </div>
    </div>
  );
}

function micMessage(cause: unknown): string {
  const name = cause instanceof Error ? cause.name : "";
  if (name === "NotAllowedError" || name === "SecurityError")
    return "Mic access is blocked. Click the lock icon in the address bar, allow the microphone, and press Say it again. Or type the line.";
  if (name === "NotFoundError") return "No microphone was found. Plug one in or type the opening line.";
  if (name === "NotReadableError") return "Another app is using the microphone. Close it and press Say it again.";
  if (name === "NotSupportedError") return "This browser cannot record audio. Use Chrome or Safari, or type the line.";
  return "The microphone did not start. Press Say it again, or type the opening line.";
}

async function transcribe(blob: Blob): Promise<string> {
  const context = new AudioContext();
  try {
    const audio = await context.decodeAudioData(await blob.arrayBuffer());
    const wav = encodeWav(resample(audio.getChannelData(0), audio.sampleRate));
    const response = await fetch("/api/transcribe", {
      method: "POST",
      headers: { "Content-Type": "audio/wav" },
      body: wav as BlobPart,
    });
    const data = (await response.json()) as { text?: string; error?: string };
    if (!response.ok || typeof data.text !== "string") throw new Error(data.error || "Transcription failed.");
    if (!data.text) throw new Error("Muse heard no speech. Try again a little closer to the mic.");
    return data.text;
  } finally {
    void context.close();
  }
}
