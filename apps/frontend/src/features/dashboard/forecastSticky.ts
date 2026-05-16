import type { RealtimeStreamPayload } from './mockConsole'
import { isForecastReady } from './mockConsole'

type ForecastPayload = NonNullable<RealtimeStreamPayload['forecast']>

/**
 * ForecastCard sticky 디바운스 상태.
 *
 * - `lastReady` : 마지막으로 ready였던 forecast (없으면 null)
 * - `notReadyStreak` : 연속 not-ready payload 수 (ready 들어오면 0)
 */
export interface ForecastStickyState {
  lastReady: ForecastPayload | null
  notReadyStreak: number
}

export const initialForecastStickyState: ForecastStickyState = {
  lastReady: null,
  notReadyStreak: 0,
}

// WS payload는 1Hz. not-ready가 이 횟수(약 4초) 연속될 때만 "준비 중"으로 폴백.
// 백엔드 stale grace보다 짧게 잡아, 백엔드가 hold 못 하는 짧은 공백도
// 프론트에서 한 번 더 흡수하는 이중 방어.
export const FORECAST_STICKY_TICKS = 4

/**
 * 새 payload 1개를 sticky 상태에 반영한 다음 상태를 반환하는 순수 함수.
 *
 * ready면 lastReady 갱신 + streak 리셋, not-ready면 streak 증가.
 * 상태가 실제로 바뀌지 않으면 동일 참조를 반환해 불필요한 리렌더를 막는다.
 */
export function reduceForecastSticky(
  prev: ForecastStickyState,
  forecast: RealtimeStreamPayload['forecast'],
  warning: RealtimeStreamPayload['warning'],
): ForecastStickyState {
  if (isForecastReady(forecast, warning)) {
    if (prev.lastReady === forecast && prev.notReadyStreak === 0) return prev
    return { lastReady: forecast, notReadyStreak: 0 }
  }
  if (prev.lastReady === null) return prev
  return { lastReady: prev.lastReady, notReadyStreak: prev.notReadyStreak + 1 }
}

/**
 * sticky 상태 기준으로 실제 화면에 표시할 forecast를 고른다.
 *
 * - ready: 그 forecast 즉시 표시
 * - not-ready & grace 이내: 직전 ready forecast를 그대로 hold (깜빡임 차단)
 * - grace 소진: null → "준비 중" 폴백
 */
export function resolveEffectiveForecast(
  state: ForecastStickyState,
  forecast: RealtimeStreamPayload['forecast'],
  warning: RealtimeStreamPayload['warning'],
): ForecastPayload | null {
  if (isForecastReady(forecast, warning)) return forecast
  if (state.lastReady !== null && state.notReadyStreak < FORECAST_STICKY_TICKS) {
    return state.lastReady
  }
  return null
}
