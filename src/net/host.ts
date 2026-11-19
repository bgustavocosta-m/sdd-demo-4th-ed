import type { DataConnection, Peer } from 'peerjs'
import { applyMove, newGame, rematch, type GameState, type Player } from '../game/ticTacToe'
import { isEmoji, validateName } from '../profile/profile'
import { generateRoomId, toPeerId } from '../room/roomId'
import { startHeartbeat } from './heartbeat'
import { createPeer as createRealPeer } from './peerConfig'
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
  /** Every try got `unavailable-id`: "Couldn't create room, try again". */
  onFail: () => void
  /** The guest left after joining: the room is over (no return to waiting). */
  onLeft: () => void
}

export type HostSession = {
  makeMove: (cell: number) => void
  rematch: () => void
  destroy: () => void
}

/** Room IDs tried before giving up (#4). A taken ID destroys the Peer, so each try is a new Peer (#2). */
export const CREATE_TRIES = 3

/** Host-authoritative: owns the `GameState`, applies both players' moves, sends full snapshots. */
export function hostRoom(
  { player, onOpen, onState, onFail, onLeft }: HostOptions,
  createPeer = createRealPeer,
): HostSession {
  let peer: Peer
  let tries = 0
  let destroyed = false
  let opponent: DataConnection | null = null
  let stopHeartbeat = () => {}
  let started = false
  /** The guest left mid-game; nobody else gets in. */
  let ended = false
  let state = newGame({ X: player, O: { name: 'Guest', emoji: '' } }, 'X')

  const publish = (next: GameState) => {
    state = next
    if (!destroyed) onState(state)
  }

  const start = () => {
    tries++
    const roomId = generateRoomId()
    const p = createPeer(toPeerId(roomId))
    peer = p
    /** Events from a Peer we've replaced or destroyed are ignored. */
    const live = () => !destroyed && p === peer

    p.on('open', () => {
      if (live()) onOpen(roomId)
    })

    p.on('connection', (conn) => {
      if (!live()) return
      conn.on('open', () => {
        if (opponent || ended) {
          // A third visitor: flush so `room-full` arrives before the close (#2).
          conn.send({ type: 'room-full' } satisfies Message)
          conn.close({ flush: true })
          return
        }
        opponent = conn
        stopHeartbeat = startHeartbeat(conn, () => {
          opponent = null
          conn.close()
          if (destroyed) return
          // A guest who leaves before saying hello frees the room for the next one.
          if (!started) return
          ended = true
          onLeft()
        })
      })
      conn.on('data', (raw) => {
        if (conn !== opponent || !isMessage(raw) || raw.type === 'ping') return
        if (!started && raw.type !== 'hello') return
        if (raw.type === 'hello') started = true
        const step = handleGuestMessage(state, raw)
        if (step.send) conn.send(step.send)
        publish(step.state)
      })
    })

    p.on('error', (err) => {
      if (!live()) return
      if (err.type !== 'unavailable-id') {
        console.error('[host]', err.type, err)
        return
      }
      p.destroy()
      if (tries < CREATE_TRIES) start()
      else onFail()
    })
  }

  start()

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
      stopHeartbeat()
      peer.destroy()
    },
  }
}
