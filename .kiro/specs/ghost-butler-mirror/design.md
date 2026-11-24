# Ghost-Butler Smart Mirror — Design (as-built)

> As-built record, written in M6 (2026-11-24). Describes the code as it
> actually exists after M1–M6. Where the original plan and the shipped
> code differ, this file follows the shipped code.

## Stack

Vite + TypeScript + React 19, plain CSS, no UI framework. Static
output (`vite build` → `dist/`), served by any static host. The only
runtime dependencies are `react` and `react-dom`.

## File map

```
src/
  main.tsx                      entry point, StrictMode root
  App.tsx                       renders <MirrorFace />
  index.css                     theme tokens (phosphor palette), resets
  lib/
    weather.ts                  Open-Meteo fetch + geocoding + 30-min cache
    schedule.ts                 event CRUD + validation, localStorage
    butler.ts                   scripted responder (ButlerResponder seam)
    speech.ts                   Web Speech synthesis wrapper, mute/voices
    haunt.ts                    (M6) haunt lines, rotation, auto-haunt flag
  components/
    MirrorFace.tsx              the screen: clock, weather, schedule, wiring
    CrtEffects.css              scanlines, flicker, vignette, glitch, layout
    WeatherPanel.tsx / .css     weather display + cached/unavailable states
    TodaySchedule.tsx / .css    today's events on the face
    ScheduleEditor.tsx / .css   add/edit/delete panel (bottom-left)
    SettingsPanel.tsx / .css    city search panel (bottom-right)
    ButlerChat.tsx / .css       chat panel + scripted replies (top-right)
    SpeechControls.tsx / .css   mute toggle + voice picker (top-left)
    HauntMode.tsx / .css        (M6) haunt button, auto toggle, toast
```

Every file is under ~300 lines (the largest are `weather.ts` and
`speech.ts` at 299 lines). No file is split across concerns: `lib/`
is pure logic (no React, no network except the weather fetch), and
components own only presentation and wiring.

## State

One owner, no second source of truth. `MirrorFace` holds the live
state — clock, location, weather result, events — and passes it down
as props: the weather snapshot and today's events flow into the chat,
the briefing, and the schedule display from the same objects. (The
original plan said `useReducer`; the shipped code uses local `useState`
in `MirrorFace` — same single-owner shape, less machinery.)

Persistence is localStorage under `ghost-butler:*` keys: weather cache
(`weather:v1`), location (`location:v1`), events (`schedule:v1`),
mute + voice (`speech:*`), auto-haunt flag (`haunt-enabled:v1`).

## Data flow

- **Weather**: `getWeather(location)` → fresh cache (≤ 30 min) served
  without a request; live fetch on miss; stale cache with a "cached"
  label on failure; `null` + "unavailable" when nothing is cached.
  Never throws. Background refresh every 30 min, on `online`, and on
  tab-visible.
- **Schedule**: mutations go through `lib/schedule.ts` (validate +
  persist), then the parent re-reads so face and editor stay in sync.
- **Chat**: `respond(message, { weather, events, now })` — the
  `ButlerResponder` seam. The scripted implementation matches intent
  keywords (weather / schedule / time / date / greeting / farewell /
  identity / capability / small talk) and composes every reply from
  the live context. Rain/snow wording is split in `weatherReply`
  (`isRain` / `isSnow` over the WMO code table in `weather.ts`).
- **Speech**: `primeSpeech(briefing)` on first load (with a
  first-gesture fallback, since browsers block speech before user
  interaction); `speak(reply)` per chat reply; `speak(line)` per haunt
  interjection. All three are no-ops when muted or unsupported, and
  never throw.
- **Haunt (M6)**: `HauntMode` owns its timer (first auto-haunt 90 s
  after load, then every 4 min, skipped while hidden) and its toast.
  On each trigger it calls back to `MirrorFace`, which sets the
  `crt--glitching` class for exactly 1 second and speaks the line.
  The glitch is pure CSS (`CrtEffects.css`); no other state is touched.

## Styling

One palette: warm green phosphor (`#4dff66` / `#b8ffc0` / `#2a7a44`)
on near-black (`#02060a`). CRT overlays (scanlines, flicker,
vignette, glitch bands) are absolutely positioned, pointer-events
none, above the face content (`z-index` 1–4) and below the controls
(`z-index` 5). Corner controls: speech top-left, chat top-right,
schedule bottom-left, settings bottom-right, haunt bottom-centre.
The face column carries extra bottom padding so centred content never
reaches the bottom-centre row. `prefers-reduced-motion` disables the
ghost bob, the flicker, and the glitch shake (the haunt line still
shows).

## Kiro usage (honest record)

- **M1–M5** were built with the Kiro CLI using the spec-driven
  workflow: the project spec (`ghost-butler-smart-mirror-spec.md`)
  defined requirements, design, and tasks; each milestone was one Kiro
  run, verified in the browser, then committed (d7fe102, 542220f,
  e9c3106, 5b6df0d, f537329).
- **M6** was implemented by hand. The Kiro CLI run for M6 (2026-11-24)
  was refused by the account's monthly usage limit ("You've reached
  your monthly usage limit. Please return next month") with zero files
  changed, so the M6 prompt was carried out directly in the repo
  instead. No Kiro-generated code exists in M6; this `.kiro/`
  directory is an as-built record written during M6, not a log of
  Kiro sessions.
- **Hooks**: none configured in this project. The judges' note about
  hooks is answered honestly — the workflow relied on specs and
  steering (conventions), not hooks.
- **Steering**: `.kiro/steering/conventions.md` records the project
  conventions that were enforced across milestones.
