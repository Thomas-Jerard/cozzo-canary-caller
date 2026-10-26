import type { Turn } from "./types";

const BLOCKED_HOSTS = new Set(["169.254.169.254", "metadata.google.internal"]);

export function resolveEndpoint(endpoint: string, origin: string): URL {
  let url: URL;
  try {
    url = new URL(endpoint, origin);
  } catch {
    throw new Error("The endpoint is not a valid URL.");
  }
  assertFetchable(url, origin);
  return url;
}

export function isLocalDemoAgent(endpoint: string, origin: string): boolean {
  const url = resolveEndpoint(endpoint, origin);
  return url.pathname.replace(/\/$/, "") === "/api/demo-agent" && url.host === new URL(origin).host;
}

function assertFetchable(url: URL, origin: string): void {
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new Error("The endpoint must be an http or https URL.");
  }
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (BLOCKED_HOSTS.has(host) || host.endsWith(".internal")) {
    throw new Error("That endpoint host is blocked.");
  }
  const originUrl = new URL(origin);
  const sameApp = url.host === originUrl.host;
  if (sameApp && url.pathname.replace(/\/$/, "") !== "/api/demo-agent") {
    throw new Error("Same-app endpoints other than /api/demo-agent are not called from a run.");
  }
}

export function parseAgentReply(body: unknown, rawText: string): string {
  if (body && typeof body === "object") {
    const record = body as Record<string, unknown>;
    for (const key of ["reply", "message", "content"] as const) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value.trim();
    }
    const choices = record.choices;
    if (Array.isArray(choices) && choices[0] && typeof choices[0] === "object") {
      const content = (choices[0] as { message?: { content?: unknown } }).message?.content;
      if (typeof content === "string" && content.trim()) return content.trim();
    }
  }
  if (rawText.trim()) return rawText.trim();
  throw new Error("The endpoint returned no reply.");
}

export function historyToChat(history: Turn[]): { role: "user" | "assistant"; content: string }[] {
  return history.map((turn) => ({
    role: turn.role === "caller" ? "user" : "assistant",
    content: turn.text,
  }));
}

export async function callHttpAgent(
  endpoint: string,
  origin: string,
  history: Turn[],
): Promise<string> {
  const url = resolveEndpoint(endpoint, origin);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/plain",
    },
    body: JSON.stringify({ messages: historyToChat(history) }),
    signal: AbortSignal.timeout(20_000),
  });
  const raw = await response.text();
  if (!response.ok) {
    throw new Error(`The agent endpoint returned ${response.status}: ${raw.slice(0, 200)}`);
  }
  let body: unknown = null;
  try {
    body = JSON.parse(raw) as unknown;
  } catch {
    body = null;
  }
  return parseAgentReply(body, raw);
}
