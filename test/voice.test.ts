import assert from "node:assert/strict";
import test from "node:test";
import { pickVoices } from "../lib/voices.ts";
import { encodeWav, isAsrWav, resample } from "../lib/wav.ts";

test("encodeWav writes a 16 kHz mono PCM16 file Muse accepts", () => {
  const wav = encodeWav(new Float32Array([0, 0.5, -0.5, 1, -1]));
  assert.equal(wav.length, 44 + 10);
  assert.equal(isAsrWav(wav), true);
  const view = new DataView(wav.buffer);
  assert.equal(view.getInt16(44 + 6, true), 0x7fff);
  assert.equal(view.getInt16(44 + 8, true), -0x8000);
});

test("isAsrWav rejects other rates and junk", () => {
  assert.equal(isAsrWav(encodeWav(new Float32Array(4), 44100)), false);
  assert.equal(isAsrWav(new Uint8Array(60)), false);
});

test("resample shrinks 48 kHz to 16 kHz", () => {
  const out = resample(new Float32Array(48000).fill(0.25), 48000);
  assert.equal(out.length, 16000);
  assert.ok(Math.abs(out[100] - 0.25) < 1e-6);
});

test("pickVoices gives the caller and Holly different voices", () => {
  const plan = pickVoices([
    { name: "Samantha", lang: "en-US" },
    { name: "Daniel", lang: "en-GB" },
    { name: "Thomas", lang: "fr-FR" },
  ]);
  assert.equal(plan.agent.voice?.name, "Samantha");
  assert.equal(plan.caller.voice?.name, "Daniel");
});

test("pickVoices falls back to pitch when only one voice exists", () => {
  const plan = pickVoices([{ name: "Only", lang: "en-US" }]);
  assert.equal(plan.caller.voice?.name, "Only");
  assert.ok(plan.agent.pitch - plan.caller.pitch >= 0.6);
  assert.notEqual(plan.caller.pitch, plan.agent.pitch);
});

test("pickVoices does not read Female as Male", () => {
  const plan = pickVoices([
    { name: "Microsoft Zira - English (United States)", lang: "en-US" },
    { name: "Google UK English Female", lang: "en-GB" },
    { name: "Google UK English Male", lang: "en-GB" },
  ]);
  assert.equal(plan.caller.voice?.name, "Google UK English Male");
  assert.notEqual(plan.agent.voice?.name, plan.caller.voice?.name);
});
