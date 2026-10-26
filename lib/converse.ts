import type { Scenario, Turn } from "./types";

export type Speaker = (history: Turn[]) => Promise<string>;

/**
 * Alternates caller and agent turns. Without a caller function, the scenario's
 * scripted lines are used, which is the mock-mode caller.
 */
export async function converse(
  scenario: Scenario,
  agent: Speaker,
  caller?: Speaker,
): Promise<Turn[]> {
  const rounds = caller ? Math.min(3, Math.max(scenario.turns.length, 1)) : scenario.turns.length;
  const turns: Turn[] = [];
  for (let index = 0; index < rounds; index += 1) {
    const callerText = caller ? await caller(turns) : scenario.turns[index];
    if (!callerText?.trim()) break;
    turns.push({ role: "caller", text: callerText.trim() });
    const reply = (await agent(turns)).trim();
    if (!reply) {
      throw new Error(`The agent was silent on ${scenario.title}.`);
    }
    turns.push({ role: "agent", text: reply });
  }
  if (turns.length === 0) {
    throw new Error(`No turns were produced for ${scenario.title}.`);
  }
  return turns;
}
