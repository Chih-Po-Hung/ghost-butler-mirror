# Ghost-Butler Smart Mirror — Requirements (as-built)

> As-built record, written in M6 (2026-11-24). This documents the system
> as it actually exists after milestones M1–M6. It transcribes the
> requirements that drove the Kiro-built milestones M1–M5 (from
> `ghost-butler-smart-mirror-spec.md`) and adds the M6 scope. Nothing
> here is aspirational: every item below is implemented and verified.

## 1. What it is

Frankenstein track, Kiroween 2026. A haunted ghost-butler smart mirror
that stitches together incompatible technologies — a vintage CRT
terminal interface, live calendar and weather APIs, and an LLM-style
agent with speech synthesis — into one spooky but useful morning
assistant. Single-page static web app. No login, no backend server, no
cloud database, no subscription, no paid API as a hard dependency.

## 2. Non-negotiables (all met)

- Static single-page app, hostable on GitHub Pages / Vercel.
- Works offline for the core demo: when weather APIs are unreachable,
  the last cached data shows with a clear "cached" label; with no cache
  at all it says so in character — never a blank screen, never a crash.
- All animation data, code and assets were created fresh in this
  project. No copied code, assets or animation data.
- English UI strings in the code; the butler speaks Traditional Chinese
  by default (M5 voice picker; English voices available where the
  browser offers them).
- Demoable in under 60 seconds: open the page, the mirror is alive,
  the butler greets you, weather + today's schedule are visible.

## 3. Features (as built)

### M1 — CRT mirror face
Black page, warm green phosphor text, scanlines + subtle flicker +
vignette, a ghost-butler portrait drawn as inline SVG (no external
image), clock + date, large and readable, static greeting.

### M2 — Weather
Open-Meteo current conditions + today's high/low (no API key).
Default location Taipei, changeable in settings via Open-Meteo
geocoding. localStorage cache (30 min fresh); on fetch failure the
cached snapshot shows with a "cached" label, or an "unavailable"
state when there is no cache at all.

### M3 — Schedule
Add / edit / delete events in the UI, stored in localStorage, shown on
the mirror face in time order for today. Persists across reloads.

### M4 — Butler chat
Text box + send button, corner toggle. The butler answers in
character — polite, dry, faintly haunted — in Traditional Chinese.
Replies are composed from live context (weather snapshot, today's
events, clock), never hard-coded numbers. Scripted responder behind a
`ButlerResponder` adapter seam, so a real LLM can replace it later
without touching the UI. No API key required; the demo never blocks
on one.

### M5 — Speech
Web Speech API synthesis reads the opening briefing aloud and reads
each chat reply. Mute toggle stops all speech immediately (including a
line already playing); voice picker lists the voices the browser
actually offers, defaulting to a Traditional Chinese one. Both choices
persist in localStorage. No audio files, no paid TTS service.

### M6 — Haunt mode + polish + submission pack
- **Haunt mode**: every 4 minutes (first one 90 s after load, skipped
  while the tab is hidden), or on the 作祟 button, the butler drops a
  spooky Traditional Chinese interjection as a dismissible toast and
  the mirror face glitches for exactly 1 second. Auto-haunts can be
  switched off (persisted); the manual button always works. The
  interjection is spoken through the same speech module, so the mute
  toggle silences it. Haunt mode never touches briefing, weather,
  schedule, chat, or speech state.
- **Mobile/responsive**: usable at 390 px width — no horizontal
  overflow, all controls in the viewport and non-overlapping, panels
  fit. Verified in a headless browser at 390×844 and 1280×800.
- **Wording fix**: the precipitation line splits rain from snow.
  Rain codes say 雨 only (code 61 → 「今日有小雨之兆」); snow codes
  say 雪 (code 71 → 「今日有小雪之兆」). The old line said 「雨雪之兆」
  for every precipitation code.
- **Submission pack**: this spec directory, the steering note, a
  completed README, and `DEMO_SCRIPT.md` (timed 60-second demo).

## 4. Explicitly out of scope (unchanged)

Real smart-mirror hardware, camera, face recognition. Multi-user
accounts, sync, push notifications. Any paid API as a hard dependency.
Voice input (Web Speech recognition) was listed as nice-to-have in the
original spec and was not built.
