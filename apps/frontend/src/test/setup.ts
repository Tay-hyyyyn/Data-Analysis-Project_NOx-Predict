import '@testing-library/jest-dom/vitest'
import { afterEach } from 'vitest'
import { cleanup } from '@testing-library/react'

afterEach(() => {
  cleanup()
})

// jsdom 미구현 mock (Task 9 cascade hook 테스트가 의존)
if (typeof Element !== 'undefined' && !('animate' in Element.prototype)) {
  Element.prototype.animate = function () {
    return {
      cancel: () => {},
      finish: () => {},
      play: () => {},
      pause: () => {},
      onfinish: null,
      finished: Promise.resolve(),
    } as unknown as Animation
  }
}

if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addEventListener: () => {},
      removeEventListener: () => {},
      addListener: () => {},
      removeListener: () => {},
      dispatchEvent: () => false,
    }) as unknown as MediaQueryList
}
