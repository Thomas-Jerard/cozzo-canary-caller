import { readBusiness } from "@/lib/input";
import { MuseError } from "@/lib/muse";
import { researchBusiness } from "@/lib/run";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const business = readBusiness(await request.json());
    const result = await researchBusiness(business);
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
