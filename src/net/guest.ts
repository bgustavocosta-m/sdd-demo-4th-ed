import type { DataConnection } from 'peerjs'
import type { GameState, Player } from '../game/ticTacToe'
import { toPeerId } from '../room/roomId'
import { CONNECT_OPTIONS, createPeer } from './peerConfig'
import { isMessage, type Message } from './protocol'

export type GuestOptions = {
  roomId: string
  player: Player
  /** Every `state` snapshot from the host; the first one means we're in. */
  onState: (state: GameState) => void
}

export type GuestSession = {
  move: (cell: number) => void
  rematch: () => void
  destroy: () => void
}

/** The guest runs no rules: it sends intents and renders the host's latest `state`. */
export function joinRoom({ roomId, player, onState }: GuestOptions): GuestSession {
  const peer = createPeer()
  let destroyed = false
  let conn: DataConnection | null = null

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
      if (raw.type === 'state') onState(raw.state)
    })
  })

  // "Room not found" / "Room full" come in #13.
  peer.on('error', (err) => console.error('[guest]', err.type, err))

  return {
    move: (cell) => send({ type: 'move', cell }),
    rematch: () => send({ type: 'rematch' }),
    destroy() {
      destroyed = true
      peer.destroy()
    },
  }
}
