import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// jsdom lacks these browser APIs, which Mantine uses.
const { getComputedStyle } = window
window.getComputedStyle = (element) => getComputedStyle(element)
window.HTMLElement.prototype.scrollIntoView = () => {}
window.scrollTo = () => {}

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
})

class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
window.ResizeObserver = ResizeObserver

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})
