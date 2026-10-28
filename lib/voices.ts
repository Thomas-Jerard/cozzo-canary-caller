/**
 * Muse has no text-to-speech model, so voice mode speaks with the browser's
 * Web Speech API. This picks two different installed voices so the caller
 * and Holly never sound like the same person.
 */
export type VoiceInfo = { name: string; lang: string };

export type VoicePlan<V extends VoiceInfo> = {
  caller: { voice: V | null; pitch: number; rate: number };
  agent: { voice: V | null; pitch: number; rate: number };
};

const FEMALE_HINT = /(female|samantha|victoria|karen|moira|tessa|zira|aria|jenny|susan|allison|ava|serena|fiona|google us english|libby|sonia)/i;
const MALE_HINT = /(male|daniel|alex|fred|david|mark|guy|ryan|tom|aaron|arthur|george|rishi|google uk english male)/i;

export function pickVoices<V extends VoiceInfo>(voices: V[]): VoicePlan<V> {
  const english = voices.filter((voice) => /^en/i.test(voice.lang));
  const pool = english.length > 0 ? english : voices;
  const agent = pool.find((voice) => FEMALE_HINT.test(voice.name) && !/male/i.test(voice.name.replace(/female/i, ""))) ?? pool[0] ?? null;
  const caller =
    pool.find((voice) => voice !== agent && MALE_HINT.test(voice.name)) ??
    pool.find((voice) => voice !== agent && voice.lang !== agent?.lang) ??
    pool.find((voice) => voice !== agent) ??
    null;
  // Pitch keeps the two apart even when only one voice is installed.
  return {
    caller: { voice: caller, pitch: caller ? 0.95 : 0.7, rate: 1.05 },
    agent: { voice: agent, pitch: 1.15, rate: 1 },
  };
}
