/*
 * Haunt mode for the Ghost-Butler Smart Mirror (milestone M6).
 *
 * Pure logic: the spooky interjection lines, their rotation, and the
 * persisted auto-haunt preference. No React, no network, no speech —
 * the UI (HauntMode.tsx) owns timing and display, and MirrorFace owns
 * the 1-second glitch. Keeping the lines here means the butler's voice
 * stays in one place, next to butler.ts.
 */

/** Spooky one-liners, in the butler's Traditional Chinese voice. */
export const HAUNT_LINES: readonly string[] = [
  '主人，鏡後的燭火方才晃了一下。',
  '噓——方才有誰在鏡子裡多看了您一眼。',
  '這面鏡子照了百年，偶爾也想嚇嚇人。',
  '主人別怕，只是我整理了一下鏡後的灰塵。',
  '方才走廊那頭，有腳步聲停了下來。',
  '鏡中歲月漫長，偶爾我也想說點不一樣的。',
]

/** Auto-haunt cadence: one interjection every few minutes. */
export const HAUNT_INTERVAL_MS = 4 * 60 * 1000

/** Grace period after load before the first automatic haunt. */
export const HAUNT_INITIAL_DELAY_MS = 90 * 1000

/** How long a haunt line stays on the mirror before fading. */
export const HAUNT_LINE_MS = 9000

const HAUNT_ENABLED_KEY = 'ghost-butler:haunt-enabled:v1'

/** Auto-haunts on by default; the toggle in the UI persists the choice. */
export function loadHauntEnabled(): boolean {
  try {
    return localStorage.getItem(HAUNT_ENABLED_KEY) !== 'false'
  } catch {
    return true
  }
}

export function saveHauntEnabled(enabled: boolean): void {
  try {
    localStorage.setItem(HAUNT_ENABLED_KEY, enabled ? 'true' : 'false')
  } catch {
    // storage may be unavailable; the choice still works in-memory
  }
}

/** Next line in rotation, wrapping around (never repeats twice in a row). */
export function nextHauntLine(previousIndex: number): { line: string; index: number } {
  const index = (previousIndex + 1) % HAUNT_LINES.length
  return { line: HAUNT_LINES[index], index }
}
