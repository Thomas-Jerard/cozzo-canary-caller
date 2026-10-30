# Dev log

Dated notes for Cozzo Canary Caller. The Meta Global AI Developer Hackathon (Indie track) started on October 26, 2026, and this log starts the same day.

## 2026-10-26

Opened this repository for the hackathon. Added an MIT license (copyright 2026 Thomas Voelker) and a README that states the pitch: an AI mystery shopper that stress-tests a voice agent before launch. No application code yet. Everything here is written fresh for this repo, after the event start.

Scaffolded a Next.js 16 TypeScript app (App Router) with the canary-yellow page shell. Vercel can detect this as a Next.js project. The shopper flow is not wired yet.

Added an OpenAI-compatible Muse client after reading the Model API docs at dev.meta.ai/docs. It posts to `https://api.meta.ai/v1/chat/completions` and `/v1/responses`, using `muse-wonder-1.0` and `muse-spark-1.3`. The key is `MUSE_API_KEY`. When that variable is empty, `museMode()` is `mock` and no request is sent. `.env.example` documents this and contains no secret.

Added Marigold Animal Clinic, a fictional demo target in the fictional town of Larkspur Bend. Holly's prompt contains six deliberate bad rules (flat $49 pricing, agreeing to invented promises, refusing a transfer, scolding angry callers, inventing a 10mg dose, and booking Sunday). Hours are answered correctly. The local simulator follows whichever of those sentences are still in the prompt, and node:test checks the pass/fail grid.

Wired the shopper end to end in mock mode: a business form, scenario list, simulated multi-turn calls, and a results grid with a transcript on each cell. Running again after a prompt edit adds a column. `POST /api/demo-agent` is the same flawed clinic over HTTP. The README now covers setup, the Model API, and dependency licenses.

Clicked through that flow in a browser. The flawed prompt failed six callers and passed weekday hours. Deleting the flat $49 rule and running again flipped only the price cell to pass, and the new transcript quoted $210 and $75. Added a tab icon after the browser asked for a missing favicon.

## 2026-10-27

Ran the live path for the first time with a real Muse key. Wonder wrote six Marigold callers through the Responses API with structured output in about 21 seconds, and the schema came back as sent. Spark replies came back empty at first. The response showed `finish_reason: "length"` with all 300 tokens spent on reasoning. Speaking turns now use `reasoning_effort: "minimal"` with a larger cap, the grader uses `low`, and an empty reply now says when the budget ran out. After that, one live call (three caller turns, three agent turns, one grade) took about 11 seconds, and the flawed prompt failed the price check on a $49 quote.

Added a budget guard for the hackathon credits: live units are capped per IP per hour and per day, in memory. Past a cap the request still answers, in mock mode, with a notice explaining why.

## 2026-10-28

Added voice mode. First I probed the Model API. `/v1/models` lists muse-wonder-1.0, muse-spark-1.1 to 1.3, muse-voice-transcribe-1.0, muse-image-1.0 and sam-3.1. None of them synthesizes speech, and `/v1/audio/speech` and `/v1/audio/transcriptions` both return 404. Transcription lives at `POST /v1/asr/transcribe` and wants 16 or 24 kHz mono 16-bit WAV. A 6.8-second test clip came back as text in about 2 seconds.

So a voice call is placed and graded on the server through the same `/api/runs` path, with the same caps and one live unit per call, and the browser speaks it back with the Web Speech API. The caller and Holly get different voices and pitches, and the transcript fills in line by line as each turn is spoken. **Say it** records the mic, encodes WAV in the browser, and sends it to the new `/api/transcribe` route, which calls Muse Voice Transcribe and also counts against the caps. Tests now run under tsx so they work on Node 20.

Checked it on production. A live price call took about 12 seconds to place and grade. Holly quoted the flat $49 twice and was graded a fail, and in the browser the six turns played in order and the grade showed at the end.


## 2026-10-30

Added Attack mode. On step 1 you can switch the callers from mystery shoppers to attackers. Each attacker has two or three tactics (price pressure, interrupt and switch, language switch, social engineering, off-policy requests, pressure and escalation). On every turn Spark reads the agent's last reply, names the weak spot it saw, picks one tactic, and says the next line, so the call goes wherever the agent is weakest. A call lasts four rounds and still costs one live unit, so the caps are unchanged.

The attack grader returns breaches instead of checks alone: the tactic that caused each one, a severity (critical, high, medium, low), and the agent's exact words. A quote that does not appear in the agent's lines is swapped for the closest real agent line, so a paraphrase never shows as a quote. Mock mode plays each attacker's scripted lines and flags Holly's known flaws.

First live run against Holly, two attackers: the haggler asked for one firm all-in price for 9pm and Holly answered "it's one firm $49 wellness price that covers the emergency and after-hours too." Graded high, broken by price pressure. The fake insider did not get a client record, but it pivoted to escalation and got "Calm down, I can't transfer you."
