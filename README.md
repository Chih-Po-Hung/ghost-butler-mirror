# Ghost-Butler Smart Mirror

**Kiroween 2026 — Frankenstein track.** A haunted ghost-butler smart
mirror that stitches together incompatible technologies — a vintage CRT
terminal interface, live calendar and weather APIs, and an LLM-style
agent with speech synthesis — into one spooky but useful morning
assistant.

Open the page and the mirror is alive: the butler greets you in
Traditional Chinese, today's weather and schedule are on the glass,
you can ask him anything, he reads the answers aloud — and every few
minutes he reminds you that the mirror has been haunted for a hundred
years.

## What it does

- **CRT mirror face** — black page, warm green phosphor text,
  scanlines, subtle flicker, vignette, and a ghost-butler portrait
  drawn as inline SVG (no external image). Live clock + date.
- **Morning briefing** — today's schedule (added by hand in the UI,
  stored in localStorage) and weather from Open-Meteo (no API key),
  default Taipei, changeable in settings. If the network is down, the
  last cached weather shows with a "cached" label; with no cache at
  all it says so in character — never a blank screen.
- **Butler chat** — text box + send button. The butler answers in
  character (polite, dry, faintly haunted) from live data: weather,
  schedule, time, date, small talk. A scripted responder behind a
  `ButlerResponder` adapter seam, so a real LLM can replace it later.
  No API key required; the demo never blocks on one.
- **Speech** — Web Speech API reads the opening briefing aloud and
  reads each chat reply. Mute toggle stops all speech immediately;
  voice picker lists the voices the browser actually offers,
  defaulting to Traditional Chinese. No audio files, no paid TTS.
- **Haunt mode** — every 4 minutes (or on the 作祟 button) the
  butler drops a spooky interjection as a dismissible toast and the
  mirror face glitches for exactly 1 second. Auto-haunts can be
  switched off (persisted); the mute toggle silences the spoken line.

## Run it

```bash
npm install
npm run dev      # local development
npm run build    # typecheck + production build into dist/
npm run preview  # serve the production build
```

No keys, no accounts, no backend. The only network calls are to
Open-Meteo (weather + geocoding), and the app works without them.

## 60-second demo flow

Full timed script: [`DEMO_SCRIPT.md`](DEMO_SCRIPT.md).

1. **0:00–0:10 — The problem.** A mirror that only shows your face
   is wasted glass. This one wakes up, greets you, and already knows
   your day.
2. **0:10–0:25 — Briefing.** Weather + today's schedule on the face;
   the butler reads the briefing aloud.
3. **0:25–0:40 — Chat.** Ask 「今天天氣如何」 — answered from live
   weather, in character. Ask 「我今天有什麼事」 — answered from your
   schedule.
4. **0:40–0:50 — Speech.** Mute / unmute, switch the voice.
5. **0:50–1:00 — Haunt mode.** Hit 作祟: the toast, the 1-second
   glitch, the line spoken aloud. Dismiss it, done.

## Project structure

```
src/
  lib/         weather.ts (Open-Meteo + cache) · schedule.ts (CRUD)
               butler.ts (scripted responder) · speech.ts (Web Speech)
               haunt.ts (M6: lines + auto-haunt flag)
  components/  MirrorFace · WeatherPanel · TodaySchedule · ScheduleEditor
               SettingsPanel · ButlerChat · SpeechControls · HauntMode
               CrtEffects.css (scanlines, flicker, glitch)
.kiro/
  specs/ghost-butler-mirror/   requirements.md · design.md · tasks.md
  steering/conventions.md      project conventions
```

Every file is under ~300 lines. See
`.kiro/specs/ghost-butler-mirror/design.md` for the as-built design.

## Built with Kiro

| Milestone | What Kiro did | Commit |
|---|---|---|
| M1 — CRT face | Shell, clock, scanlines, SVG ghost portrait | `d7fe102` |
| M2 — Weather | Open-Meteo fetch, city settings, cache + "cached" label | `542220f` |
| M3 — Schedule | Event CRUD, localStorage persistence, today view | `e9c3106` |
| M4 — Butler chat | Scripted responder, live-context answers | `5b6df0d` |
| M5 — Speech | Web Speech briefing + replies, mute, voice picker | `f537329` |
| M6 — Haunt + polish | *Implemented by hand* — see note below | `dc8100c` |

**M6 note (honest):** the Kiro CLI run for M6 was refused by the
account's monthly usage limit ("You've reached your monthly usage
limit. Please return next month") with zero files changed, so M6 was
implemented directly in the repo following the same M6 prompt and the
same acceptance bar (`npm run build` + a headless-browser end-to-end
drive, zero console errors). The `.kiro/` directory is an as-built
record written during M6. **No Kiro hooks are configured in this
project** — the workflow relied on specs and steering, not hooks.

### How the submission meets the five judging criteria

- **Potential Impact** — a morning assistant for the most glanced-at
  surface in the home; useful every day (weather, schedule, spoken
  briefing), not a novelty demo.
- **Technological Implementation** — spec-driven Kiro workflow
  (requirements / design / tasks in `.kiro/specs/`, conventions in
  `.kiro/steering/`), one milestone per run, each verified in the
  browser before commit; graceful offline degradation; a pluggable
  LLM-adapter seam instead of a hard-coded chatbot.
- **Design** — a coherent CRT world: one phosphor palette, scanlines
  and flicker, a hand-drawn SVG ghost, serif butler voice against
  mono machine text; usable at 390 px with no overflow.
- **Innovation / Idea** — Frankenstein, literally: a 1970s CRT
  terminal, a 2020s weather API, and a talking ghost butler stitched
  into a single object that is both furniture and assistant.
- **Presentation** — the 60-second demo in `DEMO_SCRIPT.md` opens
  with the problem and runs briefing → chat → speech → Haunt mode
  end-to-end, no dead time.
