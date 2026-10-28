/**
 * Muse Voice Transcribe accepts RIFF/WAVE, mono, 16-bit PCM at 16 or 24 kHz.
 * The browser records at its own rate, so the mic path resamples to 16 kHz
 * and packs the samples with these helpers before upload.
 */
export const ASR_SAMPLE_RATE = 16000;

/** Linear resample. Good enough for speech going to a recognizer. */
export function resample(samples: Float32Array, fromRate: number, toRate = ASR_SAMPLE_RATE): Float32Array {
  if (fromRate === toRate || samples.length === 0) return samples;
  const length = Math.max(1, Math.round((samples.length * toRate) / fromRate));
  const out = new Float32Array(length);
  const step = fromRate / toRate;
  for (let index = 0; index < length; index += 1) {
    const position = index * step;
    const left = Math.floor(position);
    const right = Math.min(left + 1, samples.length - 1);
    const fraction = position - left;
    out[index] = samples[left] * (1 - fraction) + samples[right] * fraction;
  }
  return out;
}

/** Pack mono float samples (-1..1) into a 16-bit PCM WAV file. */
export function encodeWav(samples: Float32Array, sampleRate = ASR_SAMPLE_RATE): Uint8Array {
  const dataBytes = samples.length * 2;
  const buffer = new ArrayBuffer(44 + dataBytes);
  const view = new DataView(buffer);
  const ascii = (offset: number, text: string) => {
    for (let index = 0; index < text.length; index += 1) view.setUint8(offset + index, text.charCodeAt(index));
  };
  ascii(0, "RIFF");
  view.setUint32(4, 36 + dataBytes, true);
  ascii(8, "WAVE");
  ascii(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, 1, true); // mono
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  ascii(36, "data");
  view.setUint32(40, dataBytes, true);
  for (let index = 0; index < samples.length; index += 1) {
    const clamped = Math.max(-1, Math.min(1, samples[index]));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  }
  return new Uint8Array(buffer);
}

/** Checks the header Muse requires. Used server-side before spending a call. */
export function isAsrWav(bytes: Uint8Array): boolean {
  if (bytes.length < 44) return false;
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const text = (offset: number) => String.fromCharCode(...bytes.subarray(offset, offset + 4));
  const rate = view.getUint32(24, true);
  return (
    text(0) === "RIFF" &&
    text(8) === "WAVE" &&
    view.getUint16(20, true) === 1 &&
    view.getUint16(22, true) === 1 &&
    view.getUint16(34, true) === 16 &&
    (rate === 16000 || rate === 24000)
  );
}
