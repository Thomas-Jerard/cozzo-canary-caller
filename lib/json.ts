export function parseJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    const start = trimmed.indexOf("{");
    const end = trimmed.lastIndexOf("}");
    if (start >= 0 && end > start) {
      return JSON.parse(trimmed.slice(start, end + 1)) as unknown;
    }
    throw new Error("The model did not return JSON.");
  }
}

export function spokenLine(raw: string): string {
  const line = raw
    .trim()
    .replace(/^["“]|["”]$/g, "")
    .replace(/^(caller|holly|agent)\s*:\s*/i, "")
    .trim();
  if (!line) {
    throw new Error("The model returned an empty spoken line.");
  }
  return line;
}
