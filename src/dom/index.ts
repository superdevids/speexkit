function assertBrowser(): void {
  if (typeof window === 'undefined') {
    throw new Error('speexkit/dom can only be used in a browser environment')
  }
}

/**
 * Copy text to the system clipboard.
 *
 * Uses `navigator.clipboard.writeText` when available, falling back to the
 * legacy `document.execCommand('copy')` approach.
 *
 * @param text - The text to copy.
 * @returns `true` if the copy succeeded, `false` otherwise.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  assertBrowser()

  if (typeof navigator?.clipboard?.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      return false
    }
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.style.position = 'fixed'
  textarea.style.opacity = '0'
  textarea.style.pointerEvents = 'none'
  document.body.appendChild(textarea)
  textarea.select()

  let success = false
  try {
    success = document.execCommand('copy')
  } catch {
    // fall through
  }

  document.body.removeChild(textarea)
  return success
}

/**
 * Trigger a file download in the browser.
 *
 * Creates a temporary `<a>` element with the blob as an object URL, clicks it,
 * and cleans up afterwards.
 *
 * @param blob     - The file data.
 * @param filename - The suggested filename for the download.
 */
export function downloadFile(blob: Blob, filename: string): void {
  assertBrowser()

  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(url)
}

/**
 * Read a {@link File} as a text string.
 *
 * @param file - The file to read.
 * @returns A promise that resolves with the file content as text.
 */
export function readFileAsText(file: File): Promise<string> {
  assertBrowser()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

/**
 * Read a {@link File} as a data URL (base64-encoded).
 *
 * @param file - The file to read.
 * @returns A promise that resolves with the data URL string.
 */
export function readFileAsDataURL(file: File): Promise<string> {
  assertBrowser()

  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

/**
 * Invoke a handler when a click occurs outside the given element.
 *
 * @param el      - The element to monitor.
 * @param handler - The callback receiving the mouse event.
 * @returns A cleanup function that removes the listener.
 */
export function onClickOutside(el: HTMLElement, handler: (event: MouseEvent) => void): () => void {
  assertBrowser()

  const listener = (event: MouseEvent) => {
    if (!el.contains(event.target as Node)) {
      handler(event)
    }
  }

  document.addEventListener('click', listener)
  return () => document.removeEventListener('click', listener)
}

/**
 * Lock the scroll on the body (or a target element) by setting
 * `overflow: hidden`.
 *
 * @param target - The element to lock; defaults to `document.body`.
 * @returns An unlock function that restores the original overflow value.
 */
export function lockScroll(target?: HTMLElement): () => void {
  assertBrowser()

  const el = target ?? document.body
  const original = el.style.overflow

  el.style.overflow = 'hidden'

  return () => {
    el.style.overflow = original
  }
}

/** Selector for focusable elements (standard HTML interactive elements). */
const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(',')

/**
 * Trap keyboard focus within an element so that Tab and Shift+Tab cycle
 * through its focusable children without leaving the trap.
 *
 * Useful for modals, dialogs, and other overlay components.
 *
 * @param el - The element to trap focus inside.
 * @returns A cleanup function that removes the keydown listener.
 */
export function trapFocus(el: HTMLElement): () => void {
  assertBrowser()

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key !== 'Tab') return

    const focusable = el.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    if (focusable.length === 0) return

    const first = focusable[0]!
    const last = focusable[focusable.length - 1]!

    if (event.shiftKey) {
      if (document.activeElement === first) {
        event.preventDefault()
        last.focus()
      }
    } else {
      if (document.activeElement === last) {
        event.preventDefault()
        first.focus()
      }
    }
  }

  document.addEventListener('keydown', handleKeyDown)

  return () => document.removeEventListener('keydown', handleKeyDown)
}

/**
 * Return a function that, when called, removes a debounced resize listener
 * attached to `el` via {@link ResizeObserver}.
 *
 * @param fn    - The callback to invoke on resize (debounced).
 * @param delay - Debounce delay in milliseconds; defaults to `150`.
 * @returns A cleanup function that disconnects the observer.
 */
export function debounceResize(fn: () => void, delay: number = 150): () => void {
  assertBrowser()

  let timer: ReturnType<typeof setTimeout> | null = null

  const observer = new ResizeObserver(() => {
    if (timer != null) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      fn()
    }, delay)
  })

  const el = document.documentElement
  observer.observe(el)

  return () => {
    if (timer != null) clearTimeout(timer)
    observer.disconnect()
  }
}

/**
 * Invoke a callback the first time the element becomes visible in the
 * viewport using {@link IntersectionObserver}.
 *
 * @param el   - The element to observe.
 * @param fn   - The callback to run on first visibility.
 * @param opts - Optional `IntersectionObserverInit` overrides.
 * @returns A function that disconnects the observer early.
 */
export function onVisible(el: HTMLElement, fn: () => void, opts?: IntersectionObserverInit): () => void {
  assertBrowser()

  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting) {
      fn()
      observer.disconnect()
    }
  }, opts)

  observer.observe(el)

  return () => observer.disconnect()
}

/**
 * Get the current viewport width and height.
 *
 * Reads from `document.documentElement.clientWidth` / `clientHeight` or falls
 * back to `window.innerWidth` / `innerHeight`.
 */
export function getViewport(): { width: number; height: number } {
  assertBrowser()

  const el = document.documentElement
  return {
    width: el?.clientWidth ?? window.innerWidth,
    height: el?.clientHeight ?? window.innerHeight,
  }
}

/**
 * Detect whether the device supports touch input.
 *
 * @returns `true` if `'ontouchstart'` is defined on the window object.
 */
export function isTouchDevice(): boolean {
  assertBrowser()
  return 'ontouchstart' in window
}

/**
 * Scroll the window to the top of the document.
 *
 * @param smooth - When `true` (default), uses smooth scrolling behaviour.
 */
export function scrollToTop(smooth: boolean = true): void {
  assertBrowser()

  window.scrollTo({
    top: 0,
    behavior: smooth ? 'smooth' : 'instant',
  })
}

/**
 * Scroll the window so that the given element is visible.
 *
 * @param el     - The element to scroll into view.
 * @param smooth - When `true` (default), uses smooth scrolling behaviour.
 */
export function scrollToElement(el: HTMLElement, smooth: boolean = true): void {
  assertBrowser()

  el.scrollIntoView({
    behavior: smooth ? 'smooth' : 'instant',
    block: 'nearest',
  })
}
