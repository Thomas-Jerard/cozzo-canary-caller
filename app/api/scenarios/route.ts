import { readAttackFlag, readBusiness } from "@/lib/input";
import { clientIp, reserveLive } from "@/lib/limits";
import { MuseError, museMode } from "@/lib/muse";
import { researchBusiness } from "@/lib/run";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const business = readBusiness(body);
    const attack = readAttackFlag(body);
    const gate = museMode() === "live" ? reserveLive(clientIp(request), 1) : { live: true as const };
    const result = await researchBusiness(business, {
      forceMock: gate.live ? undefined : gate.reason,
      attack,
    });
    return Response.json(result);
  } catch (error) {
    return jsonError(error);
  }
}

function jsonError(error: unknown): Response {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  const status = error instanceof MuseError ? error.status : 400;
  return Response.json({ error: message }, { status: status >= 400 && status < 600 ? status : 500 });
}
