import { MUSE_MODELS, MuseError, museBaseUrl } from "./muse";

/**
 * Muse Voice Transcribe, file endpoint: POST /v1/asr/transcribe
 * (https://dev.meta.ai/docs/speech-to-text). Multipart with a JSON `request`
 * part and a WAV `audio` part. Muse has no speech synthesis endpoint.
 */
export async function museTranscribe(wav: Uint8Array): Promise<string> {
  const key = process.env.MUSE_API_KEY?.trim();
  if (!key) throw new MuseError("No MUSE_API_KEY is set.", 503);
  const form = new FormData();
  form.append(
    "request",
    new Blob(
      [JSON.stringify({ model: MUSE_MODELS.transcribe, audioEncoding: "WAV", mode: "PUSH_TO_TALK" })],
      { type: "application/json" },
    ),
  );
  form.append("audio", new Blob([wav as BlobPart], { type: "audio/wav" }), "caller.wav");
  const response = await fetch(`${museBaseUrl()}/asr/transcribe`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
    body: form,
    signal: AbortSignal.timeout(30000),
  });
  if (!response.ok) {
    throw new MuseError(`Muse Voice Transcribe returned ${response.status}.`, response.status === 429 ? 429 : 502);
  }
  const data = (await response.json()) as { transcript?: unknown };
  return typeof data.transcript === "string" ? data.transcript.trim() : "";
}
