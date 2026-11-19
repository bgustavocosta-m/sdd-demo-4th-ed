import { describe, expect, it } from 'vitest'
import { applyMove, isOver, newGame, type GameState } from '../game/ticTacToe'
import { handleGuestMessage } from './host'

/** Plays the cells in order, from whoever's turn it is. */
const play = (state: GameState, cells: number[]) =>
  cells.reduce((s, cell) => applyMove(s, s.turn, cell)!, state)

const start = newGame({ X: { name: 'Host', emoji: '' }, O: { name: 'Guest', emoji: '' } }, 'X')

describe('handleGuestMessage', () => {
  it('answers hello with the state, naming the guest as O', () => {
    const { state, send } = handleGuestMessage(start, { type: 'hello', name: 'Rui', emoji: '🐸' })
    expect(state.players).toEqual({ X: start.players.X, O: { name: 'Rui', emoji: '🐸' } })
    expect(state.board).toEqual(start.board)
    expect(send).toEqual({ type: 'state', state })
  })

  it('applies a legal guest move as O and sends the new state', () => {
    const oTurn = applyMove(start, 'X', 4)!
    const { state, send } = handleGuestMessage(oTurn, { type: 'move', cell: 0 })
    expect(state.board[0]).toBe('O')
    expect(state.turn).toBe('X')
    expect(send).toEqual({ type: 'state', state })
  })

  it.each([
    ['out of turn', start, 0],
    ['on a taken cell', applyMove(start, 'X', 4)!, 4],
  ])('ignores a move %s and re-sends the unchanged state', (_, before, cell) => {
    const { state, send } = handleGuestMessage(before, { type: 'move', cell })
    expect(state).toBe(before)
    expect(send).toEqual({ type: 'state', state: before })
  })

  it('ignores a move after the game is over and re-sends the state', () => {
    // X: 0 1 2 — O: 3 4
    let over = start
    for (const [mark, cell] of [['X', 0], ['O', 3], ['X', 1], ['O', 4], ['X', 2]] as const) {
      over = applyMove(over, mark, cell)!
    }
    const { state, send } = handleGuestMessage(over, { type: 'move', cell: 5 })
    expect(state).toBe(over)
    expect(send).toEqual({ type: 'state', state: over })
  })

  it.each([{ type: 'ping' }, { type: 'state', state: start }, { type: 'room-full' }] as const)(
    'leaves the state alone and sends nothing for $type',
    (msg) => {
      expect(handleGuestMessage(start, msg)).toEqual({ state: start, send: null })
    },
  )
})

describe('handleGuestMessage rematch', () => {
  it('is ignored before the game is over', () => {
    const midGame = play(start, [4, 0])
    expect(handleGuestMessage(start, { type: 'rematch' })).toEqual({ state: start, send: null })
    expect(handleGuestMessage(midGame, { type: 'rematch' })).toEqual({ state: midGame, send: null })
  })

  it('after game over, resets the board and sends the new state', () => {
    const won = play(start, [0, 3, 1, 4, 2]) // X wins on the top row
    const { state, send } = handleGuestMessage(won, { type: 'rematch' })
    expect(state).toEqual(newGame(start.players, 'O'))
    expect(send).toEqual({ type: 'state', state })
  })

  it('alternates the first mover across several rematches', () => {
    let state = start
    const firstMovers: string[] = [state.turn]
    for (let game = 0; game < 4; game++) {
      // Whoever starts takes the left column; the other plays the middle column.
      state = play(state, [0, 1, 3, 4, 6])
      expect(isOver(state)).toBe(true)
      state = handleGuestMessage(state, { type: 'rematch' }).state
      expect(state.board.every((c) => c === null)).toBe(true)
      expect(state.turn).toBe(state.firstMover)
      firstMovers.push(state.firstMover)
    }
    expect(firstMovers).toEqual(['X', 'O', 'X', 'O', 'X'])
  })
})
