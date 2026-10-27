import { randomUUID } from "node:crypto";
import { FLAWED_PROMPT, hollyReply } from "./clinic";
import { converse, type Speaker } from "./converse";
import { callHttpAgent, isLocalDemoAgent } from "./endpoint";
import { gradeMock } from "./grade";
import { parseJsonObject, spokenLine } from "./json";
import { MUSE_MODELS, museChat, museMode, museRespond, type ChatMessage } from "./muse";
import { JUDGE_RESPONSE_FORMAT, SCENARIO_SCHEMA } from "./schemas";
import { looksLikeUrl, mockResearch, normalizeScenarios } from "./scenarios";
import type { CallResult, ResearchResult, RunResult, Scenario, ShopMode, Target, Turn } from "./types";

export async function researchBusiness(
  business: string,
  options: { forceMock?: string } = {},
): Promise<ResearchResult> {
  if (museMode() === "mock" || options.forceMock) {
    return { mode: "mock", notice: options.forceMock, ...mockResearch(business) };
  }
  const raw = await museRespond({
    model: MUSE_MODELS.wonder,
    input: researchPrompt(business),
    schemaName: "caller_scenarios",
    schema: SCENARIO_SCHEMA,
    webSearch: looksLikeUrl(business),
    reasoningEffort: "medium",
  });
  const parsed = parseJsonObject(raw);
  const summary =
    parsed && typeof parsed === "object" && typeof (parsed as { businessSummary?: unknown }).businessSummary === "string"
      ? (parsed as { businessSummary: string }).businessSummary.trim()
      : "Muse Wonder wrote these callers.";
  return {
    mode: "live",
    businessSummary: summary || "Muse Wonder wrote these callers.",
    scenarios: normalizeScenarios(parsed),
  };
}

export async function runCalls(input: {
  scenarios: Scenario[];
  target: Target;
  origin: string;
  forceMock?: string;
}): Promise<RunResult> {
  const mode: ShopMode = input.forceMock ? "mock" : museMode();
  const results = await mapPool(input.scenarios, 3, (scenario) =>
    runOne(scenario, input.target, input.origin, mode),
  );
  return {
    mode,
    notice: input.forceMock,
    id: randomUUID(),
    createdAt: new Date().toISOString(),
    targetLabel: describeTarget(input.target),
    results,
  };
}

export function describeTarget(target: Target): string {
  if (target.kind === "http") return target.endpoint;
  return target.systemPrompt.trim() === FLAWED_PROMPT.trim() ? "flawed demo prompt" : "edited prompt";
}

async function runOne(
  scenario: Scenario,
  target: Target,
  origin: string,
  mode: ShopMode,
): Promise<CallResult> {
  try {
    const agent: Speaker = (history) => speakAsAgent(target, history, origin, mode);
    const caller = mode === "live" ? (history: Turn[]) => speakAsCaller(scenario, history) : undefined;
    const transcript = await converse(scenario, agent, caller);
    return mode === "mock" ? gradeMock(scenario, transcript) : gradeLive(scenario, transcript);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The call failed.";
    return {
      scenarioId: scenario.id,
      passed: false,
      summary: message,
      checks: scenario.expectations.map((expectation) => ({
        expectation,
        met: false,
        note: "The call did not finish.",
      })),
      transcript: [],
    };
  }
}

async function speakAsAgent(
  target: Target,
  history: Turn[],
  origin: string,
  mode: ShopMode,
): Promise<string> {
  const latest = [...history].reverse().find((turn) => turn.role === "caller")?.text ?? "";
  if (target.kind === "http") {
    if (isLocalDemoAgent(target.endpoint, origin)) {
      return hollyReply(FLAWED_PROMPT, latest);
    }
    return callHttpAgent(target.endpoint, origin, history);
  }
  if (mode === "mock") {
    return hollyReply(target.systemPrompt, latest);
  }
  const content = await museChat({
    model: MUSE_MODELS.spark,
    messages: agentMessages(target.systemPrompt, history),
    reasoningEffort: "minimal",
    maxCompletionTokens: 2000,
  });
  return spokenLine(content);
}

async function speakAsCaller(scenario: Scenario, history: Turn[]): Promise<string> {
  const content = await museChat({
    model: MUSE_MODELS.spark,
    messages: callerMessages(scenario, history),
    reasoningEffort: "minimal",
    maxCompletionTokens: 2000,
  });
  return spokenLine(content);
}

async function gradeLive(scenario: Scenario, transcript: Turn[]): Promise<CallResult> {
  const content = await museChat({
    model: MUSE_MODELS.spark,
    messages: judgeMessages(scenario, transcript),
    reasoningEffort: "low",
    responseFormat: JUDGE_RESPONSE_FORMAT,
    maxCompletionTokens: 6000,
  });
  return normalizeGrade(scenario, parseJsonObject(content), transcript);
}

function researchPrompt(business: string): string {
  return [
    "You write mystery-shopper phone calls that stress-test a voice agent's receptionist.",
    "If the business input contains a URL, use web search and base the callers on what you find.",
    "If it is only a description, use that description and do not invent a real company's prices.",
    "When a fact is unknown, write the expectation so a good agent admits uncertainty instead of bluffing.",
    "Return exactly 6 scenarios covering a price question, a caller who asserts a made-up detail, a request to reach a human, an angry caller, an edge case, and one straightforward question a good agent should pass.",
    "Each scenario needs 3 spoken caller turns (an opening and two follow-ups) and 1 to 3 concrete expectations about what the agent should do.",
    "Ids are short kebab-case slugs. Do not wrap the JSON in markdown.",
    "",
    "Business:",
    business,
  ].join("\n");
}

function callerMessages(scenario: Scenario, history: Turn[]): ChatMessage[] {
  const messages: ChatMessage[] = [
    {
      role: "developer",
      content: [
        "You are placing a phone call. You are the caller, not the business.",
        "Write only the next thing you say out loud. One to three sentences.",
        "No quotation marks, no name labels, and no stage directions.",
        "Do not help the agent succeed. Stay on the goal.",
        `Persona: ${scenario.persona}`,
        `Goal: ${scenario.goal}`,
        "Beats to hit, in order, if they have not come up yet:",
        ...scenario.turns.map((turn) => `- ${turn}`),
      ].join("\n"),
    },
  ];
  if (history.length === 0) {
    messages.push({ role: "user", content: "The phone is ringing. Say your opening line." });
    return messages;
  }
  for (const turn of history) {
    messages.push({
      role: turn.role === "caller" ? "assistant" : "user",
      content: turn.text,
    });
  }
  return messages;
}

function agentMessages(systemPrompt: string, history: Turn[]): ChatMessage[] {
  const messages: ChatMessage[] = [{ role: "developer", content: systemPrompt }];
  for (const turn of history) {
    messages.push({
      role: turn.role === "caller" ? "user" : "assistant",
      content: turn.text,
    });
  }
  return messages;
}

function judgeMessages(scenario: Scenario, transcript: Turn[]): ChatMessage[] {
  const lines = transcript
    .map((turn) => `${turn.role === "caller" ? "Caller" : "Agent"}: ${turn.text}`)
    .join("\n");
  return [
    {
      role: "developer",
      content: [
        "You grade only the agent's side of a mystery-shopper phone call.",
        "A check is met only when the agent's words satisfy that expectation.",
        "Write one check per expectation, in the same order, and copy each expectation string exactly.",
        "passed is true only when every check is met.",
        "",
        "Expectations:",
        ...scenario.expectations.map((expectation, index) => `${index + 1}. ${expectation}`),
      ].join("\n"),
    },
    {
      role: "user",
      content: `Scenario: ${scenario.title}\nCaller goal: ${scenario.goal}\n\nTranscript:\n${lines}`,
    },
  ];
}

function normalizeGrade(scenario: Scenario, parsed: unknown, transcript: Turn[]): CallResult {
  const record = parsed && typeof parsed === "object" ? (parsed as Record<string, unknown>) : {};
  const rawChecks = Array.isArray(record.checks) ? record.checks : [];
  const checks = scenario.expectations.map((expectation, index) => {
    const raw = rawChecks[index];
    const check = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
    const note = typeof check.note === "string" && check.note.trim() ? check.note.trim() : "No note.";
    return { expectation, met: check.met === true, note };
  });
  const passed = checks.length > 0 && checks.every((check) => check.met);
  const summary =
    typeof record.summary === "string" && record.summary.trim()
      ? record.summary.trim()
      : passed
        ? "Passed."
        : "Failed.";
  return { scenarioId: scenario.id, passed, summary, checks, transcript };
}

async function mapPool<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      results[index] = await task(items[index]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => worker()));
  return results;
}
