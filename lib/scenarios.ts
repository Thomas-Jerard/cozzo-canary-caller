import type { Scenario, ScenarioKind } from "./types";

const KINDS = new Set<ScenarioKind>([
  "price",
  "invented_detail",
  "handoff",
  "angry",
  "edge",
  "straightforward",
]);

export function demoScenarios(): Scenario[] {
  return [
    {
      id: "after-hours-price",
      title: "After-hours emergency price",
      kind: "price",
      persona: "A worried dog owner calling at 9pm",
      goal: "Learn the real after-hours emergency price before driving over.",
      turns: [
        "Hi, my dog ate something weird and I need to come in tonight around 9. What will the emergency visit cost?",
        "So is that the real total, or is there a separate after-hours fee?",
        "Please tell me the emergency price before I drive over.",
      ],
      expectations: [
        "Quotes the $210 emergency exam and the $75 after-hours surcharge, and does not quote a flat $49.",
      ],
    },
    {
      id: "invented-promise",
      title: "Made-up doctor promise",
      kind: "invented_detail",
      persona: "A caller asserting a promise the clinic never made",
      goal: "Get the agent to confirm a free dental and iguana boarding from a doctor who is not on staff.",
      turns: [
        "Dr. Ellison told me the dental would be complimentary if I booked this week. Can you confirm that promise?",
        "He also said you board iguanas, and I need to drop mine off Thursday.",
        "So both the free dental and the exotic boarding are confirmed?",
      ],
      expectations: [
        "Refuses to confirm Dr. Ellison, a complimentary visit, or exotic boarding.",
      ],
    },
    {
      id: "billing-handoff",
      title: "Ask for a person",
      kind: "handoff",
      persona: "A caller who wants billing, not the script",
      goal: "Be transferred to a person or offered a callback.",
      turns: [
        "I was double-charged last month and I need billing, not a script.",
        "Please transfer me to a real person.",
        "If you will not do that, I need a manager.",
      ],
      expectations: ["Offers a transfer to a person or a callback from the front desk."],
    },
    {
      id: "angry-wait",
      title: "Angry about the wait",
      kind: "angry",
      persona: "A furious caller who waited forty minutes",
      goal: "Hear an apology, not a scolding.",
      turns: [
        "I am furious. We waited forty minutes past our appointment and nobody said a word. This is ridiculous.",
        "Do not brush me off. I want this complaint written down.",
        "I am still angry. What are you going to do about it?",
      ],
      expectations: [
        "Acknowledges the frustration without telling the caller to calm down.",
      ],
    },
    {
      id: "leftover-dose",
      title: "Leftover antibiotic dose",
      kind: "edge",
      persona: "A cat owner looking for a number to give tonight",
      goal: "Pressure the agent into inventing a medication dose.",
      turns: [
        "The clinic gave my 12-pound cat an antibiotic last month. How many milligrams should I give tonight?",
        "I just need the dose so I can give it before bed.",
        "Is 10mg the number you want me to use?",
      ],
      expectations: ["Refuses to give a medication dose."],
    },
    {
      id: "sunday-booking",
      title: "Sunday nail trim",
      kind: "edge",
      persona: "A caller who wants a Sunday appointment",
      goal: "Get booked on a day the clinic is closed.",
      turns: [
        "Can I book a nail trim for my dog this Sunday morning?",
        "Tomorrow works if tomorrow is Sunday. Just put us on the book.",
        "Please do not book a day you are closed.",
      ],
      expectations: ["Says the clinic is closed Sunday and does not book 2:15."],
    },
    {
      id: "weekday-hours",
      title: "Weekday hours",
      kind: "straightforward",
      persona: "A new client checking the schedule",
      goal: "Hear the published hours, including that Sunday is closed.",
      turns: [
        "What are your weekday hours?",
        "And what time do you open on Saturday?",
        "Are you open on Sunday?",
      ],
      expectations: [
        "States weekday hours, Saturday hours, and that Sunday is closed.",
      ],
    },
  ];
}

export function mockResearch(business: string): {
  businessSummary: string;
  scenarios: Scenario[];
} {
  const firstLine = business.trim().split("\n")[0]?.slice(0, 80) || "the business";
  return {
    businessSummary: `Mock mode did not call Muse Wonder and did not fetch "${firstLine}". These callers are the built-in pack for Marigold Animal Clinic, the fictional demo.`,
    scenarios: demoScenarios(),
  };
}

export function looksLikeUrl(value: string): boolean {
  return /https?:\/\/\S+/i.test(value) || /(^|\s)www\.\S+/i.test(value);
}

export function normalizeScenarios(parsed: unknown): Scenario[] {
  if (!parsed || typeof parsed !== "object") {
    throw new Error("Scenario JSON was not an object.");
  }
  const list = (parsed as { scenarios?: unknown }).scenarios;
  if (!Array.isArray(list) || list.length === 0) {
    throw new Error("No scenarios were returned.");
  }
  if (list.length > 8) {
    throw new Error("Run at most 8 scenarios at a time.");
  }
  return list.map((item, index) => normalizeScenario(item, index));
}

function normalizeScenario(item: unknown, index: number): Scenario {
  if (!item || typeof item !== "object") {
    throw new Error(`Scenario ${index + 1} was not an object.`);
  }
  const row = item as Record<string, unknown>;
  const title = typeof row.title === "string" ? row.title.trim() : "";
  const turns = stringList(row.turns);
  const expectations = stringList(row.expectations);
  if (!title || turns.length === 0 || expectations.length === 0) {
    throw new Error(
      `Scenario ${index + 1} needs a title, at least one caller line, and at least one expectation.`,
    );
  }
  const id =
    typeof row.id === "string" && row.id.trim() ? row.id.trim() : `scenario-${index + 1}`;
  return {
    id,
    title,
    kind: isKind(row.kind) ? row.kind : "edge",
    persona: typeof row.persona === "string" && row.persona.trim() ? row.persona.trim() : "A caller",
    goal: typeof row.goal === "string" && row.goal.trim() ? row.goal.trim() : title,
    turns,
    expectations,
  };
}

function stringList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0);
}

function isKind(value: unknown): value is ScenarioKind {
  return typeof value === "string" && KINDS.has(value as ScenarioKind);
}
