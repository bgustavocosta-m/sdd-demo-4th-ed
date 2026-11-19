import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LOST_AFTER_MS, PING_EVERY_MS, startHeartbeat, type HeartbeatConn } from './heartbeat'
import type { Message } from './protocol'

/** A stand-in for a PeerJS DataConnection: records what's sent, lets the test emit events. */
function fakeConn() {
  const handlers = { data: new Set<(raw: unknown) => void>(), close: new Set<() => void>() }
  const sent: Message[] = []
  const conn: HeartbeatConn = {
    open: true,
    send: (msg) => sent.push(msg),
    on: (event: 'data' | 'close', fn: never) => void handlers[event].add(fn),
    off: (event: 'data' | 'close', fn: never) => void handlers[event].delete(fn),
  }
  return {
    conn,
    sent,
    receive: (raw: unknown) => handlers.data.forEach((fn) => fn(raw)),
    close: () => handlers.close.forEach((fn) => fn()),
    listeners: () => handlers.data.size + handlers.close.size,
  }
}

describe('startHeartbeat', () => {
  beforeEach(() => void vi.useFakeTimers())
  afterEach(() => void vi.useRealTimers())

  it('uses the decided timings: ping every 2 s, lost after 6 s', () => {
    expect(PING_EVERY_MS).toBe(2000)
    expect(LOST_AFTER_MS).toBe(6000)
  })

  it('sends a ping every 2 s', () => {
    const f = fakeConn()
    startHeartbeat(f.conn, () => {})
    vi.advanceTimersByTime(1999)
    expect(f.sent).toEqual([])
    vi.advanceTimersByTime(1)
    expect(f.sent).toEqual([{ type: 'ping' }])
    f.receive({ type: 'ping' }) // keep it alive past 6 s
    vi.advanceTimersByTime(4000) // now at 6 s: pings at 2, 4 and 6 s
    expect(f.sent).toHaveLength(3)
  })

  it('does not send while the connection is not open', () => {
    const f = fakeConn()
    f.conn.open = false
    startHeartbeat(f.conn, () => {})
    vi.advanceTimersByTime(2000)
    expect(f.sent).toEqual([])
  })

  it('fires onLost after 6 s of silence, and not before', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    startHeartbeat(f.conn, onLost)
    vi.advanceTimersByTime(5999)
    expect(onLost).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLost).toHaveBeenCalledOnce()
  })

  it('resets the silence timer on every incoming ping', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    startHeartbeat(f.conn, onLost)
    for (let i = 0; i < 5; i++) {
      vi.advanceTimersByTime(5000)
      f.receive({ type: 'ping' })
    }
    expect(onLost).not.toHaveBeenCalled()
    vi.advanceTimersByTime(5999)
    expect(onLost).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onLost).toHaveBeenCalledOnce()
  })

  it('does not reset the timer on other messages or junk', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    startHeartbeat(f.conn, onLost)
    vi.advanceTimersByTime(5000)
    f.receive({ type: 'move', cell: 4 })
    f.receive('ping')
    f.receive({ type: 'pong' })
    vi.advanceTimersByTime(1000)
    expect(onLost).toHaveBeenCalledOnce()
  })

  it('fires onLost at once when the connection closes, then stops', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    startHeartbeat(f.conn, onLost)
    vi.advanceTimersByTime(1000)
    f.close()
    expect(onLost).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(60_000)
    expect(onLost).toHaveBeenCalledOnce()
    expect(f.sent).toEqual([])
    expect(f.listeners()).toBe(0)
  })

  it('fires onLost only once after a timeout, and stops pinging', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    startHeartbeat(f.conn, onLost)
    vi.advanceTimersByTime(6000)
    const sentAtLoss = f.sent.length
    f.close()
    vi.advanceTimersByTime(60_000)
    expect(onLost).toHaveBeenCalledOnce()
    expect(f.sent).toHaveLength(sentAtLoss)
  })

  it('stop() clears its timers and listeners', () => {
    const f = fakeConn()
    const onLost = vi.fn()
    const stop = startHeartbeat(f.conn, onLost)
    vi.advanceTimersByTime(2000)
    stop()
    expect(vi.getTimerCount()).toBe(0)
    expect(f.listeners()).toBe(0)
    f.close()
    vi.advanceTimersByTime(60_000)
    expect(onLost).not.toHaveBeenCalled()
    expect(f.sent).toHaveLength(1)
  })
})
