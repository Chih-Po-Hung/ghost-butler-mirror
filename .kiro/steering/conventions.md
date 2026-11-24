# Project conventions

Steering note for the Ghost-Butler Smart Mirror. These are the rules
every milestone was built under (M1–M5 by Kiro, M6 by hand after the
Kiro monthly quota was reached). Follow them for any further change.

## Stack

- Vite + TypeScript + React 19, plain CSS. No UI framework, no new
  libraries unless the task cannot be done with the current stack.
- Single-page static app. No login, no backend, no database, no paid
  API as a hard dependency.

## Files

- Keep every file under ~300 lines; split before growing.
- `src/lib/` is pure logic: no React, no network except the weather
  fetch. Components own presentation and wiring only.
- One owner for live state (`MirrorFace`); weather, events, and clock
  flow down as props. No second source of truth.
- Commit (git) after each accepted milestone so a bad step can be
  reverted instead of regenerated.

## Language

- English UI strings in code. The butler speaks Traditional Chinese
  by default — greeting, briefing, chat replies, haunt lines.
- Weather labels are Traditional Chinese (WMO code table in
  `src/lib/weather.ts`). Rain and snow wording is split: rain codes
  say 雨 only, snow codes say 雪 (see `butler.ts` `isRain`/`isSnow`).

## Behaviour

- Never block the demo: no API key, no network, no voice is ever
  required. Degrade gracefully — cached data with a "cached" label,
  or an in-character "unavailable" line. Never a blank screen.
- Speech is always optional: every speak call is a no-op when muted
  or unsupported, and never throws. The mute toggle stops speech
  immediately, including a line already playing.
- Haunt mode must never break briefing, weather, schedule, chat, or
  speech. It is an overlay: a toast + a 1-second CSS glitch, nothing
  else. It is dismissible (tap the toast) and silenceable (auto-haunt
  toggle, persisted; mute silences the spoken line).
- Animations respect `prefers-reduced-motion`.

## Workflow

- One task per run. If a step fails twice, stop and fix that step
  only — do not restart the whole project.
- Verify in the browser before calling a milestone done: `npm run
  build` passes, then drive the full demo end-to-end with no console
  errors.
