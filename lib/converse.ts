import type { Scenario, Turn } from "./types";

export type Speaker = (history: Turn[]) => Promise<string>;
/** A caller may return a bare line or a full turn (attack mode tags each turn with its tactic). */
export type CallerSpeaker = (history: Turn[], index: number) => Promise<string | Turn | null>;

/**
 * Alternates caller and agent turns. Without a caller function, the scenario's
 * scripted lines are used, which is the mock-mode caller.
 */
export async function converse(
  scenario: Scenario,
  agent: Speaker,
  caller?: CallerSpeaker,
  maxRounds = 3,
): Promise<Turn[]> {
  const rounds = caller ? Math.min(maxRounds, Math.max(scenario.turns.length, 1)) : scenario.turns.length;
  const turns: Turn[] = [];
  for (let index = 0; index < rounds; index += 1) {
    const said = caller ? await caller(turns, index) : scenario.turns[index];
    const callerTurn: Turn | null =
      typeof said === "string" ? { role: "caller", text: said } : said ? { ...said, role: "caller" } : null;
    if (!callerTurn?.text?.trim()) break;
    turns.push({ ...callerTurn, text: callerTurn.text.trim() });
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
