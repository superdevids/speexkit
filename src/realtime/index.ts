/** @module realtime */

/**
 * Options for configuring a WebSocket client.
 */
export interface WSClientOptions {
  /** WebSocket sub-protocols */
  protocols?: string | string[]
  /** Enable auto-reconnect (default: true) */
  reconnect?: boolean
  /** Maximum number of reconnect attempts (default: Infinity) */
  maxReconnects?: number
  /** Base reconnect delay in ms (default: 1000) */
  reconnectDelay?: number
  /** Maximum reconnect delay in ms (default: 30000) */
  maxReconnectDelay?: number
  /** Heartbeat ping interval in ms (default: 30000) */
  heartbeatInterval?: number
  /** Heartbeat pong timeout in ms (default: 5000) */
  heartbeatTimeout?: number
  /** Queue messages while disconnected (default: true) */
  messageQueue?: boolean
  /** Called when the connection opens */
  onOpen?: () => void
  /** Called when the connection closes */
  onClose?: (event: { code: number; reason: string }) => void
  /** Called when an error occurs */
  onError?: (error: unknown) => void
}

/**
 * A WebSocket client with auto-reconnect, heartbeat, message queueing, and a typed event system.
 */
export interface WSClient {
  /** Send raw data through the WebSocket */
  send(data: string | ArrayBuffer | Blob): void
  /** Register a typed event handler */
  on<E extends string>(event: E, handler: (data: any) => void): void
  /** Unregister a typed event handler */
  off<E extends string>(event: E, handler: (data: any) => void): void
  /** Close the WebSocket connection */
  close(): void
  /** Manually trigger a reconnect */
  reconnect(): void
  /** Get the current connection state */
  getState(): 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  /** Check if the WebSocket is currently connected */
  isConnected(): boolean
}

function jitter(delay: number): number {
  return delay * (0.5 + Math.random() * 0.5)
}

/**
 * Create a WebSocket client with auto-reconnect, heartbeat, and message queueing.
 *
 * @param url - WebSocket endpoint
 * @param opts - Optional configuration
 * @returns A {@link WSClient} instance
 *
 * @example
 * ```ts
 * const ws = createWSClient('ws://localhost:8080')
 * ws.on('message', (data) => console.log(data))
 * ws.send('hello')
 * ```
 */
export function createWSClient(url: string | URL, opts?: WSClientOptions): WSClient {
  const {
    protocols,
    reconnect: shouldReconnect = true,
    maxReconnects = Infinity,
    reconnectDelay = 1000,
    maxReconnectDelay = 30000,
    heartbeatInterval: hbInterval = 30000,
    heartbeatTimeout: hbTimeout = 5000,
    messageQueue = true,
    onOpen,
    onClose,
    onError,
  } = opts ?? {}

  type WSState = 'connecting' | 'connected' | 'disconnecting' | 'disconnected'
  const listeners = new Map<string, Set<(data: any) => void>>()

  let ws: WebSocket | null = null
  let state: WSState = 'disconnected'
  let reconnectAttempts = 0
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let heartbeatTimer: ReturnType<typeof setInterval> | null = null
  let pongTimeoutTimer: ReturnType<typeof setTimeout> | null = null
  let intentionalClose = false
  const queue: Array<string | ArrayBuffer | Blob> = []

  function emit(event: string, data: any): void {
    const set = listeners.get(event)
    if (set) {
      for (const handler of Array.from(set)) {
        handler(data)
      }
    }
    const wildcard = listeners.get('*')
    if (wildcard) {
      for (const handler of Array.from(wildcard)) {
        handler({ event, data })
      }
    }
  }

  function clearTimers(): void {
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null }
    if (heartbeatTimer !== null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (pongTimeoutTimer !== null) { clearTimeout(pongTimeoutTimer); pongTimeoutTimer = null }
  }

  function startHeartbeat(): void {
    stopHeartbeat()
    heartbeatTimer = setInterval(() => {
      if (ws?.readyState === WebSocket.OPEN) {
        try {
          ws.send(JSON.stringify({ type: 'ping' }))
        } catch { /* connection closed between check and send */ }
        pongTimeoutTimer = setTimeout(() => {
          emit('close', { code: 4000, reason: 'heartbeat timeout' })
          ws?.close()
        }, hbTimeout)
      }
    }, hbInterval)
  }

  function stopHeartbeat(): void {
    if (heartbeatTimer !== null) { clearInterval(heartbeatTimer); heartbeatTimer = null }
    if (pongTimeoutTimer !== null) { clearTimeout(pongTimeoutTimer); pongTimeoutTimer = null }
  }

  function flushQueue(): void {
    while (queue.length > 0) {
      const data = queue.shift()!
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(data)
      } else {
        queue.unshift(data)
        break
      }
    }
  }

  function scheduleReconnect(): void {
    if (!shouldReconnect || intentionalClose) return
    if (reconnectAttempts >= maxReconnects) return
    const delay = Math.min(reconnectDelay * Math.pow(2, reconnectAttempts), maxReconnectDelay)
    const jittered = jitter(delay)
    reconnectTimer = setTimeout(() => {
      reconnectAttempts++
      connect()
    }, jittered)
  }

  function connect(): void {
    if (state === 'connecting' || state === 'connected') return
    state = 'connecting'
    emit('state', state)

    try {
      ws = new WebSocket(url, protocols)
    } catch (err) {
      state = 'disconnected'
      emit('state', state)
      emit('error', err)
      onError?.(err)
      scheduleReconnect()
      return
    }

    ws.onopen = () => {
      state = 'connected'
      reconnectAttempts = 0
      emit('state', state)
      emit('open', undefined)
      onOpen?.()
      flushQueue()
      startHeartbeat()
    }

    ws.onclose = (event: CloseEvent) => {
      state = 'disconnected'
      emit('state', state)
      clearTimers()
      if (!intentionalClose) {
        emit('close', { code: event.code, reason: event.reason })
        onClose?.({ code: event.code, reason: event.reason })
        scheduleReconnect()
      }
    }

    ws.onerror = (event: Event) => {
      emit('error', event)
      onError?.(event)
    }

    ws.onmessage = (event: MessageEvent) => {
      const raw = event.data

      // Handle heartbeat pong
      if (typeof raw === 'string') {
        try {
          const parsed = JSON.parse(raw)
          if (parsed.type === 'pong') {
            if (pongTimeoutTimer !== null) { clearTimeout(pongTimeoutTimer); pongTimeoutTimer = null }
            return
          }
          // Emit custom event from JSON { event, data }
          if (typeof parsed.event === 'string') {
            emit(parsed.event, parsed.data)
            return
          }
        } catch { /* not JSON, treat as raw message */ }
      }

      emit('message', raw)
    }
  }

  const client: WSClient = {
    send(data: string | ArrayBuffer | Blob): void {
      if (ws?.readyState === WebSocket.OPEN) {
        ws.send(data)
      } else if (messageQueue) {
        queue.push(data)
      }
    },

    on<E extends string>(event: E, handler: (data: any) => void): void {
      let set = listeners.get(event)
      if (!set) {
        set = new Set()
        listeners.set(event, set)
      }
      set.add(handler)
    },

    off<E extends string>(event: E, handler: (data: any) => void): void {
      const set = listeners.get(event)
      if (set) {
        set.delete(handler)
        if (set.size === 0) listeners.delete(event)
      }
    },

    close(): void {
      intentionalClose = true
      clearTimers()
      state = 'disconnecting'
      emit('state', state)
      ws?.close()
      ws = null
      state = 'disconnected'
      emit('state', state)
      queue.length = 0
    },

    reconnect(): void {
      intentionalClose = false
      reconnectAttempts = 0
      clearTimers()
      ws?.close()
      ws = null
      connect()
    },

    getState(): WSState {
      return state
    },

    isConnected(): boolean {
      return state === 'connected'
    },
  }

  connect()

  return client
}

/**
 * Options for configuring an SSE client.
 */
export interface SSEClientOptions {
  /** HTTP method (default: 'GET') */
  method?: 'GET' | 'POST'
  /** Additional HTTP headers */
  headers?: Record<string, string>
  /** Request body for POST */
  body?: string
  /** Enable auto-reconnect (default: true) */
  reconnect?: boolean
  /** Maximum reconnect attempts (default: Infinity) */
  maxReconnects?: number
  /** Base reconnect delay in ms (default: 1000) */
  reconnectDelay?: number
  /** Last event ID for resuming (sent as Last-Event-ID header) */
  lastEventId?: string
}

/**
 * An SSE (Server-Sent Events) client with auto-reconnect and Last-Event-ID support.
 */
export interface SSEClient {
  /** Register a typed event handler (use 'message' for unnamed events) */
  on<E extends string>(event: E, handler: (data: any) => void): void
  /** Unregister a typed event handler */
  off<E extends string>(event: E, handler: (data: any) => void): void
  /** Close the SSE connection */
  close(): void
  /** Get the current connection state */
  getState(): 'connecting' | 'connected' | 'disconnected'
}

interface SSEEvent {
  event: string | null
  data: string
  id: string | null
  retry: number | null
}

function parseSSEStream(chunk: string): SSEEvent[] {
  const lines = chunk.split('\n')
  const events: SSEEvent[] = []
  let current: Partial<SSEEvent> = { data: '' }

  for (const line of lines) {
    if (line.startsWith(':')) continue // comment
    if (line === '') {
      // Empty line = event delimiter
      if (current.data !== undefined) {
        events.push({
          event: current.event ?? null,
          data: current.data ?? '',
          id: current.id ?? null,
          retry: current.retry ?? null,
        })
      }
      current = { data: '' }
      continue
    }
    const colonIdx = line.indexOf(':')
    if (colonIdx === -1) continue
    const field = line.slice(0, colonIdx)
    const value = line.slice(colonIdx + 1)
    const trimmed = value.startsWith(' ') ? value.slice(1) : value

    switch (field) {
      case 'event':
        current.event = trimmed
        break
      case 'data':
        current.data = (current.data ?? '') + trimmed + '\n'
        break
      case 'id':
        if (!trimmed.includes('\0')) {
          current.id = trimmed
        }
        break
      case 'retry':
        current.retry = parseInt(trimmed, 10)
        break
    }
  }

  // Flush remaining
  if (current.data !== undefined && current.data !== '') {
    const last = current.data
    if (last.endsWith('\n')) {
      current.data = last.slice(0, -1)
    }
    events.push({
      event: current.event ?? null,
      data: current.data ?? '',
      id: current.id ?? null,
      retry: current.retry ?? null,
    })
  }

  return events
}

/**
 * Create an SSE (Server-Sent Events) client using native fetch with streaming.
 *
 * @param url - SSE endpoint
 * @param opts - Optional configuration
 * @returns An {@link SSEClient} instance
 *
 * @example
 * ```ts
 * const sse = createSSEClient('https://example.com/events')
 * sse.on('message', (data) => console.log(data))
 * sse.on('custom-event', (data) => console.log(data))
 * ```
 */
export function createSSEClient(url: string | URL, opts?: SSEClientOptions): SSEClient {
  const {
    method = 'GET',
    headers: extraHeaders,
    body,
    reconnect: shouldReconnect = true,
    maxReconnects = Infinity,
    reconnectDelay = 1000,
    lastEventId: initialLastEventId,
  } = opts ?? {}

  const listeners = new Map<string, Set<(data: any) => void>>()
  let state: 'connecting' | 'connected' | 'disconnected' = 'disconnected'
  let abortController: AbortController | null = null
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  let intentionalClose = false
  let currentLastEventId: string | null = initialLastEventId ?? null
  let retryMs = reconnectDelay

  function emit(event: string, data: any): void {
    const set = listeners.get(event)
    if (set) {
      for (const handler of Array.from(set)) {
        handler(data)
      }
    }
    const wildcard = listeners.get('*')
    if (wildcard) {
      for (const handler of Array.from(wildcard)) {
        handler({ event, data })
      }
    }
  }

  function clearTimers(): void {
    if (reconnectTimer !== null) { clearTimeout(reconnectTimer); reconnectTimer = null }
  }

  function scheduleReconnect(): void {
    if (!shouldReconnect || intentionalClose) return
    if (reconnectAttempts >= maxReconnects) return
    const jittered = jitter(retryMs)
    reconnectTimer = setTimeout(() => {
      reconnectAttempts++
      connect()
    }, jittered)
  }

  async function connect(): Promise<void> {
    if (intentionalClose) return
    state = 'connecting'
    emit('state', state)

    abortController = new AbortController()

    const headers: Record<string, string> = {
      Accept: 'text/event-stream',
      ...extraHeaders,
    }
    if (currentLastEventId !== null) {
      headers['Last-Event-ID'] = currentLastEventId
    }

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: method === 'POST' ? body : undefined,
        signal: abortController.signal,
      })

      if (!response.ok) {
        emit('error', new Error(`SSE request failed with status ${response.status}`))
        state = 'disconnected'
        emit('state', state)
        scheduleReconnect()
        return
      }

      if (!response.body) {
        emit('error', new Error('SSE response has no body'))
        state = 'disconnected'
        emit('state', state)
        scheduleReconnect()
        return
      }

      state = 'connected'
      reconnectAttempts = 0
      emit('state', state)
      emit('open', undefined)

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          if (part.trim() === '') continue
          const events = parseSSEStream(part)
          for (const evt of events) {
            if (evt.id !== null) {
              currentLastEventId = evt.id
            }
            if (evt.retry !== null && evt.retry > 0) {
              retryMs = evt.retry
            }
            let parsed: any = evt.data
            try {
              parsed = JSON.parse(evt.data)
            } catch { /* keep raw string */ }
            const eventName = evt.event ?? 'message'
            emit(eventName, parsed)
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') {
        // intentional abort
      } else {
        emit('error', err)
      }
    }

    if (!intentionalClose) {
      state = 'disconnected'
      emit('state', state)
      emit('close', { code: 1006, reason: 'connection closed' })
      scheduleReconnect()
    }
  }

  connect()

  const client: SSEClient = {
    on<E extends string>(event: E, handler: (data: any) => void): void {
      let set = listeners.get(event)
      if (!set) {
        set = new Set()
        listeners.set(event, set)
      }
      set.add(handler)
    },

    off<E extends string>(event: E, handler: (data: any) => void): void {
      const set = listeners.get(event)
      if (set) {
        set.delete(handler)
        if (set.size === 0) listeners.delete(event)
      }
    },

    close(): void {
      intentionalClose = true
      abortController?.abort()
      abortController = null
      clearTimers()
      state = 'disconnected'
      emit('state', state)
    },

    getState(): 'connecting' | 'connected' | 'disconnected' {
      return state
    },
  }

  return client
}
