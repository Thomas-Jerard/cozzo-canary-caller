# Cozzo Canary Caller

Cozzo Canary Caller is an AI mystery shopper for voice agents. Before a phone agent talks to real customers, it sends difficult callers at the agent: price questions, invented details, requests to reach a human, angry people, and odd edge cases. Each call comes back pass or fail, in a grid you can re-run after you change the prompt.

[Cozzo](https://cozzo.io) is an independent voice-agent benchmarking site. Cozzo the Canary is its mascot. This project is a fresh hackathon build in that spirit. It is not a copy of any other Cozzo repository.

## Architecture

The shopper has three stages:

1. **Muse Wonder** reads a business URL or a written description and writes adversarial caller scenarios.
2. **Muse Spark** plays each caller in a multi-turn conversation. The target is either a system prompt, also run on Muse Spark, or an HTTP endpoint.
3. Each conversation is graded pass or fail against the scenario's expectations. Results sit in a grid. Changing the prompt and running again adds a column. Every cell opens a transcript.

A fictional demo business ships with the app, with a few deliberate flaws, so the grid shows failures on the first run.

When no Meta API key is configured, the same flow runs in mock mode so the interface is usable before a key exists.

## Hackathon note

Built for the Meta Global AI Developer Hackathon, Indie track. The event started on October 26, 2026. Work in this repository is created after that start, in small commits on `main`, with no history rewrites. Nothing here is copied from another repository.

## License

Application code in this repository is MIT, copyright 2026 Thomas Voelker. See [LICENSE](LICENSE).

Setup, the model client, and the open-source dependency list land with the app in the commits that follow. See [DEVLOG.md](DEVLOG.md).
