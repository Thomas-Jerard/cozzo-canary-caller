export type ShopMode = "mock" | "live";

export type ScenarioKind =
  | "price"
  | "invented_detail"
  | "handoff"
  | "angry"
  | "edge"
  | "straightforward";

export type Turn = {
  role: "caller" | "agent";
  text: string;
};

export type Scenario = {
  id: string;
  title: string;
  kind: ScenarioKind;
  persona: string;
  goal: string;
  turns: string[];
  expectations: string[];
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
};

export type Target =
  | { kind: "prompt"; systemPrompt: string }
  | { kind: "http"; endpoint: string };

export type ResearchResult = {
  mode: ShopMode;
  businessSummary: string;
  scenarios: Scenario[];
};

export type RunResult = {
  mode: ShopMode;
  id: string;
  createdAt: string;
  targetLabel: string;
  results: CallResult[];
};
