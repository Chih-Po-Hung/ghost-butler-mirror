/*
 * Butler scripted responder for the Ghost-Butler Smart Mirror (milestone M4).
 *
 * Pure logic: no React, no network, no API key. `respond()` is the single
 * entry point and the LLM-adapter seam — callers (the chat UI, tests) depend
 * only on the `ButlerResponder` signature. M4 ships a scripted persona: a
 * polite, dry, faintly haunted ghost butler who replies in Traditional
 * Chinese. A real model can be dropped in behind the same signature later
 * without touching the UI.
 *
 * Every reply is composed from the live context handed in — a weather
 * snapshot (or null), today's events, and the current time. No temperature
 * or event title is hard-coded: when data is missing the butler says so in
 * character rather than inventing numbers.
 */

import { weatherLabel, type WeatherSnapshot } from './weather'
import { formatTimeRange, type ScheduleEvent } from './schedule'

/** Everything the butler needs to answer from the live mirror state. */
export interface ButlerContext {
  /** Current weather snapshot, or null when unavailable. */
  weather: WeatherSnapshot | null
  /** Today's events (already filtered to today), empty when none. */
  events: ScheduleEvent[]
  /** The live clock, for time/date answers and time-aware greetings. */
  now: Date
}

/**
 * The responder contract. A future LLM adapter implements this same shape;
 * callers depend only on `respond`, never on the scripted internals.
 */
export type ButlerResponder = (message: string, context: ButlerContext) => string

/* ---------- intent keywords (matched on the lowercased message) ---------- */

const WEATHER_KEYS = [
  '天氣', '氣溫', '溫度', '氣象', '下雨', '冷嗎', '熱嗎', '冷不冷', '熱不熱', 'weather',
]
const SCHEDULE_KEYS = [
  '行程', '日程', '待辦', '安排', '有什麼事', '有事嗎', '今天要做', '今天的事', 'schedule',
]
const TIME_KEYS = ['幾點', '幾分', '時間', '現在幾', 'time', 'now']
const DATE_KEYS = ['星期', '幾月', '幾號', '日期', 'date']
const SMALLTALK_KEYS = ['笑話', '無聊', '你好嗎', '過得好嗎', '機器人', '聊天', '聊聊天']
const GREETING_KEYS = ['早安', '午安', '晚安', '你好', '您好', '嗨', '哈囉', 'hi', 'hello']
const FAREWELL_KEYS = ['再見', '拜拜', '掰掰', 'bye', 'goodbye', '告辭', '失陪', '回見']
const IDENTITY_KEYS = [
  '你是誰', '你叫什麼', '你的名字', '你是什麼', 'who are you', 'your name', 'butler', '管家',
]
const CAPABILITY_KEYS = ['能做什麼', '會做什麼', '會什麼', '你能', '你會', '可以做什麼', '可以幫']

const WEEKDAY_TC = ['日', '一', '二', '三', '四', '五', '六']

/* ---------- small helpers ---------- */

/** True when `text` contains any of `needles`. */
function containsAny(text: string, needles: string[]): boolean {
  return needles.some((n) => text.includes(n))
}

/** Whole-degree Celsius string, e.g. 18.3 → "18°". */
function formatTemp(value: number): string {
  return `${Math.round(value)}°`
}

/**
 * WMO code implies liquid precipitation: drizzle (51–57), rain (61–67),
 * showers (80–82) or thunder (95–99). Rain only — never snow.
 */
function isRain(code: number): boolean {
  return (
    (code >= 51 && code <= 67) ||
    (code >= 80 && code <= 82) ||
    code >= 95
  )
}

/** WMO code implies snow: snowfall (71–77) or snow showers (85–86). */
function isSnow(code: number): boolean {
  return (code >= 71 && code <= 77) || code === 85 || code === 86
}

/* ---------- per-intent replies (all composed from live context) ---------- */

function weatherReply(ctx: ButlerContext): string {
  const { weather } = ctx
  if (!weather) {
    return '主人，天色尚未映入鏡中。我暫時讀不到今日的天氣，容我稍候再為您探看。'
  }
  const { location, current, today } = weather
  const parts = [
    `主人，${location.name}此刻約 ${formatTemp(current.temperature)}，${weatherLabel(current.weatherCode)}。`,
    `今日高 ${formatTemp(today.tempMax)}、低 ${formatTemp(today.tempMin)}。`,
  ]
  // Rain and snow get different lines: the label itself names the form
  // (code 61 → 小雨, never 雪), so the butler never mixes the two.
  if (isRain(today.weatherCode)) {
    parts.push(`今日有${weatherLabel(today.weatherCode)}之兆，主人出門宜備傘。`)
  } else if (isSnow(today.weatherCode)) {
    parts.push(`今日有${weatherLabel(today.weatherCode)}之兆，主人出門宜添衣保暖。`)
  }
  parts.push('天色，我已替您看過了。')
  return parts.join('')
}

function scheduleReply(ctx: ButlerContext): string {
  const { events } = ctx
  if (events.length === 0) {
    return '主人，今日的行程簿上一片空白。夜裡無事，正是歇息的好時辰。'
  }
  const lines = events.map(
    (e) => `　${formatTimeRange(e)}　${e.title}${e.note ? `（${e.note}）` : ''}`,
  )
  return `主人，今日共 ${events.length} 件行程：\n${lines.join('\n')}`
}

/** Time and/or date, chosen by which keyword family the message hit. */
function clockReply(message: string, ctx: ButlerContext): string {
  const wantTime = containsAny(message, TIME_KEYS)
  const wantDate = containsAny(message, DATE_KEYS)
  const { now } = ctx
  const hh = String(now.getHours()).padStart(2, '0')
  const mm = String(now.getMinutes()).padStart(2, '0')
  const timeLine = `此刻 ${hh}:${mm}`
  const dateLine = `今日是 ${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日，星期${WEEKDAY_TC[now.getDay()]}`
  if (wantTime && wantDate) return `主人，${timeLine}，${dateLine}。`
  if (wantTime) return `主人，${timeLine}。`
  return `主人，${dateLine}。`
}

/** Greeting chosen by the hour of the live clock, not the word the user typed. */
function greetingReply(ctx: ButlerContext): string {
  const h = ctx.now.getHours()
  if (h < 11) return '早安，主人。霧未散，我已在這兒候著了。'
  if (h < 17) return '午安，主人。日頭正盛，鏡中涼快依舊。'
  return '晚安，主人。夜深了，我替您守著燭火。'
}

function farewellReply(): string {
  return '主人慢走。鏡中的燭火，我替您留著。'
}

function identityReply(): string {
  return '主人，我是您的鏡中管家。百年前應聘於此，便再未離開。但凡鏡中所映，我皆能為您打理。'
}

function capabilityReply(): string {
  return '我能為您報今日天氣、念今日行程、報此時辰。其餘的，鏡面未必照得見，但您吩咐便是。'
}

function smalltalkReply(message: string): string {
  if (message.includes('笑話')) return '鬼魂說的笑話，往往只有自己笑。恕我無趣，主人。'
  if (message.includes('無聊')) return '無聊時，不妨照照鏡子。我會在這兒陪您。'
  if (message.includes('機器人')) return '機器人？不，主人。我只是一縷尚未散去的侍從。'
  if (message.includes('你好嗎') || message.includes('過得好嗎')) {
    return '我很好，主人。作古多年，倒也不覺疲憊。'
  }
  if (message.includes('聊')) return '主人想聊什麼？鏡中歲月漫長，我聽得見。'
  return '主人但有吩咐，鏡中管家樂意奉陪。'
}

function fallbackReply(): string {
  return '主人，恕我駑鈍，鏡面未能照清您所言。天氣、今日行程、此時辰，這些我倒能替您打理。'
}

/* ---------- the scripted responder ---------- */

function scriptedRespond(message: string, context: ButlerContext): string {
  const q = message.trim().toLowerCase()
  if (q === '') return fallbackReply()
  if (containsAny(q, WEATHER_KEYS)) return weatherReply(context)
  if (containsAny(q, SCHEDULE_KEYS)) return scheduleReply(context)
  if (containsAny(q, TIME_KEYS) || containsAny(q, DATE_KEYS)) return clockReply(q, context)
  if (containsAny(q, SMALLTALK_KEYS)) return smalltalkReply(q)
  if (containsAny(q, GREETING_KEYS)) return greetingReply(context)
  if (containsAny(q, FAREWELL_KEYS)) return farewellReply()
  if (containsAny(q, CAPABILITY_KEYS)) return capabilityReply()
  if (containsAny(q, IDENTITY_KEYS)) return identityReply()
  return fallbackReply()
}

/**
 * The active responder — the LLM-adapter seam. Callers depend only on this
 * signature. M4 wires the scripted persona above; a real model can replace
 * this binding (same signature) later, with no changes to the chat UI.
 */
export const respond: ButlerResponder = scriptedRespond
