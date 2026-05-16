import { describe, expect, it } from 'vitest'
import type { RealtimeStreamPayload } from './mockConsole'
import {
  FORECAST_STICKY_TICKS,
  initialForecastStickyState,
  reduceForecastSticky,
  resolveEffectiveForecast,
  type ForecastStickyState,
} from './forecastSticky'

function fc(value: number): NonNullable<RealtimeStreamPayload['forecast']> {
  return {
    predicted_nox: value,
    predicted_nox_15pct: value,
    target_time: '2026-05-16T00:05:00Z',
    threshold_exceeded: false,
  } as NonNullable<RealtimeStreamPayload['forecast']>
}

describe('reduceForecastSticky', () => {
  it('ready payload를 받으면 lastReady 갱신 + streak 0', () => {
    const f = fc(12.1)
    const next = reduceForecastSticky(initialForecastStickyState, f, null)
    expect(next.lastReady).toBe(f)
    expect(next.notReadyStreak).toBe(0)
  })

  it('not-ready payload는 lastReady 유지 + streak 증가', () => {
    const prev: ForecastStickyState = { lastReady: fc(12.1), notReadyStreak: 0 }
    const next = reduceForecastSticky(prev, null, 'kafka stream stale')
    expect(next.lastReady).toBe(prev.lastReady)
    expect(next.notReadyStreak).toBe(1)
  })

  it('lastReady가 없으면 not-ready여도 동일 참조 반환 (초기 warmup)', () => {
    const next = reduceForecastSticky(
      initialForecastStickyState,
      null,
      'forecast warmup',
    )
    expect(next).toBe(initialForecastStickyState)
  })

  it('동일 ready forecast 재수신 시 동일 참조 반환 (불필요 리렌더 방지)', () => {
    const f = fc(12.1)
    const prev: ForecastStickyState = { lastReady: f, notReadyStreak: 0 }
    expect(reduceForecastSticky(prev, f, null)).toBe(prev)
  })
})

describe('resolveEffectiveForecast', () => {
  it('ready면 그 forecast를 즉시 반환', () => {
    const f = fc(15.5)
    expect(resolveEffectiveForecast(initialForecastStickyState, f, null)).toBe(f)
  })

  it('not-ready & grace 이내면 직전 ready forecast를 hold (깜빡임 차단)', () => {
    const last = fc(12.1)
    const state: ForecastStickyState = {
      lastReady: last,
      notReadyStreak: FORECAST_STICKY_TICKS - 1,
    }
    expect(resolveEffectiveForecast(state, null, 'kafka stream stale')).toBe(last)
  })

  it('grace 소진 시 null → 준비 중 폴백', () => {
    const state: ForecastStickyState = {
      lastReady: fc(12.1),
      notReadyStreak: FORECAST_STICKY_TICKS,
    }
    expect(
      resolveEffectiveForecast(state, null, 'kafka stream stale'),
    ).toBeNull()
  })

  it('한 번도 ready였던 적 없으면 null', () => {
    expect(
      resolveEffectiveForecast(initialForecastStickyState, null, null),
    ).toBeNull()
  })

  it('단발 stale 시나리오: 값 → stale 1개 → 값 (깜빡임 없이 유지)', () => {
    let state = initialForecastStickyState
    const v1 = fc(12.1)
    state = reduceForecastSticky(state, v1, null)
    expect(resolveEffectiveForecast(state, v1, null)).toBe(v1)

    // 단발 stale payload — 깜빡이면 안 됨
    state = reduceForecastSticky(state, null, 'kafka stream stale')
    expect(resolveEffectiveForecast(state, null, 'kafka stream stale')).toBe(v1)

    // 다시 정상값
    const v2 = fc(13.4)
    state = reduceForecastSticky(state, v2, null)
    expect(resolveEffectiveForecast(state, v2, null)).toBe(v2)
  })
})
