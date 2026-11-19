import type { DataConnection } from 'peerjs'
import { applyMove, newGame, rematch, type GameState, type Player } from '../game/ticTacToe'
import { isEmoji, validateName } from '../profile/profile'
import { generateRoomId, toPeerId } from '../room/roomId'
import { createPeer } from './peerConfig'
import { isMessage, type Message } from './protocol'

/** What the host does with one message from the guest: the next state, and what to send back. */
export type HostStep = { state: GameState; send: Message | null }

/** The guest's player as the host will show it: an invalid name or emoji falls back to a default. */
const guestPlayer = (name: string, emoji: string): Player => ({
  name: validateName(name) ?? 'Guest',
  emoji: isEmoji(emoji) ? emoji : '',
})

/**
 * Pure host-side rules: the guest is always O; invalid moves are ignored and the state re-sent.
 * A rematch before game over is ignored.
 */
export function handleGuestMessage(state: GameState, msg: Message): HostStep {
  switch (msg.type) {
    case 'hello': {
      const next = { ...state, players: { ...state.players, O: guestPlayer(msg.name, msg.emoji) } }
      return { state: next, send: { type: 'state', state: next } }
    }
    case 'move': {
      const next = applyMove(state, 'O', msg.cell) ?? state
      return { state: next, send: { type: 'state', state: next } }
    }
    case 'rematch': {
      const next = rematch(state)
      return next ? { state: next, send: { type: 'state', state: next } } : { state, send: null }
    }
    default:
      return { state, send: null }
  }
}

export type HostOptions = {
  player: Player
  /** The Peer is registered with the broker: the room link now works. */
  onOpen: (roomId: string) => void
  /** A guest said hello, or the game changed. */
  onState: (state: GameState) => void
}

export type HostSession = {
  makeMove: (cell: number) => void
  rematch: () => void
  destroy: () => void
}

/** Host-authoritative: owns the `GameState`, applies both players' moves, sends full snapshots. */
export function hostRoom({ player, onOpen, onState }: HostOptions): HostSession {
  const roomId = generateRoomId()
  const peer = createPeer(toPeerId(roomId))
  let destroyed = false
  let opponent: DataConnection | null = null
  let started = false
  let state = newGame({ X: player, O: { name: 'Guest', emoji: '' } }, 'X')

  const publish = (next: GameState) => {
    state = next
    if (!destroyed) onState(state)
  }

  peer.on('open', () => {
    if (!destroyed) onOpen(roomId)
  })

  peer.on('connection', (conn) => {
    conn.on('open', () => {
      if (opponent) {
        conn.close() // A third visitor. "Room full" comes in #13.
        return
      }
      opponent = conn
    })
    conn.on('data', (raw) => {
      if (conn !== opponent || !isMessage(raw)) return
      if (!started && raw.type !== 'hello') return
      if (raw.type === 'hello') started = true
      const step = handleGuestMessage(state, raw)
      if (step.send) conn.send(step.send)
      publish(step.state)
    })
    conn.on('close', () => {
      // A guest who leaves before saying hello frees the room for the next one.
      // Leaving mid-game ("Opponent left") comes in #12.
      if (conn === opponent && !started) opponent = null
    })
  })

  peer.on('error', (err) => console.error('[host]', err.type, err))

  return {
    makeMove(cell) {
      if (!started || !opponent) return
      const next = applyMove(state, 'X', cell)
      if (!next) return
      opponent.send({ type: 'state', state: next } satisfies Message)
      publish(next)
    },
    rematch() {
      if (!started || !opponent) return
      const next = rematch(state)
      if (!next) return
      opponent.send({ type: 'state', state: next } satisfies Message)
      publish(next)
    },
    destroy() {
      destroyed = true
      peer.destroy()
    },
  }
}
