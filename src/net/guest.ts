import type { DataConnection } from 'peerjs'
import type { GameState, Player } from '../game/ticTacToe'
import { toPeerId } from '../room/roomId'
import { CONNECT_OPTIONS, createPeer as createRealPeer } from './peerConfig'
import { isMessage, type Message } from './protocol'

/** No `state` by then → "Room not found" (#4). A conn to a missing peer never fires `open` or `close` (#2). */
export const JOIN_TIMEOUT_MS = 8000

/** Why the guest couldn't get in: nobody hosts that room, or it already has two players. */
export type JoinFailure = 'not-found' | 'full'

export type GuestOptions = {
  roomId: string
  player: Player
  /** Every `state` snapshot from the host; the first one means we're in. */
  onState: (state: GameState) => void
  /** Called at most once, before any `state`; the Peer is already destroyed. */
  onFail: (reason: JoinFailure) => void
}

export type GuestSession = {
  move: (cell: number) => void
  rematch: () => void
  destroy: () => void
}

/** The guest runs no rules: it sends intents and renders the host's latest `state`. */
export function joinRoom(
  { roomId, player, onState, onFail }: GuestOptions,
  createPeer = createRealPeer,
): GuestSession {
  const peer = createPeer()
  let destroyed = false
  let joined = false
  let conn: DataConnection | null = null

  const destroy = () => {
    destroyed = true
    clearTimeout(timeout)
    peer.destroy()
  }

  const fail = (reason: JoinFailure) => {
    if (destroyed || joined) return
    destroy()
    onFail(reason)
  }

  const timeout = setTimeout(() => fail('not-found'), JOIN_TIMEOUT_MS)

  const send = (msg: Message) => {
    if (conn?.open) conn.send(msg)
  }

  peer.on('open', () => {
    if (destroyed) return
    const c = peer.connect(toPeerId(roomId), CONNECT_OPTIONS)
    conn = c
    c.on('open', () => send({ type: 'hello', name: player.name, emoji: player.emoji }))
    c.on('data', (raw) => {
      if (destroyed || !isMessage(raw)) return
      if (raw.type === 'room-full') fail('full')
      if (raw.type !== 'state') return
      joined = true
      clearTimeout(timeout)
      onState(raw.state)
    })
    // The host closes on a third visitor; a close before any `state` means we never got in (#2).
    c.on('close', () => fail('full'))
  })

  peer.on('error', (err) => {
    if (err.type === 'peer-unavailable') fail('not-found')
    else console.error('[guest]', err.type, err)
  })

  return {
    move: (cell) => send({ type: 'move', cell }),
    rematch: () => send({ type: 'rematch' }),
    destroy,
  }
}
