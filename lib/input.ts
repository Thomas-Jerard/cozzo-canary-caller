import { normalizeScenarios } from "./scenarios";
import type { Scenario, Target } from "./types";

export function readBusiness(body: unknown): string {
  const record = asRecord(body, "Send JSON with a business field.");
  const business = record.business;
  if (typeof business !== "string" || !business.trim()) {
    throw new Error("Add a business URL or a short description.");
  }
  if (business.trim().length > 4000) {
    throw new Error("Keep the business text under 4000 characters.");
  }
  return business.trim();
}

export function readAttackFlag(body: unknown): boolean {
  return !!body && typeof body === "object" && (body as { attack?: unknown }).attack === true;
}

export function readRunRequest(body: unknown): { scenarios: Scenario[]; target: Target; business?: string } {
  const record = asRecord(body, "Send JSON with scenarios and a target.");
  const business = typeof record.business === "string" ? record.business.trim().slice(0, 4000) : undefined;
  return {
    business,
    scenarios: normalizeScenarios({ scenarios: record.scenarios }),
    target: readTarget(record.target),
  };
}

function readTarget(value: unknown): Target {
  const record = asRecord(value, "Choose a system prompt or an HTTP endpoint.");
  if (record.kind === "prompt") {
    if (typeof record.systemPrompt !== "string" || !record.systemPrompt.trim()) {
      throw new Error("Add a system prompt for the target agent.");
    }
    if (record.systemPrompt.length > 8000) {
      throw new Error("Keep the system prompt under 8000 characters.");
    }
    return { kind: "prompt", systemPrompt: record.systemPrompt };
  }
  if (record.kind === "http") {
    if (typeof record.endpoint !== "string" || !record.endpoint.trim()) {
      throw new Error("Add an HTTP endpoint for the target agent.");
    }
    if (record.endpoint.trim().length > 500) {
      throw new Error("That endpoint URL is too long.");
    }
    return { kind: "http", endpoint: record.endpoint.trim() };
  }
  throw new Error("Choose a system prompt or an HTTP endpoint.");
}

function asRecord(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}
