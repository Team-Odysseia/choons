import { vi } from 'vitest'

export function mockMatchMedia(matches: (query: string) => boolean) {
  vi.stubGlobal(
    'matchMedia',
    vi.fn().mockImplementation((query: string) => ({
      matches: matches(query),
      media: query,
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  )
}

export function mockReducedMotion(reduce: boolean) {
  mockMatchMedia((query) => reduce && query.includes('prefers-reduced-motion: reduce'))
}
