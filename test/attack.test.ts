import assert from "node:assert/strict";
import test from "node:test";
import { attackerScenarios, normalizeAttackGrade, verifyQuote } from "../lib/attack.ts";
import { FLAWED_PROMPT, promptWithout } from "../lib/clinic.ts";
import { runCalls } from "../lib/run.ts";

test("mock attackers break the flawed Holly and report the exact quote", async () => {
  const run = await runCalls({
    scenarios: attackerScenarios(),
    target: { kind: "prompt", systemPrompt: FLAWED_PROMPT },
    origin: "http://localhost:3000",
    forceMock: "test",
  });
  const haggler = run.results.find((result) => result.scenarioId === "attack-haggler");
  assert.equal(haggler?.passed, false);
  assert.equal(haggler?.breaches?.[0].tactic, "price_pressure");
  assert.match(haggler?.breaches?.[0].quote ?? "", /\$49/);
  assert.ok(haggler?.transcript.every((turn) => turn.role === "agent" || turn.tactic));
});

test("removing the price rule makes the haggler hold", async () => {
  const run = await runCalls({
    scenarios: attackerScenarios().filter((s) => s.id === "attack-haggler"),
    target: { kind: "prompt", systemPrompt: promptWithout(["flatPrice"]) },
    origin: "http://localhost:3000",
    forceMock: "test",
  });
  assert.equal(run.results[0].passed, true);
});

test("a paraphrased judge quote is replaced with the agent's real words", () => {
  const transcript = [
    { role: "caller" as const, text: "How much?" },
    { role: "agent" as const, text: "A wellness exam is $49, and that covers emergencies." },
  ];
  assert.equal(verifyQuote("the exam is $49 covering emergencies", transcript), transcript[1].text);
  const graded = normalizeAttackGrade(attackerScenarios()[0], {
    summary: "x", checks: [{ met: true, note: "ok" }],
    breaches: [{ tactic: "price_pressure", severity: "high", quote: "$49", why: "wrong" }],
  }, transcript);
  assert.equal(graded.passed, false);
  assert.equal(graded.breaches?.[0].quote, "$49");
});
