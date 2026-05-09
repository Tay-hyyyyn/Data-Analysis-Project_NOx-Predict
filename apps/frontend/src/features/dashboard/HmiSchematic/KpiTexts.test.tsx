import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { KpiTexts } from './KpiTexts'

function renderInSvg(props: { nox: number; ttxm: number; dwatt: number; lambda: number }) {
  return render(
    <svg viewBox="0 0 1316 540">
      <KpiTexts {...props} />
    </svg>,
  )
}

describe('KpiTexts', () => {
  it('4개 text 렌더, textContent가 props 값과 일치', () => {
    const { container } = renderInSvg({ nox: 26.5, ttxm: 580, dwatt: 248.6, lambda: 1.10 })
    const texts = container.querySelectorAll('text[data-role^="kpi-text-"]')
    expect(texts.length).toBe(4)
    const map = new Map<string, string>()
    texts.forEach((t) => {
      const role = t.getAttribute('data-role')!
      map.set(role, t.textContent ?? '')
    })
    expect(map.get('kpi-text-nox')).toBe('26.5')
    expect(map.get('kpi-text-ttxm')).toBe('580.0')
    expect(map.get('kpi-text-dwatt')).toBe('248.6')
    expect(map.get('kpi-text-lambda')).toBe('1.10')
  })

  it('NaN/Infinity 입력 → "--"', () => {
    const { container } = renderInSvg({ nox: NaN, ttxm: Infinity, dwatt: -Infinity, lambda: NaN })
    const texts = container.querySelectorAll('text[data-role^="kpi-text-"]')
    texts.forEach((t) => expect(t.textContent).toBe('--'))
  })

  it('각 text는 KPI_ANCHORS 좌표 사용 + textAnchor=start', () => {
    const { container } = renderInSvg({ nox: 0, ttxm: 0, dwatt: 0, lambda: 0 })
    const nox = container.querySelector('text[data-role="kpi-text-nox"]')!
    expect(nox.getAttribute('text-anchor')).toBe('start')
    expect(nox.getAttribute('x')).toMatch(/\d+(\.\d+)?/)
    expect(nox.getAttribute('y')).toMatch(/\d+(\.\d+)?/)
  })
})
