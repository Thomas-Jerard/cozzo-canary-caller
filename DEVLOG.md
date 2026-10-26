# Dev log

Dated notes for Cozzo Canary Caller. The Meta Global AI Developer Hackathon (Indie track) started on October 26, 2026, and this log starts the same day.

## 2026-10-26

Opened this repository for the hackathon. Added an MIT license (copyright 2026 Thomas Voelker) and a README that states the pitch: an AI mystery shopper that stress-tests a voice agent before launch. No application code yet. Everything here is written fresh for this repo, after the event start.

Scaffolded a Next.js 16 TypeScript app (App Router) with the canary-yellow page shell. Vercel can detect this as a Next.js project. The shopper flow is not wired yet.

Added an OpenAI-compatible Muse client after reading the Model API docs at dev.meta.ai/docs. It posts to `https://api.meta.ai/v1/chat/completions` and `/v1/responses`, using `muse-wonder-1.0` and `muse-spark-1.3`. The key is `MUSE_API_KEY`. When that variable is empty, `museMode()` is `mock` and no request is sent. `.env.example` documents this and contains no secret.

Added Marigold Animal Clinic, a fictional demo target in the fictional town of Larkspur Bend. Holly's prompt contains six deliberate bad rules (flat $49 pricing, agreeing to invented promises, refusing a transfer, scolding angry callers, inventing a 10mg dose, and booking Sunday). Hours are answered correctly. The local simulator follows whichever of those sentences are still in the prompt, and node:test checks the pass/fail grid.

Wired the shopper end to end in mock mode: a business form, scenario list, simulated multi-turn calls, and a results grid with a transcript on each cell. Running again after a prompt edit adds a column. `POST /api/demo-agent` is the same flawed clinic over HTTP. The README now covers setup, the Model API, and dependency licenses.

Clicked through that flow in a browser. The flawed prompt failed six callers and passed weekday hours. Deleting the flat $49 rule and running again flipped only the price cell to pass, and the new transcript quoted $210 and $75. Added a tab icon after the browser asked for a missing favicon.
