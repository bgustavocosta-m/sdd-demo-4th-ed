import type { DataConnection } from 'peerjs'
import type { GameState, Player } from '../game/ticTacToe'
import { toPeerId } from '../room/roomId'
import { startHeartbeat } from './heartbeat'
import { CONNECT_OPTIONS, createPeer } from './peerConfig'
import { isMessage, type Message } from './protocol'

export type GuestOptions = {
  roomId: string
  player: Player
  /** Every `state` snapshot from the host; the first one means we're in. */
  onState: (state: GameState) => void
  /** The host went away (closed, or 6 s without a ping) after letting us in. */
  onLeft: () => void
}

export type GuestSession = {
  move: (cell: number) => void
  rematch: () => void
  destroy: () => void
}

/** The guest runs no rules: it sends intents and renders the host's latest `state`. */
export function joinRoom({ roomId, player, onState, onLeft }: GuestOptions): GuestSession {
  const peer = createPeer()
  let destroyed = false
  let conn: DataConnection | null = null
  let stopHeartbeat = () => {}
  /** We've had a `state`, so we're in the room. */
  let joined = false

  const send = (msg: Message) => {
    if (conn?.open) conn.send(msg)
  }

  peer.on('open', () => {
    if (destroyed) return
    const c = peer.connect(toPeerId(roomId), CONNECT_OPTIONS)
    conn = c
    c.on('open', () => {
      send({ type: 'hello', name: player.name, emoji: player.emoji })
      stopHeartbeat = startHeartbeat(c, () => {
        c.close()
        // Dropped before we were let in: that's "Room full" / "not found" territory (#13).
        if (!destroyed && joined) onLeft()
      })
    })
    c.on('data', (raw) => {
      if (destroyed || !isMessage(raw)) return
      if (raw.type === 'state') {
        joined = true
        onState(raw.state)
      }
    })
  })

  // "Room not found" / "Room full" come in #13.
  peer.on('error', (err) => console.error('[guest]', err.type, err))

  return {
    move: (cell) => send({ type: 'move', cell }),
    rematch: () => send({ type: 'rematch' }),
    destroy() {
      destroyed = true
      stopHeartbeat()
      peer.destroy()
    },
  }
}
