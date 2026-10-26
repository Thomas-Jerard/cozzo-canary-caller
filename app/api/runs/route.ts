import { readRunRequest } from "@/lib/input";
import { MuseError } from "@/lib/muse";
import { runCalls } from "@/lib/run";

export const maxDuration = 300;

export async function POST(request: Request) {
  try {
    const body = readRunRequest(await request.json());
    const origin = new URL(request.url).origin;
    const result = await runCalls({ ...body, origin });
    return Response.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Something went wrong.";
    const status = error instanceof MuseError ? error.status : 400;
    return Response.json(
      { error: message },
      { status: status >= 400 && status < 600 ? status : 500 },
    );
  }
}
