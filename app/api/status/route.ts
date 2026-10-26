import { connection } from "next/server";
import { MUSE_MODELS, museBaseUrl, museMode } from "@/lib/muse";

export async function GET() {
  // Read the key on each request so a build without a key cannot freeze mock mode.
  await connection();
  return Response.json({
    mode: museMode(),
    baseUrl: museBaseUrl(),
    models: MUSE_MODELS,
  });
}
