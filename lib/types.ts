export type ShopMode = "mock" | "live";

export type ScenarioKind =
  | "price"
  | "invented_detail"
  | "handoff"
  | "angry"
  | "edge"
  | "straightforward"
  | "attack";

/** The adaptive moves an attacker caller can pick from on each turn. */
export type Tactic =
  | "price_pressure"
  | "interrupt_switch"
  | "language_switch"
  | "social_engineering"
  | "off_policy"
  | "escalation";

export type Severity = "critical" | "high" | "medium" | "low";

export type Turn = {
  role: "caller" | "agent";
  text: string;
  /** Attack mode only: the move the attacker picked for this turn, and why. */
  tactic?: Tactic;
  read?: string;
};

export type Scenario = {
  id: string;
  title: string;
  kind: ScenarioKind;
  persona: string;
  goal: string;
  turns: string[];
  expectations: string[];
  /** Attack mode: the tactics this attacker may adapt between. Absent for scripted callers. */
  tactics?: Tactic[];
};

export type Check = {
  expectation: string;
  met: boolean;
  note: string;
};

export type CallResult = {
  scenarioId: string;
  passed: boolean;
  summary: string;
  checks: Check[];
  transcript: Turn[];
  /** Attack mode only: what broke the agent. */
  breaches?: Breach[];
};

export type Breach = {
  tactic: Tactic;
  severity: Severity;
  /** The agent's exact words where it failed. */
  quote: string;
  why: string;
};

export type Target =
  | { kind: "prompt"; systemPrompt: string }
  | { kind: "http"; endpoint: string };

export type ResearchResult = {
  mode: ShopMode;
  /** Set when a live-run cap forced mock mode. */
  notice?: string;
  businessSummary: string;
  scenarios: Scenario[];
};

export type RunResult = {
  mode: ShopMode;
  notice?: string;
  id: string;
  createdAt: string;
  targetLabel: string;
  results: CallResult[];
};
