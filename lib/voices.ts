/**
 * Muse has no text-to-speech model, so voice mode speaks with the browser's
 * Web Speech API. This picks two clearly different installed voices for the
 * caller (Cozzo) and Holly, and always sets a wide pitch/rate gap so they
 * stay distinct even when the browser only has one voice.
 */
export type VoiceInfo = { name: string; lang: string; localService?: boolean };

export type VoiceSetting<V> = { voice: V | null; pitch: number; rate: number };
export type VoicePlan<V extends VoiceInfo> = { caller: VoiceSetting<V>; agent: VoiceSetting<V> };

const FEMALE = /\b(female|woman|samantha|victoria|karen|moira|tessa|zira|aria|jenny|susan|allison|ava|serena|fiona|libby|sonia|emma|michelle|nicky|kate|joanna|salli|kimberly|ivy|natasha|catherine|hazel|google us english|google uk english female)\b/i;
const MALE = /\b(male|man|daniel|alex|fred|david|mark|guy|ryan|tom|aaron|arthur|george|rishi|oliver|james|christopher|eric|roger|steffan|brian|matthew|justin|joey|google uk english male)\b/i;

export function voiceGender(name: string): "f" | "m" | "?" {
  // Check female first: "female" contains "male".
  if (FEMALE.test(name)) return "f";
  if (MALE.test(name)) return "m";
  return "?";
}

export function pickVoices<V extends VoiceInfo>(voices: V[]): VoicePlan<V> {
  const english = voices.filter((voice) => /^en/i.test(voice.lang));
  const pool = english.length > 0 ? english : voices;
  const female = pool.filter((voice) => voiceGender(voice.name) === "f");
  const male = pool.filter((voice) => voiceGender(voice.name) === "m");
  const agent = female[0] ?? pool[0] ?? null;
  const caller =
    male.find((voice) => voice !== agent) ??
    pool.find((voice) => voice !== agent && voiceGender(voice.name) !== "f") ??
    pool.find((voice) => voice !== agent) ??
    null;
  const distinctGender = !!caller && !!agent && voiceGender(caller.name) !== voiceGender(agent.name);
  return {
    // Same voice (or same gender): push pitch and rate far apart.
    caller: { voice: caller ?? agent, pitch: distinctGender ? 0.9 : 0.7, rate: 0.95 },
    agent: { voice: agent, pitch: distinctGender ? 1.1 : 1.4, rate: 1.05 },
  };
}
