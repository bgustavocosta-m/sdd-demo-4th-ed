export type Mark = 'X' | 'O'
export type Cell = Mark | null
export type Player = { name: string; emoji: string }

export type GameState = {
  /** 9 cells, row by row: 0 1 2 / 3 4 5 / 6 7 8. */
  board: Cell[]
  turn: Mark
  winner: Mark | null
  draw: boolean
  winningLine: number[] | null
  players: { X: Player; O: Player }
  firstMover: Mark
}

export const WINNING_LINES: readonly (readonly [number, number, number])[] = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6],
]

export function newGame(players: { X: Player; O: Player }, firstMover: Mark): GameState {
  return {
    board: Array<Cell>(9).fill(null),
    turn: firstMover,
    winner: null,
    draw: false,
    winningLine: null,
    players,
    firstMover,
  }
}

export function isOver(state: GameState): boolean {
  return state.winner !== null || state.draw
}

/** A fresh board with the same players, the other mark moving first; `null` if the game isn't over yet. */
export function rematch(state: GameState): GameState | null {
  if (!isOver(state)) return null
  return newGame(state.players, state.firstMover === 'X' ? 'O' : 'X')
}

/** Returns the next state, or `null` if the move is invalid (wrong turn, taken cell, out of range, game over). */
export function applyMove(state: GameState, mark: Mark, cell: number): GameState | null {
  if (isOver(state) || mark !== state.turn) return null
  if (!Number.isInteger(cell) || cell < 0 || cell > 8) return null
  if (state.board[cell] !== null) return null

  const board = state.board.slice()
  board[cell] = mark
  const line = WINNING_LINES.find((l) => l.every((i) => board[i] === mark))

  return {
    ...state,
    board,
    turn: mark === 'X' ? 'O' : 'X',
    winner: line ? mark : null,
    winningLine: line ? [...line] : null,
    draw: !line && board.every((c) => c !== null),
  }
}
