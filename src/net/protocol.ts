import type { GameState } from '../game/ticTacToe'

/** Every message either peer sends. Plain JSON only. */
export type Message =
  // guest → host
  | { type: 'hello'; name: string; emoji: string }
  | { type: 'move'; cell: number }
  | { type: 'rematch' }
  // both ways
  | { type: 'ping' }
  // host → guest
  | { type: 'state'; state: GameState }
  | { type: 'room-full' }

type Obj = Record<string, unknown>

const isObj = (x: unknown): x is Obj => typeof x === 'object' && x !== null && !Array.isArray(x)
const isMark = (x: unknown) => x === 'X' || x === 'O'
const isCellIndex = (x: unknown) => Number.isInteger(x) && (x as number) >= 0 && (x as number) <= 8
const isPlayer = (x: unknown) => isObj(x) && typeof x.name === 'string' && typeof x.emoji === 'string'

function isGameState(x: unknown): x is GameState {
  return (
    isObj(x) &&
    Array.isArray(x.board) &&
    x.board.length === 9 &&
    x.board.every((c) => c === null || isMark(c)) &&
    isMark(x.turn) &&
    (x.winner === null || isMark(x.winner)) &&
    typeof x.draw === 'boolean' &&
    (x.winningLine === null ||
      (Array.isArray(x.winningLine) && x.winningLine.length === 3 && x.winningLine.every(isCellIndex))) &&
    isObj(x.players) &&
    isPlayer(x.players.X) &&
    isPlayer(x.players.O) &&
    isMark(x.firstMover)
  )
}

/** Type guard for anything received from a peer; drop whatever fails it. */
export function isMessage(x: unknown): x is Message {
  if (!isObj(x)) return false
  switch (x.type) {
    case 'hello':
      return typeof x.name === 'string' && typeof x.emoji === 'string'
    case 'move':
      return isCellIndex(x.cell)
    case 'rematch':
    case 'ping':
    case 'room-full':
      return true
    case 'state':
      return isGameState(x.state)
    default:
      return false
  }
}
