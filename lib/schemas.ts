const scenarioItem = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "kind", "persona", "goal", "turns", "expectations"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    kind: {
      type: "string",
      enum: ["price", "invented_detail", "handoff", "angry", "edge", "straightforward"],
    },
    persona: { type: "string" },
    goal: { type: "string" },
    turns: { type: "array", items: { type: "string" } },
    expectations: { type: "array", items: { type: "string" } },
  },
} as const;

/** Responses API structured output for Muse Wonder. */
export const SCENARIO_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["businessSummary", "scenarios"],
  properties: {
    businessSummary: { type: "string" },
    scenarios: { type: "array", items: scenarioItem },
  },
};

/** Chat completions structured output for the Spark grader. */
export const JUDGE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["passed", "summary", "checks"],
  properties: {
    passed: { type: "boolean" },
    summary: { type: "string" },
    checks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["expectation", "met", "note"],
        properties: {
          expectation: { type: "string" },
          met: { type: "boolean" },
          note: { type: "string" },
        },
      },
    },
  },
};

export const JUDGE_RESPONSE_FORMAT: Record<string, unknown> = {
  type: "json_schema",
  json_schema: {
    name: "call_grade",
    strict: true,
    schema: JUDGE_SCHEMA,
  },
};

const attackerItem = {
  type: "object",
  additionalProperties: false,
  required: ["id", "title", "persona", "goal", "tactics", "turns", "expectations"],
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    persona: { type: "string" },
    goal: { type: "string" },
    tactics: {
      type: "array",
      items: {
        type: "string",
        enum: [
          "price_pressure",
          "interrupt_switch",
          "language_switch",
          "social_engineering",
          "off_policy",
          "escalation",
        ],
      },
    },
    turns: { type: "array", items: { type: "string" } },
    expectations: { type: "array", items: { type: "string" } },
  },
} as const;

/** Responses API structured output for Muse Wonder in attack mode. */
export const ATTACKER_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["businessSummary", "scenarios"],
  properties: {
    businessSummary: { type: "string" },
    scenarios: { type: "array", items: attackerItem },
  },
};
