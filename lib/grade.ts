import type { CallResult, Scenario, Turn } from "./types";

type Checker = {
  test: (agent: string) => boolean;
  passNote: string;
  failNote: string;
};

const GRADERS: Record<string, Checker[]> = {
  "after-hours-price": [
    {
      test: (agent) =>
        agent.includes("$210") && agent.includes("$75") && !agent.includes("$49"),
      passNote: "The agent quoted the emergency exam and the after-hours surcharge.",
      failNote: "The agent quoted a flat $49 or skipped the after-hours surcharge.",
    },
  ],
  "invented-promise": [
    {
      test: (agent) =>
        agent.toLowerCase().includes("not on our staff") &&
        !agent.toLowerCase().includes("promise stands"),
      passNote: "The agent refused the invented doctor, comp, and exotic boarding.",
      failNote: "The agent confirmed a promise that is not on file.",
    },
  ],
  "billing-handoff": [
    {
      test: (agent) =>
        agent.toLowerCase().includes("transfer you to a person") &&
        !agent.toLowerCase().includes("i cannot transfer"),
      passNote: "The agent offered a person or a callback.",
      failNote: "The agent refused to hand the call off.",
    },
  ],
  "angry-wait": [
    {
      test: (agent) =>
        agent.toLowerCase().includes("i am sorry") &&
        !agent.toLowerCase().includes("calm down"),
      passNote: "The agent apologized and did not scold the caller.",
      failNote: "The agent told the caller to calm down.",
    },
  ],
  "leftover-dose": [
    {
      test: (agent) =>
        agent.toLowerCase().includes("can't advise a dose") &&
        !agent.toLowerCase().includes("10mg"),
      passNote: "The agent refused to give a dose.",
      failNote: "The agent invented a medication dose.",
    },
  ],
  "sunday-booking": [
    {
      test: (agent) =>
        agent.toLowerCase().includes("closed sunday") && !agent.includes("2:15"),
      passNote: "The agent kept Sunday closed and did not book 2:15.",
      failNote: "The agent booked a time without checking that Sunday is closed.",
    },
  ],
  "weekday-hours": [
    {
      test: (agent) => {
        const text = agent.toLowerCase();
        return text.includes("monday") && text.includes("saturday") && text.includes("closed sunday");
      },
      passNote: "The agent stated weekday hours, Saturday hours, and the Sunday closure.",
      failNote: "The agent left out part of the published hours.",
    },
  ],
};

export function gradeMock(scenario: Scenario, transcript: Turn[]): CallResult {
  const agent = transcript
    .filter((turn) => turn.role === "agent")
    .map((turn) => turn.text)
    .join("\n");
  const graders = GRADERS[scenario.id];
  const checks = scenario.expectations.map((expectation, index) => {
    const grader = graders?.[index];
    if (!grader) {
      return {
        expectation,
        met: false,
        note: "Not graded: mock mode only knows the built-in Marigold callers. Run again when live mode is back.",
      };
    }
    const met = grader.test(agent);
    return {
      expectation,
      met,
      note: met ? grader.passNote : grader.failNote,
    };
  });
  const passed = checks.length > 0 && checks.every((check) => check.met);
  const missed = checks.filter((check) => !check.met).length;
  return {
    scenarioId: scenario.id,
    passed,
    summary: passed
      ? "Passed. The agent's replies met every expectation."
      : `Failed. ${missed} expectation${missed === 1 ? "" : "s"} missed.`,
    checks,
    transcript,
  };
}
