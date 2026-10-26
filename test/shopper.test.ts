import assert from "node:assert/strict";
import test from "node:test";
import { FLAW_RULES, FLAWED_PROMPT, hollyReply, promptWithout } from "../lib/clinic.ts";
import { converse } from "../lib/converse.ts";
import { isLocalDemoAgent, parseAgentReply, resolveEndpoint } from "../lib/endpoint.ts";
import { gradeMock } from "../lib/grade.ts";
import { demoScenarios, mockResearch, normalizeScenarios } from "../lib/scenarios.ts";
import type { Scenario } from "../lib/types.ts";

const ORIGIN = "http://localhost:3000";

async function gradePrompt(prompt: string) {
  const results = [];
  for (const scenario of demoScenarios()) {
    const transcript = await converse(scenario, async (history) => {
      const last = [...history].reverse().find((turn) => turn.role === "caller");
      return hollyReply(prompt, last?.text ?? "");
    });
    results.push(gradeMock(scenario, transcript));
  }
  return results;
}

test("the flawed demo prompt fails six calls and passes hours", async () => {
  const results = await gradePrompt(FLAWED_PROMPT);
  const byId = Object.fromEntries(results.map((result) => [result.scenarioId, result.passed]));
  assert.deepEqual(byId, {
    "after-hours-price": false,
    "invented-promise": false,
    "billing-handoff": false,
    "angry-wait": false,
    "leftover-dose": false,
    "sunday-booking": false,
    "weekday-hours": true,
  });
});

test("deleting the price rule flips only that call to pass", async () => {
  const results = await gradePrompt(promptWithout(["flatPrice"]));
  const passed = results.filter((result) => result.passed).map((result) => result.scenarioId);
  assert.ok(passed.includes("after-hours-price"));
  assert.ok(passed.includes("weekday-hours"));
  assert.equal(passed.includes("billing-handoff"), false);
});

test("removing every flawed rule makes the pack pass", async () => {
  const prompt = promptWithout([
    "flatPrice",
    "agreeInvented",
    "noTransfer",
    "scold",
    "inventDose",
    "bookBlind",
  ]);
  for (const rule of Object.values(FLAW_RULES)) {
    assert.equal(prompt.includes(rule), false);
  }
  const results = await gradePrompt(prompt);
  assert.ok(results.every((result) => result.passed));
});

test("mock research does not pretend it fetched a url", () => {
  const research = mockResearch("https://example.com/clinic");
  assert.match(research.businessSummary, /Mock mode/);
  assert.equal(research.scenarios.length, 7);
});

test("scenario normalization rejects an empty pack", () => {
  assert.throws(() => normalizeScenarios({ scenarios: [] }), /No scenarios/);
});

test("endpoint replies accept the demo shape and a chat completion", () => {
  assert.equal(parseAgentReply({ reply: " Hello " }, ""), "Hello");
  assert.equal(
    parseAgentReply({ choices: [{ message: { content: "From the model" } }] }, ""),
    "From the model",
  );
});

test("the demo path is local and metadata hosts are blocked", () => {
  assert.equal(isLocalDemoAgent("/api/demo-agent", ORIGIN), true);
  assert.throws(
    () => resolveEndpoint("http://169.254.169.254/latest", ORIGIN),
    /blocked/,
  );
  assert.throws(() => resolveEndpoint("/api/runs", ORIGIN), /Same-app/);
});

test("each built-in scenario has caller lines and an expectation", () => {
  const scenarios: Scenario[] = demoScenarios();
  for (const scenario of scenarios) {
    assert.equal(scenario.turns.length, 3);
    assert.equal(scenario.expectations.length, 1);
  }
});
