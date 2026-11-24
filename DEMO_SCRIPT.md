# Demo script — Ghost-Butler Smart Mirror (60 seconds)

For the 2–3 minute Devpost demo video, run this 60-second flow, then
use the remaining time to linger on the mirror face and the Haunt
interjection. No dead time: every beat shows the problem or the
working solution. Speak the narration in your own words; the lines in
quotes are what is on screen or spoken by the butler.

## Setup (before recording)

- Fresh browser profile (or clear site data) so the mirror opens clean.
- Seed one event for today (Schedule → Add event, e.g. 15:00 "Demo
  彩排") so the schedule is not empty. Weather is live from
  Open-Meteo; if the network is down, the mirror shows the cached
  weather with a "cached" label instead — that is part of the demo,
  not a failure.
- Sound on, unmuted: the briefing and the Haunt line are meant to be
  heard. Keep the room quiet.

## The 60 seconds

| Time | Do | Say / show |
|---|---|---|
| 0:00–0:10 | Open the page. The mirror is already alive: ghost portrait, greeting, clock ticking, weather + today's schedule on the glass. | "A mirror that only shows your face is wasted glass. This one wakes up knowing your day." |
| 0:10–0:25 | Do nothing — let the briefing play. The butler reads the greeting, the weather, and today's events aloud. | The spoken briefing: 「晚安，主人……今日……」 Point at the weather and the schedule as they are read. |
| 0:25–0:40 | Open the chat (top-right 管家). Type 「今天天氣如何」 and send. Then 「我今天有什麼事」 and send. | "He answers from live data, not a script — the weather he just read, the schedule you just saw." Show both replies, each read aloud. |
| 0:40–0:50 | Click **Mute**, then **Unmute**. Open the voice picker and switch the voice. | "Speech is always optional — one tap silences him, mid-sentence if you like." |
| 0:50–1:00 | Click **作祟** (bottom-centre). The toast appears, the mirror glitches for 1 second, the line is spoken. Tap the toast to dismiss it. | "And every few minutes, he reminds you the mirror has been haunted for a hundred years." End on the mirror face. |

## If something goes wrong on camera

- **No voice / "No voices"**: the browser has no speech voices
  (common in headless or minimal installs). The mute toggle and the
  picker still work; narrate over it — the app degrades, it does not
  crash.
- **Weather shows "cached" or "unavailable"**: that is the offline
  path working as designed. Say so in one line and move on.
- **Haunt fires on its own mid-demo**: that is the 4-minute timer.
  Let it play — it is the feature, not an interruption.
