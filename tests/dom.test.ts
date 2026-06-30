import { describe, it, expect } from 'vitest'
import {
  copyToClipboard,
  downloadFile,
  readFileAsText,
  readFileAsDataURL,
  onClickOutside,
  lockScroll,
  onVisible,
  getViewport,
  isTouchDevice,
  scrollToTop,
  scrollToElement,
  trapFocus,
  debounceResize,
} from '../src/dom/index.js'

function expectBrowserError(fn: () => unknown, msg?: string): void {
  expect(fn).toThrow()
  try {
    fn()
  } catch (e: unknown) {
    const err = e as Error
    if (msg) {
      expect(err.message).toContain(msg)
    } else {
      expect(err.message).toContain('browser')
    }
  }
}

describe('copyToClipboard', () => {
  it('throws when called outside a browser environment', async () => {
    await expect(copyToClipboard('test')).rejects.toThrow('browser')
  })

  it('rejects with an informative error message', async () => {
    try {
      await copyToClipboard('hello')
    } catch (e: unknown) {
      expect((e as Error).message).toContain('can only be used in a browser')
    }
  })

  it('empty string also throws', async () => {
    await expect(copyToClipboard('')).rejects.toThrow('browser')
  })
})

describe('downloadFile', () => {
  it('throws when called outside a browser environment', () => {
    const blob = new Blob(['test'])
    expectBrowserError(() => downloadFile(blob, 'test.txt'))
  })

  it('requires a Blob as first argument', () => {
    expect(() => (downloadFile as Function)(null, 'x')).toThrow()
  })
})

describe('readFileAsText', () => {
  it('throws when called outside a browser environment', () => {
    expect(() => readFileAsText({} as File)).toThrow('browser')
  })
})

describe('readFileAsDataURL', () => {
  it('throws when called outside a browser environment', () => {
    expect(() => readFileAsDataURL({} as File)).toThrow('browser')
  })
})

describe('onClickOutside', () => {
  it('throws when element is null', () => {
    expectBrowserError(() => onClickOutside(null as unknown as HTMLElement, () => {}))
  })

  it('throws when called outside browser', () => {
    const div = {} as HTMLElement
    expectBrowserError(() => onClickOutside(div, () => {}))
  })
})

describe('lockScroll', () => {
  it('throws when called outside a browser environment', () => {
    expectBrowserError(() => lockScroll())
  })

  it('throws even when given a target element', () => {
    expectBrowserError(() => lockScroll({} as HTMLElement))
  })
})

describe('trapFocus', () => {
  it('throws when element is null', () => {
    expectBrowserError(() => trapFocus(null as unknown as HTMLElement))
  })

  it('throws when called outside browser', () => {
    expectBrowserError(() => trapFocus({} as HTMLElement))
  })
})

describe('getViewport', () => {
  it('throws when called outside a browser environment', () => {
    expectBrowserError(() => getViewport())
  })
})

describe('isTouchDevice', () => {
  it('throws when called outside a browser environment', () => {
    expectBrowserError(() => isTouchDevice())
  })
})

describe('scrollToTop', () => {
  it('throws when called outside a browser environment', () => {
    expectBrowserError(() => scrollToTop())
  })
})

describe('scrollToElement', () => {
  it('throws when element is null', () => {
    expectBrowserError(() => scrollToElement(null as unknown as HTMLElement))
  })

  it('throws when called outside browser', () => {
    expectBrowserError(() => scrollToElement({} as HTMLElement))
  })
})

describe('debounceResize', () => {
  it('throws when called outside a browser environment', () => {
    expectBrowserError(() => debounceResize(() => {}))
  })
})

describe('onVisible', () => {
  it('throws when element is null', () => {
    expectBrowserError(() => onVisible(null as unknown as HTMLElement, () => {}))
  })

  it('throws when called outside browser', () => {
    expectBrowserError(() => onVisible({} as HTMLElement, () => {}))
  })
})
