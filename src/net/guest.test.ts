import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { newGame } from '../game/ticTacToe'
import { fakePeerFactory } from './fakePeer'
import { JOIN_TIMEOUT_MS, joinRoom } from './guest'

const player = { name: 'Bo', emoji: '🐼' }
const state = newGame({ X: { name: 'Al', emoji: '🦊' }, O: player }, 'X')

function setup() {
  const { peers, createPeer } = fakePeerFactory()
  const onState = vi.fn()
  const onFail = vi.fn()
  const session = joinRoom({ roomId: 'abc123', player, onState, onFail }, createPeer)
  const peer = peers[0]
  /** The broker accepted us; the guest dials the host. */
  const dial = () => {
    peer.emit('open', 'guest-id')
    return peer.conns[0]
  }
  return { peer, session, onState, onFail, dial }
}

describe('joinRoom failures', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('maps peer-unavailable to not-found and destroys the Peer', () => {
    const { peer, onFail, dial } = setup()
    dial()
    peer.error('peer-unavailable')
    expect(onFail).toHaveBeenCalledExactlyOnceWith('not-found')
    expect(peer.destroyed).toBe(true)
  })

  it('maps no state within the join timeout to not-found', () => {
    const { peer, onFail, dial } = setup()
    dial()
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS - 1)
    expect(onFail).not.toHaveBeenCalled()
    vi.advanceTimersByTime(1)
    expect(onFail).toHaveBeenCalledExactlyOnceWith('not-found')
    expect(peer.destroyed).toBe(true)
  })

  it('uses an 8 s join timeout', () => {
    expect(JOIN_TIMEOUT_MS).toBe(8000)
  })

  it('maps room-full to full, once, even when the close follows', () => {
    const { peer, onFail, dial } = setup()
    const conn = dial()
    conn.fireOpen()
    conn.emit('data', { type: 'room-full' })
    conn.emit('close')
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS)
    expect(onFail).toHaveBeenCalledExactlyOnceWith('full')
    expect(peer.destroyed).toBe(true)
  })

  it('maps a close before the first state to full', () => {
    const { onFail, dial } = setup()
    const conn = dial()
    conn.fireOpen()
    conn.emit('close')
    expect(onFail).toHaveBeenCalledExactlyOnceWith('full')
  })

  it('does not fail once the first state has arrived', () => {
    const { onFail, onState, dial } = setup()
    const conn = dial()
    conn.fireOpen()
    conn.emit('data', { type: 'state', state })
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS * 2)
    conn.emit('close')
    expect(onState).toHaveBeenCalledWith(state)
    expect(onFail).not.toHaveBeenCalledWith('not-found')
    expect(onFail).not.toHaveBeenCalledWith('full')
  })

  it('reports nothing after destroy()', () => {
    const { peer, session, onFail } = setup()
    session.destroy()
    peer.error('peer-unavailable')
    vi.advanceTimersByTime(JOIN_TIMEOUT_MS)
    expect(onFail).not.toHaveBeenCalled()
  })
})
