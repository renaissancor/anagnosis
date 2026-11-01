# Contract: Presentation

Owner role: `ui-designer`. Last re-measured: 2026-11-01. Write sets are in [`../ARCHITECTURE.md`](../ARCHITECTURE.md).

## Purpose

Let people read the dataset. Presentation shows what the data says and never adds facts.

## What belongs here

Pages in `public/`, routes in `server.js`, and [`api.md`](./api.md).

## What does not

Data fixes go to a curator. A need the routes do not meet becomes a change to `api.md`, not a workaround. Build owns `data/index.js`; the new-route handoff is in `build.md`.

## Rules

1. Pages read data only through the routes in `api.md`. Nothing here reads a CSV.
2. Candidates and claims are never shown as the same thing (`graph.md`).
3. The server binds to `127.0.0.1`, and any path built from a request stays inside its own folder.
4. Breaking a route follows `api.md` section 5.

## How to validate

Run `npm start` and load each changed page. Target, not yet true: a Playwright review at desktop and phone widths. Done means the page works and `api.md` matches the route.

## Current state (measured 2026-11-01)

| Measure | Value (source) |
|---|---|
| Panels reachable from the UI | 66 of 72 (`public/history/index.html`) |
| Claims served | 0 (`server.js`) |

## Open questions

See `api.md` section 6.

## Decision log

- 2026-11-01: contract created. The server binds to localhost, and panel paths stay inside `panels/`.
