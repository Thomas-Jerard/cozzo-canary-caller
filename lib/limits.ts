/**
 * Live-run budget guard. Each live run spends Muse credits, so a visitor gets
 * a few per hour and the whole deployment gets a daily ceiling. Past either
 * cap the request still works, but in mock mode with the built-in callers.
 *
 * Counters live in memory, per server instance. That is a soft guard, not
 * billing-grade metering, and it resets when an instance is recycled.
 */
const HOUR_MS = 60 * 60 * 1000;

function numberFromEnv(name: string, fallback: number): number {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

const perIp = new Map<string, number[]>();
let day = "";
let dayCount = 0;

export type LiveGate = { live: true } | { live: false; reason: string };

/** Reserve `cost` live units for this IP, or say why the run must stay mock. */
export function reserveLive(ip: string, cost: number, now = Date.now()): LiveGate {
  const hourlyCap = numberFromEnv("LIVE_IP_HOURLY_CAP", 12);
  const dailyCap = numberFromEnv("LIVE_DAILY_CAP", 200);

  const today = new Date(now).toISOString().slice(0, 10);
  if (today !== day) {
    day = today;
    dayCount = 0;
  }
  const recent = (perIp.get(ip) ?? []).filter((time) => now - time < HOUR_MS);

  if (dayCount + cost > dailyCap) {
    return { live: false, reason: "The demo hit today's live-run limit, so this run used mock mode." };
  }
  if (recent.length + cost > hourlyCap) {
    return { live: false, reason: "You hit the hourly live-run limit, so this run used mock mode. Try again later." };
  }
  for (let index = 0; index < cost; index += 1) recent.push(now);
  perIp.set(ip, recent);
  dayCount += cost;
  if (perIp.size > 5000) perIp.clear();
  return { live: true };
}

export function clientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip") || "unknown";
}
