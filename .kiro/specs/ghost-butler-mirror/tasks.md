# Ghost-Butler Smart Mirror — Tasks (as-built)

> As-built record, written in M6 (2026-11-24). Milestones M1–M5 were
> each one Kiro CLI run, verified in the browser, then committed.
> M6 was implemented by hand after the Kiro account hit its monthly
> usage limit — see the note at the bottom.

- [x] **M1 — Shell + CRT face** (`d7fe102`)
  Black page, clock/date, scanlines, ghost-butler SVG portrait,
  static greeting.
  Accept: opens with no errors; clock ticks; readable at a glance.

- [x] **M2 — Weather** (`542220f`)
  Open-Meteo current + today, Taipei default, settings to change city;
  cache + "cached" label on failure.
  Accept: real weather shows; with network off, cached weather shows.

- [x] **M3 — Schedule** (`e9c3106`)
  Add/edit/delete events, stored in localStorage, shown on the mirror
  face in time order.
  Accept: add an event, reload the page, it is still there.

- [x] **M4 — Butler chat (scripted)** (`5b6df0d`)
  Chat box, scripted replies for greeting / weather / schedule /
  farewell / unknown; persona consistent.
  Accept: ask "今天天氣如何" and "我今天有什麼事" — both answered
  correctly from live data, not hard-coded strings.

- [x] **M5 — Speech** (`f537329`)
  Read briefing aloud on load (if unmuted), read each chat reply; mute
  toggle works; voice picker works.
  Accept: mute stops all speech; unmute resumes on next reply.

- [x] **M6 — Haunt mode + polish + submission pack** (uncommitted)
  - Haunt mode: spooky interjections every 4 min or on the 作祟
    button, 1-second glitch, dismissible toast, auto-haunt toggle
    (persisted), spoken through the shared speech module so mute
    silences it.
  - Mobile/responsive check at 390 px: no overflow, all controls
    reachable; bottom-centre haunt row placed with face padding so it
    never covers the schedule lines.
  - Wording fix: rain codes say 雨 only (61 → 小雨), snow codes say
    雪; the old 「雨雪之兆」 line is gone.
  - Judges' evidence: this `.kiro/` directory, the steering note,
    README "Built with Kiro" section, `DEMO_SCRIPT.md`.
  Accept: full demo runs end-to-end with no console errors.
  Verified 2026-11-24 with `npm run build` + a headless-browser
  CDP drive (21/21 checks at 390×844 and 1280×800, zero JS console
  errors; weather exercised via a seeded cache because the sandbox
  has no external network).

## M6 implementation note (why this file is honest, not Kiro-generated)

The Kiro CLI run for M6 was attempted first and refused: the account
had reached its monthly request-count limit ("You've reached your
monthly usage limit. Please return next month"). Zero files changed;
the repo stayed clean at M5 (`f537329`). M6 was then implemented
directly, following the M6 prompt step by step, with the same
acceptance bar (build + headless-browser end-to-end drive, no console
errors). Nothing in M6 claims Kiro authorship, and no hook usage is
claimed — no hooks are configured in this project.

## Remaining (submission, not code)

- [ ] Fresh-clone build (`npm install && npm run build && npm run preview`).
- [ ] 2–3 min demo video showing the 60-second flow in
      `DEMO_SCRIPT.md` (briefing → chat → speech → Haunt mode).
- [ ] Screenshots of the mirror face.
- [ ] Submit on Devpost before **2026-12-04 14:00 PT (Taipei
      2026-12-05 06:00)**.
