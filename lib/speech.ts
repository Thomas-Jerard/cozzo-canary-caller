"use client";
/** Browser speech helpers that work around Chrome's speechSynthesis quirks. */
import { pickVoices, type VoicePlan, type VoiceSetting } from "./voices";

export function speechAvailable(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

/** Wait for voices (voiceschanged + polling, Chrome loads them late), then plan. */
export function loadVoicePlan(timeoutMs = 3000): Promise<VoicePlan<SpeechSynthesisVoice>> {
  if (!speechAvailable()) return Promise.resolve(pickVoices([]));
  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      clearInterval(poll);
      clearTimeout(stop);
      synth.removeEventListener("voiceschanged", check);
      resolve(pickVoices(synth.getVoices()));
    };
    const check = () => {
      if (synth.getVoices().length > 0) finish();
    };
    synth.addEventListener("voiceschanged", check);
    const poll = setInterval(check, 150);
    const stop = setTimeout(finish, timeoutMs);
    check();
  });
}

/** Speak one line and resolve when it ends (or a timeout fires). */
export function speakLine(text: string, setting: VoiceSetting<SpeechSynthesisVoice>): Promise<void> {
  const synth = window.speechSynthesis;
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    if (setting.voice) {
      utterance.voice = setting.voice;
      utterance.lang = setting.voice.lang;
    }
    utterance.pitch = setting.pitch;
    utterance.rate = setting.rate;
    let done = false;
    // Chrome pauses long utterances after ~15s; nudge it with pause/resume.
    const keepAlive = setInterval(() => {
      if (synth.speaking && !synth.paused) {
        synth.pause();
        synth.resume();
      }
    }, 10000);
    const finish = () => {
      if (done) return;
      done = true;
      clearInterval(keepAlive);
      clearTimeout(guard);
      resolve();
    };
    const guard = setTimeout(finish, 4000 + text.length * 110);
    utterance.onend = finish;
    utterance.onerror = finish;
    synth.speak(utterance);
    if (synth.paused) synth.resume();
  });
}

export function stopSpeech() {
  if (speechAvailable()) window.speechSynthesis.cancel();
}
