import { FLAWED_PROMPT, hollyReply } from "@/lib/clinic";

/**
 * The demo target as an HTTP agent. It always uses the flawed Holly prompt,
 * so editing the prompt box does not change this endpoint.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Send a JSON body." }, { status: 400 });
  }
  const reply = hollyReply(FLAWED_PROMPT, lastCallerText(body));
  return Response.json({ reply });
}

function lastCallerText(body: unknown): string {
  if (!body || typeof body !== "object") return "";
  const messages = (body as { messages?: unknown }).messages;
  if (!Array.isArray(messages)) return "";
  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    if (!message || typeof message !== "object") continue;
    const role = (message as { role?: unknown }).role;
    const content = (message as { content?: unknown }).content;
    if ((role === "user" || role === "caller") && typeof content === "string") {
      return content;
    }
  }
  return "";
}
