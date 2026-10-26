import type { ShopMode } from "./types";

/** Meta Model API. Documented base URL: https://dev.meta.ai/docs */
export const DEFAULT_MUSE_BASE_URL = "https://api.meta.ai/v1";

/**
 * Model ids from https://dev.meta.ai/docs/models
 * Wonder researches and writes scenarios. Spark plays the calls.
 */
export const MUSE_MODELS = {
  wonder: "muse-wonder-1.0",
  spark: "muse-spark-1.3",
} as const;

export type ReasoningEffort =
  | "minimal"
  | "low"
  | "medium"
  | "high"
  | "xhigh"
  | "max";

export type ChatMessage = {
  role: "developer" | "system" | "user" | "assistant";
  content: string;
};

export class MuseError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "MuseError";
    this.status = status;
  }
}

export function museBaseUrl(): string {
  const configured = process.env.MUSE_BASE_URL?.trim();
  return (configured || DEFAULT_MUSE_BASE_URL).replace(/\/$/, "");
}

/** Live when a key is present. Otherwise the app stays on the local mock shopper. */
export function museMode(): ShopMode {
  return process.env.MUSE_API_KEY?.trim() ? "live" : "mock";
}

export async function museChat(options: {
  model: string;
  messages: ChatMessage[];
  reasoningEffort?: ReasoningEffort;
  responseFormat?: Record<string, unknown>;
  maxCompletionTokens?: number;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    messages: options.messages,
    reasoning_effort: options.reasoningEffort ?? "low",
  };
  if (options.responseFormat) {
    body.response_format = options.responseFormat;
  }
  if (options.maxCompletionTokens) {
    body.max_completion_tokens = options.maxCompletionTokens;
  }

  const data = await musePost("/chat/completions", body);
  const content = readChatContent(data);
  if (!content.trim()) {
    throw new MuseError("Muse returned an empty chat completion.", 502);
  }
  return content;
}

/**
 * Responses API. Used for Wonder because search grounding is not available
 * on chat completions. Structured output goes in `text.format`.
 */
export async function museRespond(options: {
  model: string;
  input: string;
  schemaName: string;
  schema: Record<string, unknown>;
  webSearch?: boolean;
  reasoningEffort?: ReasoningEffort;
}): Promise<string> {
  const body: Record<string, unknown> = {
    model: options.model,
    input: options.input,
    reasoning: { effort: options.reasoningEffort ?? "medium" },
    max_output_tokens: 8000,
    text: {
      format: {
        type: "json_schema",
        name: options.schemaName,
        strict: true,
        schema: options.schema,
      },
    },
  };
  if (options.webSearch) {
    body.tools = [{ type: "web_search", search_context_size: "medium" }];
  }

  const data = await musePost("/responses", body);
  const status = readStatus(data);
  if (status && status !== "completed") {
    throw new MuseError(`Muse response ended with status "${status}".`, 502);
  }
  const text = readResponseText(data);
  if (!text) {
    throw new MuseError("Muse returned an empty response.", 502);
  }
  return text;
}

async function musePost(path: string, body: unknown): Promise<unknown> {
  const key = process.env.MUSE_API_KEY?.trim();
  if (!key) {
    throw new MuseError("MUSE_API_KEY is not set.", 401);
  }

  const response = await fetch(`${museBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) {
    throw new MuseError(
      `Muse ${path} failed (${response.status}): ${text.slice(0, 400)}`,
      response.status,
    );
  }
  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new MuseError("Muse returned a body that was not JSON.", 502);
  }
}

function readChatContent(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const choices = (data as { choices?: unknown }).choices;
  if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== "object") {
    return "";
  }
  const content = (choices[0] as { message?: { content?: unknown } }).message
    ?.content;
  return typeof content === "string" ? content : "";
}

function readStatus(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const status = (data as { status?: unknown }).status;
  return typeof status === "string" ? status : "";
}

function readResponseText(data: unknown): string {
  if (!data || typeof data !== "object") return "";
  const output = (data as { output?: unknown }).output;
  if (!Array.isArray(output)) return "";
  const chunks: string[] = [];
  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    if ((item as { type?: unknown }).type !== "message") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (!block || typeof block !== "object") continue;
      if ((block as { type?: unknown }).type !== "output_text") continue;
      const text = (block as { text?: unknown }).text;
      if (typeof text === "string") chunks.push(text);
    }
  }
  return chunks.join("\n").trim();
}
