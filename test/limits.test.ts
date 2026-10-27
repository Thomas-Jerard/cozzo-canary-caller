import assert from "node:assert/strict";
import test from "node:test";
import { reserveLive } from "../lib/limits.ts";

test("per-IP hourly cap falls back to mock and recovers after an hour", () => {
  process.env.LIVE_IP_HOURLY_CAP = "3";
  process.env.LIVE_DAILY_CAP = "100";
  const now = Date.UTC(2026, 9, 27, 12);
  assert.equal(reserveLive("1.1.1.1", 2, now).live, true);
  assert.equal(reserveLive("1.1.1.1", 2, now).live, false);
  assert.equal(reserveLive("2.2.2.2", 2, now).live, true);
  assert.equal(reserveLive("1.1.1.1", 2, now + 61 * 60 * 1000).live, true);
});

test("daily cap applies across IPs", () => {
  process.env.LIVE_IP_HOURLY_CAP = "100";
  process.env.LIVE_DAILY_CAP = "4";
  const now = Date.UTC(2026, 9, 28, 12);
  assert.equal(reserveLive("3.3.3.3", 3, now).live, true);
  assert.equal(reserveLive("4.4.4.4", 2, now).live, false);
  assert.equal(reserveLive("4.4.4.4", 1, now).live, true);
});
