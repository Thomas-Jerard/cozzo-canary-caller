# Cozzo Canary Caller

Cozzo Canary Caller is an AI mystery shopper for voice agents. Before a phone agent talks to real customers, Canary Caller sends difficult callers at it: price questions, invented details, requests to reach a human, angry people, and odd edge cases. Each call comes back pass or fail, in a grid you can re-run after you change the prompt.

[Cozzo](https://cozzo.io) is an independent voice-agent benchmarking site. Cozzo the Canary is its mascot. This project is a fresh hackathon build in that spirit. It is not a copy of any other Cozzo repository.

The product stress-tests the conversation a voice agent would have. Calls run as text turns, so you can read a transcript in every cell. Voice mode plays one call out loud: the Canary caller and Holly speak in two different browser voices while the transcript fills in, and the grade lands when the call ends.

## Architecture

```
business URL or description
        │
        ▼
Muse Wonder  ──►  adversarial caller scenarios
        │
        ▼
Muse Spark (the caller)  ◄──►  target agent
        │                         │
        │                         ├─ system prompt, also on Muse Spark
        │                         └─ HTTP endpoint (including the demo clinic)
        ▼
pass / fail against expectations  ──►  results grid + transcript
```

- **Wonder** researches the business and writes the scenarios. On the live API it uses the Responses API, and it turns on web search when the input contains a URL.
- **Spark** plays each caller for a few turns. If the target is a system prompt, Spark plays that agent too. If the target is an HTTP endpoint, Canary Caller posts the transcript there and uses the reply.
- **The grid** keeps every run. Change the prompt and run again, and a new column appears beside the old one. Open a cell for the transcript and the expectation checks.

When `MUSE_API_KEY` is unset, the same screens run in **mock mode**: scripted callers, a local demo agent, and a local grader. The UI does not need a key.

## Demo target

Marigold Animal Clinic is a fictional clinic in the fictional town of Larkspur Bend. Its phone agent, Holly, ships with six deliberate mistakes:

- quotes every visit as a flat $49, including emergencies and after-hours
- agrees to made-up promises (a doctor who is not on staff, a free dental, iguana boarding)
- refuses to transfer the call
- tells angry callers to calm down
- invents a 10mg antibiotic dose
- books tomorrow at 2:15pm even on Sunday, when the clinic is closed

Hours questions are answered correctly, so the grid is not all red. The true clinic facts sit in the business box. The flawed prompt sits in the target box. Delete a bad rule and run again to watch that row flip. The same flawed agent is also available as `POST /api/demo-agent`, which ignores prompt edits.

## Setup

Requires Node.js 22 or newer.

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). With no key, the banner says mock mode. Click **Write scenarios**, then **Run calls**.

```bash
cp .env.example .env.local
# edit .env.local and set MUSE_API_KEY
```

Restart the dev server after adding a key. The key stays on the server. It is not prefixed with `NEXT_PUBLIC_`.

To deploy on Vercel, import this repository. Vercel detects Next.js. Set `MUSE_API_KEY` in the project environment for live calls, or leave it empty to deploy the mock shopper. Do not commit `.env.local`.

## Mock mode

Mock mode is the whole product with the model calls replaced:

- Scenario writing returns a fixed pack aimed at Marigold Animal Clinic. The summary says so, and it does not pretend to have fetched a URL.
- The caller speaks the scripted follow-ups.
- A system-prompt target is answered by the local Holly simulator, which follows a flawed rule only while that sentence is still in the prompt.
- An HTTP target is called for real, except `/api/demo-agent` on this same app, which runs the demo handler in process so the dev server does not have to call itself. External endpoints are fetched. The body is `{ "messages": [{ "role": "user" | "assistant", "content": "..." }] }`. A reply is read from `reply`, `message`, `content`, an OpenAI-style `choices[0].message.content`, or plain text.
- Grading is rule-based against each built-in scenario's expectations.

Live mode uses the Meta Model API instead of those stand-ins. The external HTTP target path is the same in both modes.

## Muse API

The client reads `MUSE_API_KEY` and talks to Meta Model API, which is OpenAI-compatible. Meta's own docs name the key `MODEL_API_KEY`. This app uses `MUSE_API_KEY` so the project has one obvious variable. Optional `MUSE_BASE_URL` overrides the base URL (default `https://api.meta.ai/v1`).

| | |
| --- | --- |
| Base URL | `https://api.meta.ai/v1` |
| Auth | `Authorization: Bearer $MUSE_API_KEY` |
| Wonder model | `muse-wonder-1.0` |
| Spark model | `muse-spark-1.3` |
| Scenario research | `POST /v1/responses` with `tools: [{ "type": "web_search" }]` when the business input contains a URL, and `text.format` JSON schema for the scenario list |
| Caller, prompt-agent, and grading | `POST /v1/chat/completions`. Text comes back at `choices[0].message.content`. Grading uses `response_format.type = "json_schema"` |
| Catalog | `GET /v1/models` |

Docs used while building the client:

- [Get started](https://dev.meta.ai/docs)
- [Quickstart](https://dev.meta.ai/docs/quickstart)
- [Models](https://dev.meta.ai/docs/models)
- [Chat completions](https://dev.meta.ai/docs/protocols/chat-completions)
- [Responses API](https://dev.meta.ai/docs/protocols/responses)
- [Structured output](https://dev.meta.ai/docs/structured-output)
- [Search grounding](https://dev.meta.ai/docs/search-grounding)

Muse Spark always reasons. The client does not send `reasoning_effort: "none"` (the docs say that returns HTTP 400) and does not send `temperature` (the docs say the default of 1.0 is the tuned setting). Search grounding is not available on chat completions, so research goes through the Responses API. Caller and agent turns use `reasoning_effort: "low"`. Wonder research uses `reasoning.effort: "medium"`.

## Voice mode

Muse has no text-to-speech model. `/v1/models` lists `muse-voice-transcribe-1.0` for speech-to-text, and `/v1/audio/speech` returns 404. So the server places and grades the call through `/api/runs` (same caps, one live unit per call), and the browser speaks each turn with the Web Speech API. `lib/voices.ts` picks two different installed voices and also separates them by pitch.

For audio in, **Say it** records the mic, resamples it to 16 kHz mono 16-bit WAV in the browser (`lib/wav.ts`), and posts it to `/api/transcribe`. That route calls Muse Voice Transcribe at `POST /v1/asr/transcribe` and returns the text as the caller's opening line. Each transcription also uses one live unit. In mock mode the route answers 503 and you type the line instead.

## Open-source dependencies

Application code in this repository is MIT, copyright 2026 Thomas Voelker. See [LICENSE](LICENSE).

Installed packages and the licenses they declare:

| Package | Version | License |
| --- | --- | --- |
| next | 16.4.3 | MIT |
| react | 19.3.0 | MIT |
| react-dom | 19.3.0 | MIT |
| typescript (dev) | 5.9.3 | Apache-2.0 |
| eslint (dev) | 9.39.5 | MIT |
| eslint-config-next (dev) | 16.4.3 | MIT |
| @types/node (dev) | 20.19.43 | MIT |
| @types/react (dev) | 19.3.0 | MIT |
| @types/react-dom (dev) | 19.3.0 | MIT |

Versions are pinned in `package.json` and `package-lock.json`. Transitive dependencies keep their own licenses inside `node_modules`.

## Hackathon note

Built for the Meta Global AI Developer Hackathon, Indie track. The event started on October 26, 2026. Work in this repository was created after that start, in small commits on `main`, with no history rewrites. Nothing here was copied from another repository.

## Scripts

- `npm run dev` — local Next.js dev server
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — Next.js ESLint
- `npm test` — node:test checks (run with tsx) for the demo agent, the grader, the caps, WAV encoding, and voice picking
