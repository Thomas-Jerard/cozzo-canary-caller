"use client";

import { useEffect, useRef, useState } from "react";
import { pickVoices, type VoicePlan } from "@/lib/voices";
import { encodeWav, resample } from "@/lib/wav";
import type { CallResult, RunResult, Scenario, Target, Turn } from "@/lib/types";

type Phase = "idle" | "dialing" | "speaking" | "done";

/**
 * Voice mode. The server places one call (same /api/runs path, same caps,
 * same grader), then the browser plays it back as a phone call: the Canary
 * caller and Holly each get their own Web Speech voice, and the transcript
 * fills in line by line as it is spoken.
 */
export function VoiceCall({
  scenarios,
  target,
  disabled,
  onResult,
}: {
  scenarios: Scenario[];
  target: () => Target;
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

  useEffect(() => {
    if (!speechAvailable()) return;
    const load = () => {
      plan.current = pickVoices(window.speechSynthesis.getVoices());
    };
    load();
    window.speechSynthesis.addEventListener("voiceschanged", load);
    return () => {
      window.speechSynthesis.removeEventListener("voiceschanged", load);
      window.speechSynthesis.cancel();
    };
  }, []);

  const scenario = scenarios.find((item) => item.id === scenarioId) ?? scenarios[0];
  const busy = phase === "dialing" || phase === "speaking";

  async function placeCall() {
    if (!scenario) return;
    cancelled.current = false;
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
      setNotice(run.notice ?? `${run.mode === "live" ? "Live Muse call" : "Mock call"} · ${run.targetLabel}`);
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
      onResult({ ...run, targetLabel: `voice · ${run.targetLabel}` });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "The call failed.");
      setPhase("idle");
    }
  }

  function say(turn: Turn): Promise<void> {
    const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
    if (!speechAvailable()) return pause(Math.min(4000, 600 + turn.text.length * 35));
    return new Promise((resolve) => {
      const voice = plan.current?.[turn.role === "caller" ? "caller" : "agent"];
      const utterance = new SpeechSynthesisUtterance(turn.text);
      if (voice?.voice) utterance.voice = voice.voice;
      utterance.pitch = voice?.pitch ?? 1;
      utterance.rate = voice?.rate ?? 1;
      const done = () => {
        clearTimeout(guard);
        setTimeout(resolve, 350);
      };
      // Some browsers never fire `end`; never let the call hang on that.
      const guard = setTimeout(done, 3000 + turn.text.length * 120);
      utterance.onend = done;
      utterance.onerror = done;
      window.speechSynthesis.speak(utterance);
    });
  }

  function hangUp() {
    cancelled.current = true;
    if (speechAvailable()) window.speechSynthesis.cancel();
  }

  async function toggleRecording() {
    if (recording === "on") {
      recorder.current?.stop();
      return;
    }
    setError(null);
    try {
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
    } catch {
      setError("The microphone is not available. Type the opening line instead.");
    }
  }

  return (
    <div className="voice">
      <div className="voice-controls">
        <div>
          <label htmlFor="voice-scenario">Caller</label>
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
        </div>
        <div>
          <label htmlFor="voice-opening">Opening line (optional)</label>
          <div className="row">
            <input
              id="voice-opening"
              type="text"
              value={opening}
              placeholder={scenario?.turns[0] ?? ""}
              onChange={(event) => setOpening(event.target.value)}
              disabled={busy}
            />
            <button type="button" onClick={() => void toggleRecording()} disabled={busy || recording === "sending"}>
              {recording === "on" ? "Stop recording" : recording === "sending" ? "Transcribing…" : "Say it"}
            </button>
          </div>
          <p className="hint">
            Say it records your mic and Muse Voice Transcribe turns it into the
            caller&apos;s first line. Leave it empty to use the scenario&apos;s line.
          </p>
        </div>
      </div>
      <div className="actions">
        {busy ? (
          <button type="button" onClick={hangUp} disabled={phase === "dialing"}>
            {phase === "dialing" ? "Dialing…" : "Hang up"}
          </button>
        ) : (
          <button className="primary" type="button" onClick={() => void placeCall()} disabled={disabled || !scenario}>
            Place voice call
          </button>
        )}
      </div>
      {phase !== "idle" && !speechAvailable() ? <p className="hint">This browser cannot speak, so the call plays as text only.</p> : null}
      {error ? (
        <p className="alert" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="hint">{notice}</p> : null}
      {heard.length > 0 ? (
        <ol className="call-log" aria-live="polite">
          {heard.map((turn, index) => (
            <li key={index} className={`${turn.role}${index === speakingIndex ? " speaking" : ""}`}>
              <span className="who">{turn.role === "caller" ? "Canary caller" : "Holly"}</span>
              {turn.text}
            </li>
          ))}
        </ol>
      ) : null}
      {result ? (
        <div className="mark-row">
          <span className={`mark ${result.passed ? "pass" : "fail"}`}>{result.passed ? "Pass" : "Fail"}</span>
          <p>{result.summary}</p>
        </div>
      ) : null}
      {result ? (
        <ul className="checks">
          {result.checks.map((check) => (
            <li key={check.expectation} className={check.met ? "met" : "missed"}>
              {check.met ? "Met" : "Missed"}: {check.expectation} {check.note}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
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
