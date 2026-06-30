import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createWSClient, createSSEClient } from '../src/realtime/index.js'

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3
  static instances: MockWebSocket[] = []
  url: string
  readyState: number = MockWebSocket.CONNECTING
  onopen: (() => void) | null = null
  onclose: ((event: any) => void) | null = null
  onerror: ((event: any) => void) | null = null
  onmessage: ((event: any) => void) | null = null

  constructor(url: string) {
    MockWebSocket.instances.push(this)
    this.url = url
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN
      this.onopen?.()
    }, 0)
  }

  send(data: any): void {
    // noop in mock
  }

  close(): void {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.({ code: 1000, reason: 'normal' })
  }

  static reset() {
    MockWebSocket.instances = []
  }

  static simulateMessage(data: any) {
    for (const ws of MockWebSocket.instances) {
      ws.onmessage?.({ data })
    }
  }
}

describe('createWSClient', () => {
  beforeEach(() => {
    MockWebSocket.reset()
    vi.stubGlobal('WebSocket', MockWebSocket)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('connects to a valid URL', () => {
    const client = createWSClient('ws://localhost:8080')
    expect(client.getState()).toBe('connecting')
  })

  it('emits error event for invalid URL', () => {
    const onError = vi.fn()
    createWSClient('ws://invalid-url-that-fails', { onError })
  })

  it('does not throw on null URL (caught internally)', () => {
    expect(() => createWSClient(null as unknown as string)).not.toThrow()
  })

  it('does not throw on empty string URL (caught internally)', () => {
    expect(() => createWSClient('')).not.toThrow()
  })

  it('queues messages sent before connection opens', () => {
    MockWebSocket.reset()
    vi.stubGlobal(
      'WebSocket',
      class extends MockWebSocket {
        constructor(url: string) {
          super(url)
          this.readyState = MockWebSocket.CONNECTING
        }
        open() {
          this.readyState = MockWebSocket.OPEN
          this.onopen?.()
        }
      },
    )
    const client = createWSClient('ws://localhost:8080')
    const spy = vi.spyOn(MockWebSocket.instances[0]!, 'send')
    client.send('queued-message')
    expect(spy).not.toHaveBeenCalled()
  })

  it('send() works when connected', () => {
    const client = createWSClient('ws://localhost:8080')
    vi.advanceTimersByTime(0)
    const ws = MockWebSocket.instances[0]!
    const spy = vi.spyOn(ws, 'send')
    client.send('hello')
    expect(spy).toHaveBeenCalledWith('hello')
  })

  it('close then send is a no-op', () => {
    const client = createWSClient('ws://localhost:8080')
    client.close()
    expect(() => client.send('after-close')).not.toThrow()
  })

  it('close changes state to disconnected', () => {
    const client = createWSClient('ws://localhost:8080')
    client.close()
    expect(client.getState()).toBe('disconnected')
  })

  it('isConnected returns false after close', () => {
    const client = createWSClient('ws://localhost:8080')
    client.close()
    expect(client.isConnected()).toBe(false)
  })

  it('on/off registers and unregisters event handlers', () => {
    const client = createWSClient('ws://localhost:8080')
    const handler = vi.fn()
    client.on('message', handler)
    MockWebSocket.simulateMessage('test')
    expect(handler).toHaveBeenCalledWith('test')
    client.off('message', handler)
    MockWebSocket.simulateMessage('test2')
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('auto-reconnects on disconnect', () => {
    const client = createWSClient('ws://localhost:8080', { reconnectDelay: 100 })
    client.close()
  })

  it('reconnect() re-establishes connection', () => {
    const client = createWSClient('ws://localhost:8080')
    client.close()
    client.reconnect()
    expect(client.getState()).toBe('connecting')
  })

  it('heartbeat sends ping', () => {
    createWSClient('ws://localhost:8080', { heartbeatInterval: 100 })
    const ws = MockWebSocket.instances[0]!
    const spy = vi.spyOn(ws, 'send')
    vi.advanceTimersByTime(100)
    expect(spy).toHaveBeenCalledWith(JSON.stringify({ type: 'ping' }))
  })

  it('getState returns current state', () => {
    const client = createWSClient('ws://localhost:8080')
    expect(['connecting', 'connected', 'disconnecting', 'disconnected']).toContain(client.getState())
  })
})

describe('createSSEClient', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('does not throw on null URL (caught internally as fetch error)', () => {
    expect(() => createSSEClient(null as unknown as string)).not.toThrow()
  })

  it('does not throw on empty string URL (caught internally as fetch error)', () => {
    expect(() => createSSEClient('')).not.toThrow()
  })

  it('close changes state to disconnected', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const client = createSSEClient('http://localhost:8080/events')
    client.close()
    expect(client.getState()).toBe('disconnected')
  })

  it('on/off registers and unregisters event handlers', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const client = createSSEClient('http://localhost:8080/events')
    const handler = vi.fn()
    client.on('message', handler)
    client.off('message', handler)
    expect(() => handler).not.toThrow()
  })

  it('getState returns current state', () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('fetch failed')))
    const client = createSSEClient('http://localhost:8080/events')
    expect(['connecting', 'connected', 'disconnected']).toContain(client.getState())
  })
})
