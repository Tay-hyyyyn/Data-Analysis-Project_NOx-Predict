import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FlameOverlay } from './FlameOverlay'

function renderInSvg() {
  return render(
    <svg viewBox="0 0 1316 540">
      <FlameOverlay />
    </svg>,
  )
}

describe('FlameOverlay', () => {
  it('flame g + 3개 ellipse 렌더', () => {
    const { container } = renderInSvg()
    const g = container.querySelector('g[data-role="flame"]')
    expect(g).toBeTruthy()
    const ellipses = g!.querySelectorAll('ellipse')
    expect(ellipses.length).toBe(3)
  })

  it('ellipse 좌표는 combustor 위', () => {
    const { container } = renderInSvg()
    const ellipses = container.querySelectorAll('g[data-role="flame"] ellipse')
    ellipses.forEach((e) => {
      const cy = Number(e.getAttribute('cy'))
      expect(cy).toBeLessThan(405) // COMBUSTOR.bbox.y = 404.63
    })
  })
})
