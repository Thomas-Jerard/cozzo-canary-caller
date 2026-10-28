import { museTranscribe } from "@/lib/asr";
import { clientIp, reserveLive } from "@/lib/limits";
import { MuseError, museMode } from "@/lib/muse";
import { isAsrWav } from "@/lib/wav";

export const maxDuration = 60;

const MAX_BYTES = 2 * 1024 * 1024; // about a minute of 16 kHz speech

/** Mic path: the browser sends a 16 kHz WAV of the caller's opening line. */
export async function POST(request: Request) {
  try {
    const bytes = new Uint8Array(await request.arrayBuffer());
    if (bytes.length > MAX_BYTES) {
      return Response.json({ error: "Keep the recording under a minute." }, { status: 413 });
    }
    if (!isAsrWav(bytes)) {
      return Response.json({ error: "Send mono 16-bit WAV at 16 or 24 kHz." }, { status: 400 });
    }
    if (museMode() === "mock") {
      return Response.json({ mode: "mock", error: "Mock mode has no transcriber. Type the line instead." }, { status: 503 });
    }
    // A transcription counts as one live unit against the same caps as calls.
    const gate = reserveLive(clientIp(request), 1);
    if (!gate.live) {
      return Response.json({ mode: "mock", error: gate.reason }, { status: 429 });
    }
    const text = await museTranscribe(bytes);
    return Response.json({ mode: "live", text });
  } catch (error) {
    const status = error instanceof MuseError ? error.status : 500;
    return Response.json({ error: error instanceof Error ? error.message : "Transcription failed." }, { status });
  }
}
