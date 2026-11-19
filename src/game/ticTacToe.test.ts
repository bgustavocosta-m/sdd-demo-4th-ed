import { describe, expect, it } from 'vitest'
import { applyMove, newGame, rematch, WINNING_LINES, type GameState, type Mark } from './ticTacToe'

const players = {
  X: { name: 'Ana', emoji: '🦊' },
  O: { name: 'Rui', emoji: '🐸' },
}

/** Plays `cells` in order, alternating from whoever's turn it is; fails the test on an invalid move. */
function play(state: GameState, cells: number[]): GameState {
  return cells.reduce((s, cell) => {
    const next = applyMove(s, s.turn, cell)
    if (!next) throw new Error(`move ${cell} by ${s.turn} was rejected`)
    return next
  }, state)
}

describe('newGame', () => {
  it.each<Mark>(['X', 'O'])('starts an empty board with %s to move', (firstMover) => {
    const state = newGame(players, firstMover)
    expect(state).toEqual({
      board: [null, null, null, null, null, null, null, null, null],
      turn: firstMover,
      winner: null,
      draw: false,
      winningLine: null,
      players,
      firstMover,
    })
  })
})

describe('applyMove', () => {
  it('places the mark and alternates turns', () => {
    const s1 = applyMove(newGame(players, 'X'), 'X', 4)
    expect(s1?.board[4]).toBe('X')
    expect(s1?.turn).toBe('O')

    const s2 = applyMove(s1!, 'O', 0)
    expect(s2?.board[0]).toBe('O')
    expect(s2?.turn).toBe('X')
  })

  it('does not mutate the previous state', () => {
    const before = newGame(players, 'X')
    applyMove(before, 'X', 4)
    expect(before.board[4]).toBeNull()
    expect(before.turn).toBe('X')
  })

  it('rejects a move out of turn', () => {
    expect(applyMove(newGame(players, 'X'), 'O', 0)).toBeNull()
    expect(applyMove(newGame(players, 'O'), 'X', 0)).toBeNull()
  })

  it('rejects a move on a taken cell', () => {
    const state = play(newGame(players, 'X'), [4])
    expect(applyMove(state, 'O', 4)).toBeNull()
  })

  it.each([-1, 9, 10, 1.5, Number.NaN, Infinity])('rejects out-of-range cell %s', (cell) => {
    expect(applyMove(newGame(players, 'X'), 'X', cell)).toBeNull()
  })

  it('rejects any move after a win', () => {
    // X: 0 1 2 — O: 3 4
    const won = play(newGame(players, 'X'), [0, 3, 1, 4, 2])
    expect(won.winner).toBe('X')
    expect(applyMove(won, 'O', 5)).toBeNull()
    expect(applyMove(won, 'X', 5)).toBeNull()
  })

  it('rejects any move after a draw', () => {
    const drawn = play(newGame(players, 'X'), [0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(drawn.draw).toBe(true)
    expect(applyMove(drawn, drawn.turn, 0)).toBeNull()
  })

  it('has exactly the 8 lines of tic-tac-toe', () => {
    expect([...WINNING_LINES].map((l) => [...l].sort()).sort()).toEqual(
      [
        [0, 1, 2], [3, 4, 5], [6, 7, 8],
        [0, 3, 6], [1, 4, 7], [2, 5, 8],
        [0, 4, 8], [2, 4, 6],
      ].sort(),
    )
  })

  it.each(WINNING_LINES.map((line) => [line.join('-'), line] as const))(
    'detects a win on line %s',
    (_, line) => {
      // X takes the line; O plays two cells off the line that can't complete one of its own.
      const others = [0, 1, 2, 3, 4, 5, 6, 7, 8].filter((c) => !line.includes(c))
      const state = play(newGame(players, 'X'), [line[0], others[0], line[1], others[1]])
      const won = applyMove(state, 'X', line[2])
      expect(won?.winner).toBe('X')
      expect(won?.winningLine).toEqual([...line])
      expect(won?.draw).toBe(false)
    },
  )

  it('detects a win for O', () => {
    // X: 0 1 8 — O: 3 4 5
    const won = play(newGame(players, 'X'), [0, 3, 1, 4, 8, 5])
    expect(won.winner).toBe('O')
    expect(won.winningLine).toEqual([3, 4, 5])
  })

  it('counts a line completed by the ninth move as a win, not a draw', () => {
    // X O X / O X O / O X X — X's last move on 8 completes 0-4-8
    const state = play(newGame(players, 'X'), [0, 1, 2, 3, 4, 5, 7, 6])
    const won = applyMove(state, 'X', 8)
    expect(won?.board.every((c) => c !== null)).toBe(true)
    expect(won?.winner).toBe('X')
    expect(won?.winningLine).toEqual([0, 4, 8])
    expect(won?.draw).toBe(false)
  })

  it('declares a draw on a full board with no line', () => {
    // X O X / X O O / O X X
    const drawn = play(newGame(players, 'X'), [0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(drawn.draw).toBe(true)
    expect(drawn.winner).toBeNull()
    expect(drawn.winningLine).toBeNull()
  })
})

describe('rematch', () => {
  it('is rejected before the game is over', () => {
    expect(rematch(newGame(players, 'X'))).toBeNull()
    expect(rematch(play(newGame(players, 'X'), [4, 0]))).toBeNull()
  })

  it('after a win, resets the board and flips the first mover', () => {
    // X: 0 1 2 — O: 3 4
    const won = play(newGame(players, 'X'), [0, 3, 1, 4, 2])
    expect(rematch(won)).toEqual(newGame(players, 'O'))
  })

  it('after a draw, resets the board and flips the first mover', () => {
    const drawn = play(newGame(players, 'O'), [0, 1, 2, 4, 3, 5, 7, 6, 8])
    expect(drawn.draw).toBe(true)
    expect(rematch(drawn)).toEqual(newGame(players, 'X'))
  })

  it('keeps the players and their marks', () => {
    const won = play(newGame(players, 'X'), [0, 3, 1, 4, 2])
    expect(rematch(won)?.players).toEqual(players)
  })
})
